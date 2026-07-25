# Pi Web Desktop

macOS desktop application wrapper for Pi Web, built with Electron.

## Architecture

```
Electron Main Process
  ├─ Allocates free loopback port
  ├─ Generates per-launch auth token
  ├─ Spawns Next.js sidecar (next dev)
  ├─ Creates BrowserWindow → loads http://127.0.0.1:<port>
  └─ Manages lifecycle: quit → kill sidecar

Preload (contextBridge)
  └─ window.piDesktop.selectDirectory() → IPC → native dialog
```

## Development

```bash
# From project root
cd desktop && bun install
bun run desktop:dev
```

`desktop:dev` runs `electron-vite dev` which:
1. Builds the Electron main process and preload
2. Starts the Electron app
3. The main process spawns `next dev` on a random loopback port
4. After the Next.js server is healthy, the BrowserWindow opens

The Next.js dev server supports HMR for UI changes. Electron main/preload
changes trigger an automatic restart via `electron-vite`.

## Build & Package

```bash
# From project root
bun run desktop:build

# Package macOS .dmg / .zip (unsigned)
bun run desktop:package:mac
```

The package command outputs to `desktop/dist/`. Artifacts are unsigned and
not notarized — configure code signing before public distribution.

## Per-Launch Security

In desktop mode, a random 64-character hex token is generated at startup.
The token is:

- Passed to the Next.js sidecar via `PI_DESKTOP_AUTH_TOKEN` env var
- Sent by the BrowserWindow as `X-Pi-Desktop-Auth` header on every API request
- Validated by `proxy.ts` middleware for all `/api/*` routes

Without the token, API requests return 401. This prevents random local
websites from accessing the sidecar server.

## Web vs Desktop

| Feature | Web Mode | Desktop Mode |
|---|---|---|
| Server | Next.js on port 30141 | Next.js on random loopback port |
| Auth | Origin-based guard | Origin + per-launch token |
| Directory picker | Text input field | Native macOS dialog |
| Window | Browser tab | Electron BrowserWindow |
| Single instance | N/A | One app window enforced |

Web mode (`bunx @agegr/pi-web`) continues to work unchanged. Desktop mode
is an optional wrapper for native window management and file system access.

## Window Behavior

- macOS: hidden titlebar, traffic light buttons offset (14, 14)
- Window size and position persist across restarts
- Background color: `#1a1a2e` (matches default dark theme)
- Dev tools available in dev mode (⌘+⌥+I)

## Known Limitations (MVP)

- No custom app icon (uses Electron default)
- No code signing or notarization
- No automatic updates
- No app menu (File, Edit, View, etc.) — planned for Phase 5
- No notifications — planned for Phase 5
- No clipboard image paste — planned for Phase 5
- macOS only — Windows/Linux support not yet verified
