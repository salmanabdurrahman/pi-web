# Security Threat Model

Pi Web is local agent UI. It can read local files, run tools, launch shell commands through Pi runtime, and expose desktop-native IPC in Electron. Treat browser, desktop renderer, sidecar server, global Pi config, and external package managers as separate trust zones.

## Assets

- Provider auth tokens, API keys, OAuth refresh/access tokens.
- MCP tokens, env refs, server headers, private workspace IDs.
- Local files reachable through allowed roots, selected projects, worktrees, uploads/downloads.
- Session transcripts, tool output logs, screenshots, attachments, exported debug bundles.
- Shell/tool execution capability, installed plugins/skills/prompts/themes.
- Global config under `~/.pi/agent`, including `settings.json`, `models.json`, `mcp.json`, `auth.json`, `trust.json`.

## Entry points

- Browser HTTP APIs under `/api/**` and SSE routes.
- Desktop renderer loaded from local sidecar origin.
- Electron preload IPC: directory picker, reveal/open path, open external URL, logs export, native notifications.
- File explorer upload/download/preview and bash full-output download.
- Worktree create/remove and session delete/rename/export.
- Models/auth config, OAuth/device-code/manual-code flows.
- Plugin/skill install/update/disable through package managers.
- Desktop logs export and packaged app resource loading.

## Trust boundaries

| Boundary | Trust rule | Current guard |
| --- | --- | --- |
| Browser page → local APIs | Same-origin local UI only | `proxy.ts` origin + fetch-site guard; exposed non-loopback requires auth token |
| Desktop renderer → sidecar APIs | Current sidecar origin only | per-launch `X-Pi-Desktop-Auth`, scoped to `/api/*` and sidecar origin |
| Desktop renderer → native IPC | Current sidecar frame only | sender-frame URL validation in IPC handlers |
| IPC path actions → filesystem | Allowed roots or user-picked paths only | `file-access` + selected-path registry |
| File APIs → filesystem | Explicit allow-list only | session cwd/project roots, worktrees, `pi-cwd-*`, runtime-added roots; symlink checks |
| Config UI → secrets | Redacted by default, placeholder-safe saves | recursive redaction, no raw auth status returns |
| Logs/export → local sharing | Redacted best effort, paths may remain | secret redaction + export warning |
| Plugin/skill install → external package manager | User intent required | mutation endpoints audited; UI confirmation metadata |

## Required regression matrix

Run before desktop release or native/security-sensitive feature merge:

- Origin/auth guard tests: same-origin allowed, cross-site blocked, non-loopback without auth rejected.
- Cwd/file allow-list tests: outside roots rejected, symlink escapes rejected, bash full-output requires session reference.
- Redaction tests: provider keys, bearer/auth headers, OAuth/session fields, arrays/nested objects, exported logs.
- Electron navigation/IPC tests: external navigation blocked, window-open denied/OS-opened, spoofed sender rejected, path actions constrained.
- Desktop packaging smoke: sidecar auth works, UI/static assets bundled, quit kills sidecar, logs export redacted.
- Release gate: `node_modules/.bin/tsc --noEmit`, `bun run lint`, targeted `node --test` suites, desktop smoke, secret scan over exported logs/artifacts.

## Release gate

Desktop release blocked when any High/Critical regression remains in auth/origin, IPC/navigation, file allow-list, redaction, shell/tool execution, or package-manager mutation flow.
