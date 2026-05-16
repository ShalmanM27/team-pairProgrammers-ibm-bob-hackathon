import ast
import builtins
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="IBM Bob API Architect Canvas Bridge")

# Allow local frontend apps to call this bridge server from any origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TESTING_WORKSPACE_PATH = PROJECT_ROOT / "testing"
HTTP_DECORATORS = {"get", "post", "put", "delete", "patch"}

# Global workspace pointer updated by /api/set-workspace.
CURRENT_WORKSPACE_PATH: str = ""
CURRENT_MAIN_FILE_PATH: str = ""


class WorkspacePayload(BaseModel):
    path: str


class EndpointPayload(BaseModel):
    path: str
    method: str
    description: str


class MainFilePayload(BaseModel):
    path: str


def _safe_relative(file_path: Path, root: Path) -> str:
    try:
        return str(file_path.relative_to(root)).replace("\\", "/")
    except ValueError:
        return str(file_path).replace("\\", "/")


def _string_literal(node: ast.AST, default: str) -> str:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return default


def _extract_route_bindings(decorator: ast.AST) -> List[Tuple[str, str]]:
    if not isinstance(decorator, ast.Call):
        return []
    if not isinstance(decorator.func, ast.Attribute):
        return []

    attr_name = decorator.func.attr.lower()
    route_path = _string_literal(decorator.args[0], "/") if decorator.args else "/"

    if attr_name in HTTP_DECORATORS:
        return [(attr_name.upper(), route_path)]

    if attr_name == "api_route":
        methods: List[str] = []
        for keyword in decorator.keywords:
            if keyword.arg == "methods" and isinstance(keyword.value, (ast.List, ast.Tuple)):
                for method_node in keyword.value.elts:
                    methods.append(_string_literal(method_node, "").upper())
        methods = [method for method in methods if method]
        if not methods:
            methods = ["GET"]
        return [(method, route_path) for method in methods]

    return []


def _extract_source_segment(source_lines: List[str], node: ast.AST) -> str:
    if not hasattr(node, "lineno") or not hasattr(node, "end_lineno"):
        return ""
    start = max(getattr(node, "lineno", 1) - 1, 0)
    end = max(getattr(node, "end_lineno", start + 1), start + 1)
    return "\n".join(source_lines[start:end]).rstrip()


def _extract_called_names(function_node: ast.AST) -> List[str]:
    class OrderedCallCollector(ast.NodeVisitor):
        def __init__(self) -> None:
            self.called_names: List[str] = []
            self.seen: Set[str] = set()

        def visit_Call(self, node: ast.Call) -> Any:
            call_name = ""
            if isinstance(node.func, ast.Name):
                call_name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                call_name = node.func.attr

            if call_name and call_name not in self.seen:
                self.seen.add(call_name)
                self.called_names.append(call_name)

            self.generic_visit(node)

    collector = OrderedCallCollector()
    collector.visit(function_node)
    return collector.called_names


def _build_call_tree(
    endpoint_id: str,
    root_function_name: str,
    function_calls: Dict[str, List[str]],
) -> Dict[str, Any]:
    def walk(function_name: str, path_tokens: List[str], recursion_stack: Set[str]) -> Dict[str, Any]:
        path_key = "root" if not path_tokens else ".".join(path_tokens)
        node = {
            "id": f"{endpoint_id}::fn::{path_key}::{function_name}",
            "name": function_name,
            "children": [],
        }

        for child_index, called_name in enumerate(function_calls.get(function_name, [])):
            if called_name in recursion_stack:
                continue
            child_tokens = [*path_tokens, str(child_index)]
            child_node = walk(called_name, child_tokens, recursion_stack | {called_name})
            node["children"].append(child_node)

        return node

    return walk(root_function_name, [], {root_function_name})


def _tree_leaf_count(tree_node: Dict[str, Any]) -> int:
    children = tree_node["children"]
    if not children:
        return 1
    return sum(_tree_leaf_count(child) for child in children)


def _tree_max_depth(tree_node: Dict[str, Any]) -> int:
    children = tree_node["children"]
    if not children:
        return 0
    return 1 + max(_tree_max_depth(child) for child in children)


def _assign_tree_positions(
    tree_node: Dict[str, Any],
    depth: int,
    start_x: float,
    step_x: float,
    row_gap_y: float,
    cursor_y: float,
    positions: Dict[str, Dict[str, float]],
) -> float:
    children = tree_node["children"]
    node_id = tree_node["id"]

    if not children:
        positions[node_id] = {"x": start_x + depth * step_x, "y": cursor_y}
        return cursor_y + row_gap_y

    next_cursor = cursor_y
    child_ys: List[float] = []
    for child in children:
        next_cursor = _assign_tree_positions(
            tree_node=child,
            depth=depth + 1,
            start_x=start_x,
            step_x=step_x,
            row_gap_y=row_gap_y,
            cursor_y=next_cursor,
            positions=positions,
        )
        child_ys.append(positions[child["id"]]["y"])

    positions[node_id] = {
        "x": start_x + depth * step_x,
        "y": sum(child_ys) / len(child_ys),
    }
    return next_cursor


def _build_workspace_graph(workspace_path: str, main_file_path: str | None = None) -> Dict[str, Any]:
    if main_file_path:
        main_file = Path(main_file_path).resolve()
        if not main_file.exists():
            raise HTTPException(status_code=400, detail="Main Python file path does not exist!")
        if not main_file.is_file():
            raise HTTPException(status_code=400, detail="Provided path is not a file!")
        if main_file.suffix.lower() != ".py":
            raise HTTPException(status_code=400, detail="Provided file must be a Python (.py) file!")

        workspace_root = main_file.parent
        python_files = [main_file]
    else:
        workspace_root = Path(workspace_path).resolve()
        if not workspace_root.exists():
            raise HTTPException(status_code=400, detail="Local directory path does not exist!")

        python_files = sorted(
            file_path
            for file_path in workspace_root.rglob("*.py")
            if not any(part in {".venv", "__pycache__", "node_modules", ".bob"} for part in file_path.parts)
        )

    if not python_files:
        raise HTTPException(status_code=404, detail="No Python files found in workspace.")

    builtin_names: Set[str] = set(dir(builtins))
    functions: Dict[str, Dict[str, Any]] = {}
    endpoints: List[Dict[str, Any]] = []

    for file_path in python_files:
        source = file_path.read_text(encoding="utf-8")
        source_lines = source.splitlines()
        tree = ast.parse(source, filename=str(file_path))

        function_nodes = [
            node
            for node in tree.body
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        ]

        for node in function_nodes:
            functions[node.name] = {
                "file": _safe_relative(file_path, workspace_root),
                "code": _extract_source_segment(source_lines, node),
                "direct_calls": _extract_called_names(node),
            }

        for node in function_nodes:
            route_bindings: List[Tuple[str, str]] = []
            for decorator in node.decorator_list:
                route_bindings.extend(_extract_route_bindings(decorator))
            if not route_bindings:
                continue

            for method, route_path in route_bindings:
                endpoints.append(
                    {
                        "id": f"endpoint::{node.name}::{method}::{route_path}",
                        "function_name": node.name,
                        "method": method,
                        "route_path": route_path,
                        "file": _safe_relative(file_path, workspace_root),
                        "code": _extract_source_segment(source_lines, node),
                    }
                )

    if not endpoints:
        if main_file_path:
            raise HTTPException(status_code=404, detail="No REST endpoints found in provided main file.")
        raise HTTPException(status_code=404, detail="No REST endpoints found in workspace.")

    function_calls: Dict[str, List[str]] = {}
    for function_name, function_meta in functions.items():
        filtered_calls: List[str] = []
        seen_calls: Set[str] = set()
        for called_name in function_meta["direct_calls"]:
            if called_name in builtin_names:
                continue
            if called_name not in functions:
                continue
            if called_name in seen_calls:
                continue
            seen_calls.add(called_name)
            filtered_calls.append(called_name)
        function_calls[function_name] = filtered_calls

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

    start_x = 70
    step_x = 260
    row_gap_y = 110
    endpoint_gap_y = 150
    top_cursor_y = 90.0

    for endpoint in endpoints:
        call_tree = _build_call_tree(
            endpoint_id=endpoint["id"],
            root_function_name=endpoint["function_name"],
            function_calls=function_calls,
        )
        positions: Dict[str, Dict[str, float]] = {}
        _assign_tree_positions(
            tree_node=call_tree,
            depth=1,
            start_x=start_x,
            step_x=step_x,
            row_gap_y=row_gap_y,
            cursor_y=top_cursor_y,
            positions=positions,
        )

        root_node_id = call_tree["id"]
        root_position = positions[root_node_id]
        input_node_id = f'{endpoint["id"]}::input'
        output_node_id = f'{endpoint["id"]}::output'

        nodes.append(
            {
                "id": input_node_id,
                "type": "input",
                "position": {"x": start_x, "y": root_position["y"]},
                "data": {
                    "label": f'{endpoint["method"]} {endpoint["route_path"]}\nInput',
                    "kind": "input",
                    "title": f'{endpoint["method"]} {endpoint["route_path"]}',
                    "file": endpoint["file"],
                    "code": endpoint["code"] or "# Endpoint handler source not found.",
                },
                "style": {
                    "background": "#1f2433",
                    "color": "#f4f4f4",
                    "border": "1px solid #0f62fe",
                    "borderRadius": 10,
                    "padding": 10,
                    "width": 240,
                },
            }
        )

        def append_tree_nodes(tree_node: Dict[str, Any]) -> None:
            fn_name = tree_node["name"]
            fn_node_id = tree_node["id"]
            fn_meta = functions.get(fn_name, {})
            node_position = positions[fn_node_id]

            nodes.append(
                {
                    "id": fn_node_id,
                    "type": "default",
                    "position": {"x": node_position["x"], "y": node_position["y"]},
                    "data": {
                        "label": fn_name,
                        "kind": "function",
                        "title": fn_name,
                        "file": fn_meta.get("file", endpoint["file"]),
                        "code": fn_meta.get("code") or "# Function source not found.",
                    },
                    "style": {
                        "background": "#20202f",
                        "color": "#f4f4f4",
                        "border": "1px solid #39394c",
                        "borderRadius": 10,
                        "padding": 10,
                        "width": 240,
                    },
                }
            )

            for child_node in tree_node["children"]:
                child_id = child_node["id"]
                edges.append(
                    {
                        "id": f"{fn_node_id}->{child_id}",
                        "source": fn_node_id,
                        "target": child_id,
                        "animated": True,
                        "style": {"stroke": "#0f62fe"},
                    }
                )
                append_tree_nodes(child_node)

        append_tree_nodes(call_tree)

        edges.append(
            {
                "id": f"{input_node_id}->{root_node_id}",
                "source": input_node_id,
                "target": root_node_id,
                "animated": True,
                "style": {"stroke": "#0f62fe"},
            }
        )

        max_depth = _tree_max_depth(call_tree)
        output_x = start_x + (max_depth + 2) * step_x
        output_y = root_position["y"]

        nodes.append(
            {
                "id": output_node_id,
                "type": "output",
                "position": {"x": output_x, "y": output_y},
                "data": {
                    "label": "Output",
                    "kind": "output",
                    "title": "Output",
                    "file": endpoint["file"],
                    "code": "# Output node for response flow.",
                },
                "style": {
                    "background": "#1f2433",
                    "color": "#f4f4f4",
                    "border": "1px solid #0f62fe",
                    "borderRadius": 10,
                    "padding": 10,
                    "width": 220,
                },
            }
        )

        edges.append(
            {
                "id": f"{root_node_id}->{output_node_id}",
                "source": root_node_id,
                "target": output_node_id,
                "animated": True,
                "style": {"stroke": "#0f62fe"},
            }
        )

        leaf_count = _tree_leaf_count(call_tree)
        tree_visual_height = max(1, leaf_count - 1) * row_gap_y
        top_cursor_y += tree_visual_height + endpoint_gap_y

    return {
        "workspace_path": str(workspace_root),
        "source_files": [_safe_relative(path, workspace_root) for path in python_files],
        "nodes": nodes,
        "edges": edges,
    }


@app.get("/api/testing-workspace")
async def get_testing_workspace() -> Dict[str, str]:
    if not TESTING_WORKSPACE_PATH.exists():
        raise HTTPException(status_code=404, detail="Testing workspace not found.")
    return {"path": str(TESTING_WORKSPACE_PATH.resolve())}


@app.post("/api/set-workspace")
async def set_workspace(payload: WorkspacePayload) -> Dict[str, Any]:
    global CURRENT_WORKSPACE_PATH, CURRENT_MAIN_FILE_PATH

    workspace_path = payload.path.strip()
    try:
        if not os.path.exists(workspace_path):
            raise HTTPException(
                status_code=400,
                detail="Local directory path does not exist!",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate workspace path: {exc}",
        ) from exc

    CURRENT_WORKSPACE_PATH = workspace_path
    CURRENT_MAIN_FILE_PATH = ""
    return {
        "status": "success",
        "message": "Workspace path connected successfully.",
        "workspace_path": CURRENT_WORKSPACE_PATH,
    }


@app.post("/api/load-main-file")
async def load_main_file(payload: MainFilePayload) -> Dict[str, Any]:
    global CURRENT_WORKSPACE_PATH, CURRENT_MAIN_FILE_PATH

    main_file_path = payload.path.strip()
    main_file = Path(main_file_path).resolve()

    if not main_file.exists():
        raise HTTPException(status_code=400, detail="Main Python file path does not exist!")
    if not main_file.is_file():
        raise HTTPException(status_code=400, detail="Provided path is not a file!")
    if main_file.suffix.lower() != ".py":
        raise HTTPException(status_code=400, detail="Provided file must be a Python (.py) file!")

    CURRENT_MAIN_FILE_PATH = str(main_file)
    CURRENT_WORKSPACE_PATH = str(main_file.parent)
    graph_payload = _build_workspace_graph(
        workspace_path=CURRENT_WORKSPACE_PATH,
        main_file_path=CURRENT_MAIN_FILE_PATH,
    )

    return {
        "status": "success",
        "message": "Main Python file loaded successfully.",
        "main_file_path": CURRENT_MAIN_FILE_PATH,
        "workspace_path": CURRENT_WORKSPACE_PATH,
        **graph_payload,
    }


@app.get("/api/workspace-graph")
async def workspace_graph() -> Dict[str, Any]:
    if CURRENT_MAIN_FILE_PATH:
        return _build_workspace_graph(
            workspace_path=CURRENT_WORKSPACE_PATH,
            main_file_path=CURRENT_MAIN_FILE_PATH,
        )

    if not CURRENT_WORKSPACE_PATH:
        raise HTTPException(
            status_code=400,
            detail="A workspace path must be connected first.",
        )
    return _build_workspace_graph(CURRENT_WORKSPACE_PATH)


@app.post("/api/endpoint")
async def drop_endpoint_intent(payload: EndpointPayload) -> Dict[str, Any]:
    if not CURRENT_WORKSPACE_PATH:
        raise HTTPException(
            status_code=400,
            detail="A workspace path must be connected first.",
        )

    bob_dir = os.path.join(CURRENT_WORKSPACE_PATH, ".bob")
    intent_file_path = os.path.join(bob_dir, "mcp_intent.json")

    intent_payload = {
        "task": "Add a new REST API endpoint node",
        "method": payload.method,
        "route_path": payload.path,
        "logic_intent": payload.description,
        "rule_reference": "Follow rules in .bob/rules-api-architect/01-generation-standards.md",
    }

    # Ensure the target folder exists, then overwrite the intent payload file.
    try:
        os.makedirs(bob_dir, exist_ok=True)
        with open(intent_file_path, "w", encoding="utf-8") as intent_file:
            intent_file.write(json.dumps(intent_payload, indent=4))
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write IBM Bob intent file: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected filesystem error: {exc}",
        ) from exc

    return {
        "status": "success",
        "message": "Intent payload dropped into workspace for IBM Bob.",
        "intent_file": intent_file_path,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000, reload=False)
