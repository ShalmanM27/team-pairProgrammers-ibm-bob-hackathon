"""
Autonomous LangChain workspace agent powered by IBM watsonx (ChatWatsonx).

This script accepts:
1) a target file path inside a workspace, and
2) an architectural change request,
then autonomously reads, plans, and writes code updates using tool calling.

Usage example:
    python backend/langchain_agent_service.py ^
        --workspace-root . ^
        --target-file testing/sampleapi.py ^
        --change-request "Add a POST /analytics route, create its subfile controller, and export it correctly."

Required environment variables (or CLI flags):
    WATSONX_API_KEY (or deprecated WATSONX_APIKEY)
    WATSONX_PROJECT_ID
    WATSONX_URL (optional, defaults to https://us-south.ml.cloud.ibm.com)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool, tool
from langchain_ibm import ChatWatsonx


DEFAULT_MODEL_ID = "ibm/granite-8b-code-instruct"
DEFAULT_WATSONX_URL = "https://us-south.ml.cloud.ibm.com"
DEFAULT_MAX_ITERATIONS = 24

IGNORED_LISTING_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
    "dist",
    "build",
}


@dataclass
class WorkspaceWrite:
    """Tracks one write operation applied by the agent."""

    relative_path: str
    bytes_written: int
    sha256: str
    timestamp_utc: str


@dataclass
class WorkspaceContext:
    """Runtime filesystem context shared by tools."""

    workspace_root: Path
    writes: List[WorkspaceWrite] = field(default_factory=list)
    max_list_entries: int = 2000
    max_list_depth: int = 6

    def resolve_path(
        self,
        user_path: str,
        *,
        must_exist: bool = False,
        expect_dir: bool = False,
    ) -> Path:
        """Resolve a user-supplied path safely inside workspace_root."""
        if not user_path or not user_path.strip():
            raise ValueError("Path cannot be empty.")

        raw = user_path.strip().strip('"').strip("'")
        candidate = Path(raw)

        if candidate.is_absolute():
            resolved = candidate.resolve()
        else:
            normalized = raw.lstrip("/\\")
            resolved = (self.workspace_root / normalized).resolve()

        root_resolved = self.workspace_root.resolve()
        try:
            resolved.relative_to(root_resolved)
        except ValueError as exc:
            raise ValueError(
                f"Path '{user_path}' escapes workspace root '{root_resolved}'."
            ) from exc

        if must_exist and not resolved.exists():
            raise FileNotFoundError(f"Path does not exist: {resolved}")

        if expect_dir and resolved.exists() and not resolved.is_dir():
            raise NotADirectoryError(f"Expected a directory path: {resolved}")

        return resolved


def _timestamp_utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _coerce_message_content(content: Any) -> str:
    """Best-effort normalization for AI message content to plain text."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text_part = item.get("text")
                if isinstance(text_part, str):
                    parts.append(text_part)
                else:
                    parts.append(json.dumps(item, ensure_ascii=False))
            else:
                parts.append(str(item))
        return "\n".join(parts).strip()
    return str(content)


def _build_tools(context: WorkspaceContext) -> List[BaseTool]:
    """Create tool instances bound to the runtime workspace context."""

    @tool
    def read_workspace_file(file_path: str) -> str:
        """
        Safely read and return UTF-8 text content for a workspace file.

        Args:
            file_path: Relative or absolute path (must remain inside workspace root).
        """

        try:
            resolved = context.resolve_path(file_path, must_exist=True, expect_dir=False)
            if resolved.is_dir():
                return f"ERROR: '{file_path}' points to a directory, not a file."
            return resolved.read_text(encoding="utf-8")
        except Exception as exc:  # noqa: BLE001
            return f"ERROR: read_workspace_file failed for '{file_path}': {exc}"

    @tool
    def write_workspace_file(file_path: str, content: str) -> str:
        """
        Create/update a workspace file with provided UTF-8 text content.

        Parent directories are created automatically when missing.

        Args:
            file_path: Relative or absolute path (must remain inside workspace root).
            content: Full file content that will be written.
        """

        try:
            resolved = context.resolve_path(file_path, must_exist=False, expect_dir=False)
            resolved.parent.mkdir(parents=True, exist_ok=True)
            resolved.write_text(content, encoding="utf-8")

            data = content.encode("utf-8")
            rel = resolved.relative_to(context.workspace_root.resolve()).as_posix()
            context.writes.append(
                WorkspaceWrite(
                    relative_path=rel,
                    bytes_written=len(data),
                    sha256=hashlib.sha256(data).hexdigest(),
                    timestamp_utc=_timestamp_utc(),
                )
            )
            return f"OK: wrote '{rel}' ({len(data)} bytes)."
        except Exception as exc:  # noqa: BLE001
            return f"ERROR: write_workspace_file failed for '{file_path}': {exc}"

    @tool
    def list_directory_structure(dir_path: str) -> list:
        """
        List directory/file structure under a workspace directory.

        Returns relative paths from workspace root. Directories end with '/'.

        Args:
            dir_path: Relative or absolute directory path inside workspace.
        """

        try:
            resolved = context.resolve_path(dir_path, must_exist=True, expect_dir=True)
            root = context.workspace_root.resolve()

            entries: List[str] = []
            walk_root = resolved.resolve()

            for current_root, dirs, files in os.walk(walk_root):
                current_path = Path(current_root).resolve()
                rel_from_start = current_path.relative_to(walk_root)
                depth = len(rel_from_start.parts)

                dirs[:] = sorted(
                    d
                    for d in dirs
                    if d not in IGNORED_LISTING_DIRS and not d.startswith(".")
                )
                files = sorted(f for f in files if not f.startswith("."))

                if depth > context.max_list_depth:
                    dirs[:] = []
                    continue

                rel_current_from_workspace = current_path.relative_to(root)
                for d in dirs:
                    entries.append(f"{(rel_current_from_workspace / d).as_posix()}/")
                for f in files:
                    entries.append((rel_current_from_workspace / f).as_posix())

                if len(entries) >= context.max_list_entries:
                    return entries[: context.max_list_entries]

            return entries
        except Exception as exc:  # noqa: BLE001
            return [f"ERROR: list_directory_structure failed for '{dir_path}': {exc}"]

    return [read_workspace_file, write_workspace_file, list_directory_structure]


class AutonomousWorkspaceAgent:
    """Tool-calling LangChain agent loop for codebase modifications."""

    def __init__(
        self,
        *,
        workspace_root: Path,
        model_id: str,
        watsonx_url: str,
        watsonx_project_id: str,
        watsonx_api_key: str,
        max_iterations: int = DEFAULT_MAX_ITERATIONS,
        verbose: bool = False,
    ) -> None:
        self.context = WorkspaceContext(workspace_root=workspace_root.resolve())
        self.max_iterations = max_iterations
        self.verbose = verbose

        self.tools = _build_tools(self.context)
        self.tool_map = {tool.name: tool for tool in self.tools}

        params = {
            "decoding_method": "greedy",
            "temperature": 0.0,
            "max_tokens": 2048,
        }

        # Support both current and deprecated constructor field names.
        try:
            self.model = ChatWatsonx(
                model_id=model_id,
                url=watsonx_url,
                project_id=watsonx_project_id,
                api_key=watsonx_api_key,
                params=params,
            )
        except TypeError:
            self.model = ChatWatsonx(
                model_id=model_id,
                url=watsonx_url,
                project_id=watsonx_project_id,
                apikey=watsonx_api_key,
                params=params,
            )

        self.model_with_tools = self.model.bind_tools(self.tools)

    def _invoke_tool_call(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        tool_obj = self.tool_map.get(tool_name)
        if tool_obj is None:
            return f"ERROR: unknown tool '{tool_name}'. Available tools: {list(self.tool_map)}"
        try:
            return tool_obj.invoke(tool_args)
        except Exception as exc:  # noqa: BLE001
            return f"ERROR: tool '{tool_name}' execution failed: {exc}"

    def run(self, *, target_file: str, change_request: str) -> Dict[str, Any]:
        """Execute multi-step tool-calling loop and return final summary."""
        self.context.writes.clear()

        system_prompt = (
            "You are a senior autonomous software modification agent. "
            "You must edit a local Python workspace using tools only.\n\n"
            "Execution rules:\n"
            "1) Start by calling read_workspace_file on the provided target file.\n"
            "2) Discover related modules with list_directory_structure and additional reads.\n"
            "3) Plan exact changes before writing.\n"
            "4) Use write_workspace_file with full final file contents.\n"
            "5) Keep edits minimal and production-safe.\n"
            "6) When done, return a concise summary including modified files and reasoning.\n"
            "7) Never fabricate file contents; always read first unless creating new file intentionally.\n"
            "8) If the request specifies a strict response schema (for example JSON), "
            "return exactly that schema in plain text without markdown fences."
        )

        human_prompt = (
            f"Workspace root: {self.context.workspace_root.as_posix()}\n"
            f"Target file: {target_file}\n"
            f"Architectural request: {change_request}\n\n"
            "Execute the changes now."
        )

        messages: List[Any] = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt),
        ]

        final_response_text = ""
        iterations_used = 0

        for iteration in range(1, self.max_iterations + 1):
            iterations_used = iteration
            ai_msg = self.model_with_tools.invoke(messages)
            if not isinstance(ai_msg, AIMessage):
                raise RuntimeError(f"Unexpected model output type: {type(ai_msg)}")

            messages.append(ai_msg)

            if self.verbose:
                print(f"\n[iteration {iteration}] model response received")
                if ai_msg.tool_calls:
                    print(f"tool calls: {len(ai_msg.tool_calls)}")

            invalid_calls = getattr(ai_msg, "invalid_tool_calls", []) or []
            if invalid_calls:
                messages.append(
                    HumanMessage(
                        content=(
                            "Your previous tool call had invalid JSON arguments. "
                            "Please re-issue valid tool calls."
                        )
                    )
                )
                continue

            tool_calls = ai_msg.tool_calls or []
            if not tool_calls:
                final_response_text = _coerce_message_content(ai_msg.content)
                break

            for call in tool_calls:
                tool_name = call.get("name", "")
                tool_args = call.get("args", {}) or {}
                tool_call_id = call.get("id")

                tool_result = self._invoke_tool_call(tool_name, tool_args)
                if isinstance(tool_result, (dict, list)):
                    tool_content = json.dumps(tool_result, ensure_ascii=False, indent=2)
                else:
                    tool_content = str(tool_result)

                messages.append(
                    ToolMessage(
                        content=tool_content,
                        tool_call_id=tool_call_id,
                        name=tool_name,
                    )
                )

                if self.verbose:
                    preview = tool_content[:160].replace("\n", " ")
                    print(f"  -> tool {tool_name}({tool_args}) => {preview}")

        if not final_response_text:
            final_response_text = (
                "Agent reached max iterations before producing a final text response."
            )

        return {
            "target_file": target_file,
            "change_request": change_request,
            "iterations_used": iterations_used,
            "max_iterations": self.max_iterations,
            "model_id": getattr(self.model, "model_id", None) or "unknown",
            "final_response": final_response_text,
            "modified_files": [
                {
                    "path": w.relative_path,
                    "bytes_written": w.bytes_written,
                    "sha256": w.sha256,
                    "timestamp_utc": w.timestamp_utc,
                }
                for w in self.context.writes
            ],
            "modified_file_count": len(self.context.writes),
        }


def _require_value(value: Optional[str], name: str) -> str:
    if value and value.strip():
        return value.strip()
    raise RuntimeError(f"Missing required configuration: {name}")


def _load_runtime_config(args: argparse.Namespace) -> Dict[str, str]:
    """Load watsonx runtime configuration from CLI args and environment."""
    load_dotenv(Path(__file__).with_name(".env"))
    load_dotenv(Path.cwd() / ".env")

    api_key = (
        args.watsonx_api_key
        or os.getenv("WATSONX_API_KEY")
        or os.getenv("WATSONX_APIKEY")
    )
    project_id = args.watsonx_project_id or os.getenv("WATSONX_PROJECT_ID")
    url = args.watsonx_url or os.getenv("WATSONX_URL") or DEFAULT_WATSONX_URL

    return {
        "watsonx_api_key": _require_value(api_key, "WATSONX_API_KEY"),
        "watsonx_project_id": _require_value(project_id, "WATSONX_PROJECT_ID"),
        "watsonx_url": url.strip(),
    }


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Autonomous LangChain code-modification agent using ChatWatsonx."
    )
    parser.add_argument(
        "--workspace-root",
        default=".",
        help="Workspace root path where reads/writes are allowed (default: current directory).",
    )
    parser.add_argument(
        "--target-file",
        required=True,
        help="Primary file path to inspect first (e.g., testing/sampleapi.py).",
    )
    parser.add_argument(
        "--change-request",
        required=True,
        help="Architectural change request text.",
    )
    parser.add_argument(
        "--model-id",
        default=DEFAULT_MODEL_ID,
        help=f"watsonx model ID (default: {DEFAULT_MODEL_ID}).",
    )
    parser.add_argument("--watsonx-url", default=None, help="watsonx service URL.")
    parser.add_argument("--watsonx-project-id", default=None, help="watsonx project ID.")
    parser.add_argument("--watsonx-api-key", default=None, help="watsonx API key.")
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=DEFAULT_MAX_ITERATIONS,
        help=f"Maximum agent iterations (default: {DEFAULT_MAX_ITERATIONS}).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-iteration tool activity.",
    )
    return parser


def main() -> None:
    parser = build_arg_parser()
    args = parser.parse_args()

    config = _load_runtime_config(args)
    workspace_root = Path(args.workspace_root).resolve()
    if not workspace_root.exists() or not workspace_root.is_dir():
        raise RuntimeError(f"Workspace root is invalid: {workspace_root}")

    agent = AutonomousWorkspaceAgent(
        workspace_root=workspace_root,
        model_id=args.model_id,
        watsonx_url=config["watsonx_url"],
        watsonx_project_id=config["watsonx_project_id"],
        watsonx_api_key=config["watsonx_api_key"],
        max_iterations=max(1, args.max_iterations),
        verbose=args.verbose,
    )

    result = agent.run(
        target_file=args.target_file,
        change_request=args.change_request,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
