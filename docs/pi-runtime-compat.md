# Pi Runtime Compatibility

How Pi Web reads, uses, and mutates the global Pi agent config at `~/.pi/agent/settings.json`.

## Supported Config Fields

| Field | Read | Mutated | Notes |
|-------|------|---------|-------|
| `defaultProvider` | ✅ | ❌ | Preselected for new sessions |
| `defaultModel` | ✅ | ❌ | Preselected for new sessions; shown in model list |
| `defaultThinkingLevel` | ✅ | ❌ | Applied on new session start |
| `compaction.enabled` | ✅ | ❌ | Auto-compaction toggle |
| `compaction.reserveTokens` | ✅ | ❌ | Passed to SDK |
| `compaction.keepRecentTokens` | ✅ | ❌ | Passed to SDK |
| `retry.enabled` | ✅ | ❌ | Auto-retry toggle |
| `retry.maxRetries` | ✅ | ❌ | Passed to SDK |
| `retry.baseDelayMs` | ✅ | ❌ | Passed to SDK |
| `retry.provider.timeoutMs` | ✅ | ❌ | Passed to SDK |
| `branchSummary.reserveTokens` | ✅ | ❌ | Passed to SDK |
| `branchSummary.skipPrompt` | ✅ | ❌ | Passed to SDK |
| `packages` | ✅ | ✅ | Loaded on session start; install/remove via Plugins panel |
| `prompts` | ✅ | ❌ | Available as slash commands |
| `enabledModels` | ✅ | ✅ | Model list filter; edited via Models panel |
| `piStatus` | ❌ | ❌ | CLI-only TUI feature; ignored by Pi Web |
| `transport` | ❌ | ❌ | CLI transport selection; not applicable |
| `theme` | ❌ | ❌ | Pi Web has its own theme system |
| `lastChangelogVersion` | ❌ | ❌ | CLI changelog tracking |
| `defaultProjectTrust` | ❌ | ❌ | CLI trust config; not Pi Web file-access allow-list |
| `enableInstallTelemetry` | ❌ | ❌ | CLI telemetry |
| `enableAnalytics` | ❌ | ❌ | CLI analytics |
| `mcp.json` servers | ✅ | ❌ | Shows counts/auth-ref type/status only; never token values |
| `trust.json` roots | ⚠️ | ❌ | CLI trust config only; Pi Web allowed roots come from sessions, selected dirs, project roots, and runtime additions |

## Config Mutations

Pi Web mutates these config paths:

### `models.json` (`GET`/`PUT` `/api/models-config`)

- Read/write model provider entries
- Validates shape before write
- Secrets redacted in GET responses
- Redacted placeholders (`<redacted>`, `<env-ref>`) preserve existing secret fields on save
- UI warns before replacing placeholder secrets with new literal values

### `packages` in `settings.json`

- Install/remove via `/api/plugins`
- Enable/disable via `/api/plugins`
- Each mutation triggers resource reload

### `skills` in `settings.json`

- Install via `/api/skills/install`
- `disable-model-invocation` toggle via `/api/skills`

### Auth keys

- API keys stored/removed via `/api/auth/api-key/[provider]`
- OAuth tokens managed via `/api/auth/login/[provider]`
- Keys never returned by GET endpoints

## Supported Package Types

| Type | Support | Notes |
|------|---------|-------|
| `npm:` packages | ✅ | Installed via `bunx`; global + project scope |
| Local path packages | ✅ | Loaded if present on filesystem |
| Prompts | ✅ | Available as slash commands |
| Skills | ✅ | List/install/search/toggle |
| MCP servers | ⚠️ | Tools visible; read-only status; no auth/connect controls |
| Extensions with TUI | ⚠️ | Rendered as text lines; layout differs from CLI terminal |
| Extensions with web UI | ✅ | Select/confirm/input/editor dialogs fully supported |
| Extension widgets | ⚠️ | Text-only rendering |
| Computer use | ❌ | TUI-dependent; cannot work in web context |

## Known Gaps

1. **MCP server management**: Pi Web shows MCP tool names and server status read-only. Auth and connect controls are not yet available in the UI.

2. **Custom TUI extensions**: Rendered as plain text lines without terminal layout. Functionally equivalent but visually different.

3. **RTK optimizer**: Shell gate is enforced in CLI; Pi Web uses its own shell gating through proxy middleware.

4. **Theme synchronization**: Pi Web uses its own dark/light theme; does not read `settings.json → theme`.

5. **piStatus bar**: CLI-only TUI feature. Pi Web has its own status bar in the title area.

6. **Project trust**: Pi Web does not prompt for project trust. Uses directory picker validation instead.

7. **Desktop-only features**: Directory picker, native notifications, app menu, clipboard image paste, and Reveal in Finder are only available in desktop mode.

## Config Refresh

`POST /api/pi/config-refresh` invalidates runtime caches without writing config files. It clears model and session-list caches; resource summaries are reloaded from a fresh loader per request. Use after editing `settings.json` or `models.json` externally. The Pi Runtime panel in Settings also provides a refresh button.

## Local hardening

- Keep `~/.pi/agent/auth.json` private; do not print or paste it into transcripts.
- Run `chmod 600 ~/.pi/agent/mcp.json` when MCP config contains tokens, auth refs, private workspace IDs, or command env metadata.
- Rotate tokens if terminal/tool transcripts containing token fragments were persisted or shared.
- Config summary hides local paths by default; use details view only in trusted local UI.

## File Locations

| Artifact | Path |
|----------|------|
| Global settings | `~/.pi/agent/settings.json` |
| Model config | `~/.pi/agent/models.json` |
| Sessions | `~/.pi/agent/sessions/` |
| Agent dir | `PI_CODING_AGENT_DIR` env var or `~/.pi/agent` |
| Desktop logs | `~/Library/Logs/Pi Web/` (macOS) |
| Desktop window state | `pi-web-window-state.json` (user data dir) |
