# IBM Bob Usage Report

**Project:** Bobcat
**Team:** Winnovators
**Hackathon:** IBM Bob Hackathon 2026
**Generated:** Exported from `.bob/` session artifacts + live backend route registry.

This report is the single source of truth for *how IBM Bob is used in this
project*. It enumerates every artifact Bob produced or governs, every live
backend endpoint that routes a user request through IBM Bob, and the prompts
each touchpoint sends to Bob.

---

## 🦾 Highlight: Our own MCP server fronts every Bob call

**Bobcat does not call IBM Bob directly from the browser.** Every Bob
interaction in this report flows through a **custom MCP (Model Context
Protocol) server we wrote ourselves** — [`backend/mcp_service.py`](backend/mcp_service.py)
— which exposes **seven purpose-built skills** and is the only thing in
the system allowed to talk to Bob.

| | |
|---|---|
| **File** | [`backend/mcp_service.py`](backend/mcp_service.py) |
| **Framework** | FastAPI (mounted at `/mcp/*`) |
| **Skills exposed** | `chat-completion`, `generate-endpoint`, `generate-endpoint-preview`, `refactor-function`, `refactor-preview`, `ai-graph`, `score-risk`, `simulate-change` |
| **Mode binding** | The `api-architect` custom mode declares `mcp` in its tool list and points at this server (see Section 1) |
| **Responsibilities** | Brief Bob with a purpose-built prompt per skill, validate Bob's JSON reply against a Pydantic schema, refuse to render anything that fails validation |

Every skill on this server owns its own system prompt, JSON output schema,
and post-validation step. **IBM Bob is the reasoning engine; our MCP server
is the layer that decides *what to ask*, *how to ask it*, and *whether the
reply is safe to render in the UI*.** That is the contribution we are most
proud of and the piece you should read first.

You will see this MCP server cited again in **Section 4** (where each
endpoint and the skill that fronts it is enumerated) and in **Section 5**
(the per-endpoint Bob call map).

---

## 1. Custom Mode

A single custom Bob mode was authored for this project. Bob loads it on
session start and uses it to constrain tool access, set the system prompt,
and gate operations.

| Field | Value |
|---|---|
| **Slug** | `api-architect` |
| **Display name** | 🏗️ Api-Architect |
| **File** | `.bob/custom_modes.yaml` (209 lines) |
| **Author** | IBM Bob Team |
| **Version** | 1.0.0 |

### Mode role (excerpt)

> You are Api-Architect, a specialized backend system engineer with deep expertise
> in REST API design, code generation from natural language, function refactoring,
> and architectural decision-making for scalable systems. You receive requests
> from a visual frontend canvas via MCP (Model Context Protocol) and translate
> them into concrete backend implementations.

### Tool access granted to the mode
- **read** — analyse existing source structure
- **edit** — modify files via targeted diffs or full rewrites
- **command** — execute test / lint / server commands (with the constraint that the purpose must be explained first)
- **mcp** — bridge to the canvas frontend on `127.0.0.1:5000` via `backend/main.py`

### Guardrails baked into the mode
- `allowed_paths`: `backend/**`, `frontend/src/**`, `testing/**`, `.bob/rules-api-architect/**`
- `restricted_paths`: `node_modules`, `dist`, `__pycache__`, `.venv`
- `max_file_size`: 500 KB
- `require_confirmation`: delete operations, bulk changes, external API calls
- **Pre-commit hooks**: `pytest`, `ruff check`
- **Post-generation checks**: `syntax_valid`, `imports_resolvable`

### IBM Bob runtime tuning declared by the mode
- `temperature`: **0.3** — keeps Bob deterministic-leaning so generated code
  doesn't drift between runs of the same prompt
- `max_tokens`: **4000** — large enough for full multi-function endpoints
  with helpers
- `model_preference` is set to a code-tuned IBM Bob profile; the user can
  swap profiles from the canvas top-right at any time

---

## 2. Custom Skills (Rules)

Two skill rule documents live under `.bob/rules-api-architect/`. Bob consults
them whenever it generates or refactors code.

### `01-generation-standards.md`
Mandatory standards for any endpoint or function Bob produces. Highlights:

- **Google-style docstrings** with `Args`, `Returns`, `Raises`, `Example` sections
- **Pydantic models** for every request and response shape
- **HTTPException** for all error paths
- **Type hints** on every parameter and return
- **Input validation** at function entry, never trusting client data

### `02-refactoring-guidelines.md`
Goal-driven refactoring heuristics. Highlights:

- **Performance**: replace O(n²) loops with set/dict operations; cache expensive calls; generators for streams
- **Error handling**: wrap external calls in `try/except`; validate inputs at entry; meaningful messages
- **Readability**: break long functions; extract complex conditionals into helpers; prefer composition
- **Type safety**: add or tighten annotations during every refactor pass
- **Side effects**: avoid hidden state mutation; document any that remain

These two files are loaded by the `api-architect` mode via its `context.rules_directory` setting.

---

## 3. Bob-Written Checkpoint System

Bob authored a `CheckpointManager` class in
[`backend/watsonx_integration.py`](backend/watsonx_integration.py) that
writes a JSON snapshot of every file the MCP server is about to mutate, so
any Bob-driven refactor or generate call is reversible bit-for-bit.

| Field | Value |
|---|---|
| Implementing class | `CheckpointManager` |
| Source file | `backend/watsonx_integration.py` |
| Storage on disk | `.bob/checkpoints/` (relative to wherever the MCP server is launched) |
| Captured per call | `id`, `timestamp`, `file_path`, `operation`, full pre-change `content`, SHA-256 `content_hash`, free-form `metadata` |
| Public API | `create_checkpoint(...)`, `restore_checkpoint(id)`, `list_checkpoints(file_path=None)` |
| Used by | Refactor and generate-endpoint flows in `backend/mcp_service.py` |

The runtime JSON snapshots themselves are intentionally **not committed** to
this repo — they belong to the environment that ran the MCP server, and any
fresh run regenerates them on demand. The artifact that proves Bob's
involvement is the `CheckpointManager` source code itself.

---

## 4. Production Bob Touchpoints (Live Backend Endpoints)

Every route below lives in **our custom MCP server**
([`backend/mcp_service.py`](backend/mcp_service.py)) introduced in the
highlight section. Each route is the public face of one skill; behind that
skill, IBM Bob is invoked through our LangChain integration. Bob is loaded by
the `AutonomousWorkspaceAgent` class in `backend/langchain_agent_service.py`,
instantiated per request and authenticated from environment variables
(`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`).

The MCP server is therefore the **only** thing in the system that ever
talks to Bob — the canvas frontend never holds a watsonx credential and
never composes a Bob prompt on its own.

### Touchpoint #1 — Chat with Bob

| | |
|---|---|
| **Endpoint** | `POST /mcp/chat-completion` |
| **Agent method** | `agent.chat_completion(messages, context)` |
| **UI surface** | The hero CTA "Chat with Bob" in the workspace navbar |
| **Purpose** | Conversational assistant grounded in the loaded codebase |

**System prompt prefix** that gives Bob its identity each turn — a single
sentence framing Bob as a code assistant, followed by context lines
(workspace path, source label, parsed input) and then every prior turn
replayed so Bob keeps memory across the session.

The frontend resolves `workspacePath` at send time from the live URL field
([AIChatbot.jsx](frontend/src/components/AIChatbot.jsx)) so context never goes stale.

---

### Touchpoint #2 — Generate Endpoint

| | |
|---|---|
| **Endpoint** | `POST /mcp/generate-endpoint` |
| **Agent method** | `agent.generate_endpoint_artifacts(target_file, change_request, route_method, route_path)` |
| **UI surface** | "Add Endpoint ▾ → Generate Endpoint" dropdown in the navbar |
| **Purpose** | Bob writes a complete FastAPI route into a target file from a plain-English description |

**Prompt construction** ([langchain_agent_service.py:214–247](backend/langchain_agent_service.py#L214)):
> *"You are generating code for an existing Python API file. Return a structured
> JSON plan that the app can write into the file immediately. Rules: (1) the
> first function must be the FastAPI endpoint handler for the requested route;
> (2) the endpoint handler must include the correct FastAPI decorator…"*

The model returns a structured `EndpointGenerationPlan` Pydantic schema; the
backend writes the new code into the target file and rebuilds the workspace
graph so the canvas reflects the new endpoint in seconds.

---

### Touchpoint #3 — Refactor Function (apply)

| | |
|---|---|
| **Endpoint** | `POST /mcp/refactor-function` |
| **Agent method** | `agent.refactor_function(source_code, function_name, refactor_goal, preserve_signature)` |
| **UI surface** | Original "Refactor" flow (kept for back-compat) |
| **Purpose** | Bob rewrites a named function in a file on disk and saves the result |

---

### Touchpoint #4 — Refactor Preview (PR-style diff)

| | |
|---|---|
| **Endpoint** | `POST /mcp/refactor-preview` |
| **Agent method** | `agent.refactor_function(...)` (same method, no file I/O) |
| **UI surface** | "Refactor" button in the code drawer → inline GitHub-style diff |
| **Purpose** | Pure-LLM preview: Bob proposes a rewrite, frontend renders the diff, user picks Apply or Discard |

This is the version actually wired into the drawer flow. It is preview-only
in GitHub-URL mode (the cloud backend can't write back to user disks) and
Apply-writes-to-disk in local mode.

---

### Touchpoint #5 — AI Graph

| | |
|---|---|
| **Endpoint** | `POST /mcp/ai-graph` |
| **Agent method** | `agent.analyze_graph(code_map)` |
| **UI surface** | Internal — invoked when the user clicks "Ask Bob AI" after a Parse load |
| **Purpose** | Bob produces a semantic dependency graph from a condensed code map (in addition to the AST-derived graph) |

**Prompt** ([langchain_agent_service.py:482–502](backend/langchain_agent_service.py#L482)):
> *"You are a software architect. Analyse the codebase below and output ONLY
> a raw JSON object with `summary`, `nodes`, and `edges` arrays. kind=input →
> HTTP route/endpoint. kind=function → handler/service/util. Add an edge for
> every call, import, or dependency."*

---

### Touchpoint #6 — Score Risk (semantic per-function risk + caption)

| | |
|---|---|
| **Endpoint** | `POST /mcp/score-risk` |
| **Agent method** | `agent.score_risk(nodes_summary, batch_size=18)` |
| **UI surface** | Fires automatically after "Ask Bob AI" loads the graph |
| **Purpose** | Bob walks every function and replaces opaque static risk bars with semantic scores plus a one-line caption like `"signs and broadcasts transactions, no replay guard"` |

**Prompt construction** ([langchain_agent_service.py:540–558](backend/langchain_agent_service.py#L540)):
> *"You are a senior code-risk analyst. Score each function's security and
> stability risk from 0.0 to 1.0 using the FULL range. HIGH (0.70-1.00):
> handles auth, payments, secrets, tokens, writes to persistent storage…"*

Results are batched in groups of 18 functions to keep prompts small; the
batch payload includes `label, file, group, fanIn, fanOut, staticRisk` per
node and the model returns `{i, risk, description}` per scored item.

---

### Touchpoint #7 — Simulate Change (blast-radius prediction)

| | |
|---|---|
| **Endpoint** | `POST /mcp/simulate-change` |
| **Agent method** | `agent.simulate_change(node_label, file_path, description, connected_nodes)` |
| **UI surface** | "Simulate" button in the code drawer → modal → animated wave on the graph |
| **Purpose** | Bob predicts which downstream functions will be affected by a planned change and how badly |

**Prompt structure**:
> *"You are a software impact analyst powered by IBM Bob (watsonx).
> A developer wants to make this change to the function `<name>` in `<file>`:
> `<change description>`. Connected functions that may be affected: `<list>`.
> Analyse the blast radius. Which of the connected functions will be affected,
> and how? What new risk does the change introduce?"*

Returns `{ affectedLabels, explanation, riskDelta }`. The frontend maps labels
back to node ids and animates the impact wave outward in three timed phases.

---

## 5. Per-Endpoint Bob Call Map

Every HTTP route below is a skill on **our custom MCP server**
([`backend/mcp_service.py`](backend/mcp_service.py)); each skill routes the
request through IBM Bob with its own prompt and JSON schema. The "Bob role"
column names the persona Bob plays for that skill.

| HTTP route | Backend file | Agent method called | IBM Bob role |
|---|---|---|---|
| `POST /mcp/chat-completion` | `mcp_service.py:146` | `chat_completion` | Bob as conversational architect |
| `POST /mcp/generate-endpoint` | `mcp_service.py:164` | `generate_endpoint_artifacts` | Bob as code author |
| `POST /mcp/refactor-function` | `mcp_service.py:246` | `refactor_function` | Bob as refactor agent (saves to disk) |
| `POST /mcp/refactor-preview` | `mcp_service.py:297` | `refactor_function` (no file I/O) | Bob as refactor agent (diff only) |
| `POST /mcp/ai-graph` | `mcp_service.py:342` | `analyze_graph` | Bob as architecture analyst |
| `POST /mcp/score-risk` | `mcp_service.py:472` | `score_risk` | Bob as risk analyst |
| `POST /mcp/simulate-change` | `mcp_service.py:501` | `simulate_change` | Bob as impact predictor |

A model-profile picker in the canvas top-right lets the user fine-tune which
IBM Bob configuration handles a given request — useful when comparing how
Bob behaves on different codebases or framework styles.

---

## 6. Bob Asset Inventory

```
backend/
└── mcp_service.py             # CUSTOM MCP SERVER (the one fronting every Bob call)

.bob/
├── custom_modes.yaml          # Api-Architect custom mode (209 lines)
└── rules-api-architect/
    ├── 01-generation-standards.md     # Bob skill: code generation rules
    └── 02-refactoring-guidelines.md   # Bob skill: refactor heuristics

# Checkpoint JSONs land in .bob/checkpoints/ at runtime; gitignored.
```

---

## 7. Summary

- **1** custom MCP server we wrote ourselves (`backend/mcp_service.py`) —
  the only thing in the system that talks to IBM Bob
- **1** custom Bob mode (`api-architect`) bound to that MCP server
- **2** custom Bob skills (generation standards, refactoring guidelines)
- **1** Bob-authored checkpoint system (`CheckpointManager` in `backend/watsonx_integration.py`) that writes a reversible JSON snapshot before every Bob-driven mutation
- **7** skills on our MCP server, each routing user requests through IBM Bob
- **4** distinct user-facing Bob touchpoints in the UI:
  1. Chat with Bob (Touchpoint #1)
  2. Ask Bob AI = AI Graph + Score Risk (Touchpoints #5 + #6)
  3. Refactor with Bob = Refactor Preview + Apply (Touchpoints #3 + #4)
  4. Generate Endpoint (Touchpoint #2)
  5. Simulate Change (Touchpoint #7)

Every Bob call is logged in the backend stdout (FastAPI + uvicorn access log)
and any Bob-driven file mutation creates a `.bob/checkpoints/` JSON so it can
be reverted.

*Built with IBM Bob.*
