# Pi Web Desktop

macOS desktop app wrapper for Pi Web. Built with Electron.

## Development

```bash
# Install dependencies (run from project root)
cd desktop && bun install

# Start desktop in dev mode (from project root)
bun run desktop:dev
```

The dev flow:
1. `electron-vite` builds the main process + preload
2. Electron main process spawns `next dev` on a free port
3. After health check passes, BrowserWindow loads `http://127.0.0.1:<port>`

## Build & Package

```bash
# Build Next.js + Electron assets
bun run desktop:build

# Package macOS .dmg / .zip
bun run desktop:package:mac
```

Packaging creates unsigned artifacts in `desktop/dist/`. Code signing and
notarization are not included in the MVP — configure them before public
distribution. The package currently reuses Pi Web's bundled favicon as the
macOS/Linux app icon (`resources/icon.png`).

## Architecture

```
desktop/
  src/
    main/
      index.ts     — main process entry: single instance lock, port alloc,
                     sidecar spawn, BrowserWindow, lifecycle
      server.ts    — Next.js sidecar: spawn/health/kill
      ipc.ts       — IPC handlers for native dialogs, clipboard,
                     notifications, file actions, zoom, and logs
    preload/
      index.ts     — contextBridge: window.piDesktop API
  out/             — electron-vite build output
  resources/
    icon.png           — temporary app icon copied from Pi Web favicon
    entitlements.plist — macOS hardened runtime entitlements
```

## Web vs Desktop

| Feature | Web (`bunx @agegr/pi-web`) | Desktop |
|---|---|---|
| Server | Next.js on port 30141 | Next.js on loopback free port |
| Auth | Origin-based guard | Origin + per-launch token |
| Directory picker | Text input | Native macOS dialog |
| Window | Browser tab | Electron BrowserWindow |
| Single instance | N/A | Locked to one app window |

Web mode (`bunx @agegr/pi-web`) continues to work unchanged. The desktop
shell is an optional wrapper that adds native window management and file
system integration.
