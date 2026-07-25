# Pi CLI vs Pi Web vs Desktop — Compatibility Matrix

Documents feature parity between Pi CLI (`pi`), Pi Web (`@agegr/pi-web`), and future Pi Desktop.

Version: 0.8.0 | Analysis date: 2026-07-25

## Feature Matrix

| Feature | Pi CLI | Pi Web | Desktop (planned) |
|---------|--------|--------|-------------------|
| **Session Management** |
| List sessions | ✅ | ✅ | ✅ |
| Create session | ✅ | ✅ | ✅ |
| Send prompt | ✅ | ✅ | ✅ |
| Stream response (SSE) | ✅ (TUI) | ✅ | ✅ |
| SSE reconnect mid-stream | N/A | ✅ | ✅ |
| Steer/follow-up queue | ✅ | ✅ | ✅ |
| Fork session | ✅ | ✅ | ✅ |
| In-session branch navigation | ✅ | ✅ | ✅ |
| Bash mode | ✅ | ✅ | ✅ |
| Compact (manual) | ✅ | ✅ | ✅ |
| Auto-compaction | ✅ | ✅ | ✅ |
| Abort compaction | ✅ | ✅ | ✅ |
| Retry | ✅ | ✅ | ✅ |
| Session rename | ✅ | ✅ | ✅ |
| Session delete | ✅ | ✅ | ✅ |
| Auto-name session | ✅ | ✅ | ✅ |
| Export session HTML | ✅ | ✅ | ✅ |
| **Model & Config** |
| Default model from settings | ✅ | ✅ | ✅ |
| Model switch | ✅ | ✅ | ✅ |
| Thinking level change | ✅ | ✅ | ✅ |
| Models config read/write | ✅ | ✅ | ✅ |
| API key management | ✅ | ✅ | ✅ |
| OAuth provider auth | ✅ | ✅ | ✅ |
| Model test | ✅ | ✅ | ✅ |
| Config refresh/reload | ✅ | ✅ | ✅ |
| **Tools** |
| Builtin coding tools | ✅ | ✅ | ✅ |
| Extension/package tools | ✅ | ✅ | ✅ |
| Tool preset (none/default/full) | ✅ | ✅ | ✅ |
| Tool allow-list | ✅ | ✅ | ✅ |
| Empty-tool (all disabled) | ✅ | ✅ | ✅ |
| MCP tools | ✅ | ⚠️ (limited) | ⚠️ |
| Web tools | ✅ | ⚠️ | ⚠️ |
| Subagents | ✅ | ✅ | ✅ |
| Code review graph | ✅ | ⚠️ | ⚠️ |
| Codebase memory | ✅ | ⚠️ | ⚠️ |
| Computer use | ✅ | ❌ | ❌ |
| RTK optimizer | ✅ | ❌ (N/A web) | ❌ |
| **Extensions** |
| Select dialog | ✅ (TUI) | ✅ | ✅ |
| Confirm dialog | ✅ (TUI) | ✅ | ✅ |
| Input dialog | ✅ (TUI) | ✅ | ✅ |
| Editor dialog | ✅ (TUI) | ✅ | ✅ |
| Notify/toast | ✅ | ✅ | ✅ |
| Status display | ✅ | ✅ | ✅ |
| Widget display | ✅ | ⚠️ (text only) | ⚠️ |
| Custom TUI | ✅ | ⚠️ (rendered as lines) | ⚠️ |
| Theme control | ✅ | ❌ | ❌ |
| **Packages & Skills** |
| List installed packages | ✅ | ✅ | ✅ |
| Install/remove package | ✅ | ✅ | ✅ |
| Enable/disable package | ✅ | ✅ | ✅ |
| Skill list | ✅ | ✅ | ✅ |
| Skill install | ✅ | ✅ | ✅ |
| Skill search | ✅ | ✅ | ✅ |
| Skill toggle (disable-model-invocation) | ✅ | ✅ | ✅ |
| **Files** |
| File explorer | N/A | ✅ | ✅ |
| File read | ✅ | ✅ | ✅ |
| File write (agent) | ✅ | ✅ | ✅ |
| File upload | N/A | ✅ | ✅ |
| File download | N/A | ✅ | ✅ |
| Image paste | N/A | ❌ | ✅ (planned) |
| Open in editor | ✅ (external) | ❌ | ✅ (planned) |
| Reveal in Finder | N/A | ❌ | ✅ (planned) |
| **Git & Worktrees** |
| Git status | ✅ | ✅ | ✅ |
| Git diff | ✅ | ✅ | ✅ |
| Worktree create | N/A | ✅ | ✅ |
| Worktree remove | N/A | ✅ | ✅ |
| Worktree dirty handling | N/A | ✅ | ✅ |
| **Desktop-Specific** |
| Native window | ❌ | ❌ | ✅ |
| Directory picker | ❌ | ⚠️ (browser API) | ✅ |
| App menu | ❌ | ❌ | ✅ |
| Native notifications | ❌ | ❌ | ✅ |
| Single-instance lock | ❌ | ❌ | ✅ |
| Auto-update | ❌ | ❌ | ✅ |
| Loopback auth | N/A | ✅ (origin guard) | ✅ |
| **Config Fields** |
| defaultProvider | ✅ | ✅ | ✅ |
| defaultModel | ✅ | ✅ | ✅ |
| defaultThinkingLevel | ✅ | ✅ | ✅ |
| compaction | ✅ | ✅ | ✅ |
| retry | ✅ | ✅ | ✅ |
| branchSummary | ✅ | ✅ | ✅ |
| packages | ✅ | ✅ | ✅ |
| prompts | ✅ | ✅ | ✅ |
| enabledModels | ✅ | ✅ | ✅ |
| piStatus | ✅ | ❌ (ignored) | ❌ (ignored) |
| transport | ✅ | ❌ (N/A) | ❌ (N/A) |
| theme | ✅ | ❌ (own theme) | ❌ (own theme) |
| lastChangelogVersion | ✅ | ❌ (ignored) | ❌ (ignored) |
| defaultProjectTrust | ✅ | ❌ (ignored) | ❌ (ignored) |
| enableInstallTelemetry | ✅ | ❌ (N/A) | ❌ (N/A) |
| enableAnalytics | ✅ | ❌ (N/A) | ❌ (N/A) |

## Legend

- ✅ Fully supported
- ⚠️ Partial support or limitations
- ❌ Not supported
- N/A Not applicable to this interface

## Known Gaps

1. **MCP tools**: Pi Web has read-only status via MCP adapter but no auth/connect controls. Only server names and status shown.
2. **Custom TUI**: Rendered as plain text lines; layout differs from CLI terminal rendering.
3. **Computer use**: TUI-dependent; cannot work in web context.
4. **piStatus**: CLI-only TUI status bar; not applicable to web UI.
5. **Desktop features**: Directory picker uses browser API in web mode; native picker planned for desktop.
