# Pi Web Runtime Contract

Current runtime behavior of `@agegr/pi-web` — documented as of version 0.8.0 before modernization phases.

## Overview

Pi Web is a Next.js 16 + React 19 web UI that wraps the Pi SDK (`@earendil-works/pi-coding-agent` v0.81.1) in-process. Each browser tab connects to one `AgentSessionWrapper` via HTTP REST + SSE, using the same Pi SDK as the `pi` CLI.

Architecture diagram:

```
Browser                Next.js Server              AgentSession (in-process)
  │                        │                               │
  ├─ GET /api/sessions ────▶ reads ~/.pi/agent/sessions/   │
  ├─ GET /api/sessions/[id] reads .jsonl file directly     │
  ├─ GET /api/agent/running/events ───▶ running id SSE     │
  │                        │                               │
  ├─ send message ─────────▶ POST /api/agent/[id]          │
  │                        │   startRpcSession() ─────────▶│ createAgentSession()
  │                        │   session.send(cmd) ─────────▶│ session.prompt()
  │                        │                               │
  ├─ SSE connect ──────────▶ GET /api/agent/[id]/events    │
  │                        │   session.onEvent() ◀─────────│ session.subscribe()
  │◀── data: {...} ─────────│                               │
```

## Session Lifecycle

### Session List

`GET /api/sessions` returns all sessions from `~/.pi/agent/sessions/` via `SessionManager.listAll()`. Sessions are grouped by project root (resolved via git worktree detection). Cached for 30 seconds, invalidated on agent_end/fork/delete/mutation.

### Session Read

`GET /api/sessions/[id]` opens the `.jsonl` file via `SessionManager.open()`, builds context via `buildSessionContext()`, and returns the projected navigation tree plus messages. Supports `?leafId=` for in-session branch navigation and `?deferThinking`/`?deferMedia` for performance.

### Session Creation

`POST /api/agent/new` with `{ cwd, message?, provider?, modelId?, toolNames?, thinkingLevel? }` creates a new session via `startRpcSession()`. Returns `{ sessionId, data }` with the Pi SDK's real session id (not the request id).

### Session Commands

`POST /api/agent/[id]` accepts `{ type, ... }` commands. Supported commands:

| Command | Behavior |
|---------|----------|
| `prompt` | Fire-and-forget; events emitted via SSE. Respects `streamingBehavior: "steer" \| "followUp"` |
| `abort` | Aborts current prompt run |
| `get_state` | Returns session state: streaming, compacting, bash, model, context usage, thinking level, extension statuses/widgets, queued steer/follow-up |
| `set_model` | Reloads model config if needed, calls `session.setModel()` |
| `set_thinking_level` | Sets thinking level; applies DeepSeek compat fix for xhigh |
| `fork` | Creates new session from entry point. Destroys current wrapper to avoid stale state |
| `navigate_tree` | In-session branch navigation via `session.navigateTree()` |
| `compact` | Manual compaction via `session.compact(customInstructions?)` |
| `abort_compaction` | Aborts in-progress compaction |
| `set_auto_compaction` | Toggles auto-compaction |
| `set_auto_retry` | Toggles auto-retry |
| `set_session_name` | Sets session display name |
| `get_session_stats` | Returns token counts, cost, session name |
| `get_last_assistant_text` | Returns last assistant message text |
| `get_tools` | Returns all tools with active state |
| `get_commands` | Returns slash commands from extensions, prompts, skills |
| `set_tools` | Sets active tools; empty array disables all tools and clears system prompt |
| `steer` | Queues steering message |
| `follow_up` | Queues follow-up message |
| `clear_queue` | Clears steering/follow-up queues |
| `reload` | Reloads session resources and extensions |
| `extension_ui_response` | Routes extension UI response to pending request |
| `extension_ui_input` | Routes keyboard input to active custom UI |
| `bash` | Runs shell command in session context |
| `abort_bash` | Aborts running bash command |

### SSE Stream

`GET /api/agent/[id]/events` opens persistent SSE connection. Emits all agent events: `agent_start`, `agent_end`, `message`, `tool_call`, `tool_result`, `compaction_start`, `compaction_end`, `auto_compaction_start`, `auto_compaction_end`, `extension_ui_request`, `extension_error`, `prompt_done`, `prompt_error`, `connected`.

Heartbeat every 30s to prevent timeout. Client reconnects on disconnect; stale runs are detected via monotonic run id reconciliation.

### Running State Broadcast

`GET /api/agent/running/events` broadcasts the set of currently-running session ids via SSE. Updated whenever any session starts/stops work. Sidebar subscribes to show running badges without polling.

## Branching Model

Two distinct branching mechanisms:

### Fork (`POST` with type `fork`)

Creates a new independent `.jsonl` file. The new session's header has `parentSession` pointing to the original file. The wrapper destroys itself after fork so the next request gets a clean AgentSession from the original file.

### In-Session Branch (`navigate_tree` / BranchNavigator)

Uses `navigate_tree` within the same file. Multiple leaf entries share the same `parentId`. Switching uses `GET /api/sessions/[id]/context?leafId=` to load different branches.

## Model & Config

### Model Resolution

- Models listed from Pi SDK `ModelRegistry` via `GET /api/models`
- Default model from `~/.pi/agent/settings.json` → `defaultModel`
- Model changes persist in session file via `set_model` command
- `models-config` endpoint reads/writes `~/.pi/agent/models.json`

### Thinking Level

Supported levels: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`. DeepSeek models get compat fix for xhigh→max mapping.

### Tool Presets

Three presets defined in `lib/tool-presets.ts`:

| Preset | Tools |
|--------|-------|
| `none` | Empty (all tools disabled, system prompt cleared) |
| `default` | `read`, `bash`, `edit`, `write` |
| `full` | `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls` |

Extension/package tools are always preserved regardless of preset (except `none`).

## Extension UI Bridge

Extensions interact with web UI through `ExtensionUiContext`:

- `select(title, options)`: dropdown selection
- `confirm(title, message)`: yes/no confirmation
- `input(title, placeholder)`: text input
- `editor(title, prefill)`: multi-line editor
- `notify(message, type)`: toast notification
- `setStatus(key, text)`: status bar entry
- `setWidget(key, lines, placement)`: persistent widget
- `custom(factory, options)`: full custom TUI rendered as lines
- `setTitle(title)`: session title

All UI requests support timeout and AbortSignal. Default timeout values handled by each dialog type.

## Compaction

- Auto-compaction: enabled by default from global config `compaction.enabled`
- Manual compaction: triggered via `POST` with `type: "compact"`
- In-progress compaction can be aborted via `abort_compaction`
- Events: `compaction_start`/`compaction_end`; older SDK versions emit `auto_compaction_start`/`auto_compaction_end`
- Both event name pairs are handled by the UI

## Session File Format

Location: `~/.pi/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`

Each line is a JSON entry. Key entry types:

- `session`: header with id, version, cwd, parentSession
- `message`: user/assistant/toolResult messages
- `model_change`: provider/modelId change
- `thinking_level_change`: thinking level change
- `compaction`: summary, tokensBefore, firstKeptEntryId
- `branch_summary`: summary when returning from branch
- `session_info`: user-defined name
- `label`: entry labels
- `custom_message`: extension custom messages

## Global Config Fields

The app reads from `~/.pi/agent/settings.json`. Fields used:

| Field | Used by | How |
|-------|---------|-----|
| `defaultProvider` | App | Preselected for new sessions |
| `defaultModel` | App, `/api/models` | Preselected for new sessions |
| `defaultThinkingLevel` | App | Applied on new session start |
| `compaction` | SDK via session | Auto-compaction enabled/reserve tokens |
| `retry` | SDK via session | Auto-retry enabled/max retries/delay |
| `branchSummary` | SDK via session | Reserve tokens/skip prompt |
| `packages` | SDK via resource loader | Loaded on session start |
| `prompts` | SDK via resource loader | Available as slash commands |
| `enabledModels` | SDK via model registry | Model list filter |
| `piStatus` | Not used by app | CLI-only TUI feature |
| `transport` | Not used by app | CLI transport selection |
| `theme` | Not used by app | App has own theme |
| `lastChangelogVersion` | Not used by app | CLI changelog tracking |
| `defaultProjectTrust` | Not used by app | CLI trust prompt |
| `enableInstallTelemetry` | Not used by app | CLI telemetry |
| `enableAnalytics` | Not used by app | CLI analytics |

## Validation Commands

```bash
# Type-check (no emit)
bunx tsc --noEmit

# Lint
bun run lint

# Run dev server (port 30141)
bun run dev
```

Never run `next build` during normal development — pollutes `.next/` and breaks `bun run dev`.

## Idle Timeout

AgentSessionWrapper auto-destroys after 10 minutes of inactivity (no events, no commands). Registered in globalThis for Next.js hot-reload survival.

## File Access

Allowed roots for `/api/files`: session cwds, resolved project roots, `~/pi-cwd-*` directories, and explicitly added roots. New sessions auto-register their cwd.

## Worktree Support

Git worktrees resolved via `lib/worktree.ts`. Sessions in worktrees grouped under main repo project root. Create/remove operations guarded by allowed-root checks. Dirty worktree removal returns 409 with `{ dirty: true }`.
