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
  └─ window.piDesktop → IPC → native dialogs, clipboard, notifications, file actions
```

## Dev Setup

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
not notarized by default — configure code signing before public distribution.

## Per-Launch Security

In desktop mode, a random 64-character hex token is generated at startup.
The token is:

- Passed to the Next.js sidecar via `PI_DESKTOP_AUTH_TOKEN` env var
- Sent by the BrowserWindow as `X-Pi-Desktop-Auth` only for same-origin sidecar `/api/*` requests
- Validated by `proxy.ts` middleware for all `/api/*` routes

Without the token, API requests return 401. The token is never attached to
external origins or non-API page/subresource requests.

Desktop hardening:

- BrowserWindow navigation is limited to the current sidecar origin.
- New windows are denied; allowed `http:`/`https:` links open in the OS browser.
- Preload IPC handlers validate `event.senderFrame.url` against the sidecar origin.
- `openLink()` accepts only `http:`/`https:` URLs.
- `revealPath()` and `openPath()` accept only paths under user-picked roots from native pickers.
- Arbitrary app-name launches are disabled; `openPath()` uses the OS default handler.
- Renderer runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.

## Preload API

`window.piDesktop` exposes these methods to the renderer:

| Method | Description |
|--------|-------------|
| `selectDirectory()` | Opens native macOS directory picker. Returns path or `null`. |
| `openFilePicker(opts?)` | Opens native file picker. Supports multi-select, extensions filter. |
| `showNotification(title, body?)` | Shows native macOS notification when window is unfocused. |
| `readClipboardImage()` | Reads image from clipboard. Returns `{ buffer, width, height }` or `null`. |
| `revealPath(path)` | Reveals file in Finder. Returns `true` if path exists. |
| `openPath(path)` | Opens user-picked file/folder with default app. Arbitrary app launch is disabled. |
| `openLink(url)` | Opens `http:`/`https:` URL in external browser. |
| `getZoomFactor()` / `setZoomFactor(n)` | Get/set window zoom level. |
| `zoomIn()` / `zoomOut()` / `resetZoom()` | Step zoom in/out, reset to 1. |
| `exportDebugLogs()` | Exports redacted debug logs archive. Returns path to zip. |
| `getWindowFocused()` / `setWindowFocus()` | Window focus state and control. |
| `getAppVersion()` / `isPackaged()` | App metadata. |

## macOS App Menu

- **Pi Web**: About / Settings / Reload / Export Logs / Quit
- **File**: New Session / Open Project / New Window / Close
- **Edit**: Undo / Redo / Cut / Copy / Paste / Select All
- **View**: Reload / Toggle DevTools / Zoom In/Out/Reset / Toggle Full Screen / Toggle Sidebar / Toggle Right Panel
- **Go**: Previous Session / Next Session / Previous Project / Next Project

## Window Behavior

- macOS: hidden titlebar, traffic light buttons offset (14, 14)
- Window size and position persist across restarts
- Zoom factor persisted across sessions
- Background color: `#1a1a2e` (matches default dark theme)
- Dev tools available in dev mode (⌘+⌥+I) and via View menu

## Troubleshooting

### Logs

Desktop logs are written to:

- **Main process**: `~/Library/Logs/Pi Web/main.log`
- **Sidecar stdout**: `~/Library/Logs/Pi Web/sidecar-out.log`
- **Sidecar stderr**: `~/Library/Logs/Pi Web/sidecar-err.log`

Export all logs from the app: **Pi Web → Export Logs** or View menu.

### Common Issues

**App won't start**: Check that `bun install` has been run in both the project root and `desktop/`. Check main log for errors.

**"Connection refused"**: The health check timed out. The Next.js server may have failed to start. Check sidecar logs.

**Blank white window**: The Next.js server started but the page failed to load. Check DevTools console (⌘+⌥+I).

**Directory picker not working**: Ensure the app has Files & Folders permissions in System Settings → Privacy & Security.

## Permissions & Notarization

### Development

During development, macOS may prompt for:
- Accessibility (for keyboard shortcuts)
- Files & Folders (for directory picker)

These are granted automatically when running from the terminal.

### Distribution

For public distribution:

1. **Code signing**: Configure `electron-builder.config.ts` with your Apple Developer ID.
2. **Hardened runtime**: The app includes `resources/entitlements.plist` with only JIT entitlement for Electron/V8.
3. **Notarization**: Add `notarize` config to `electron-builder.config.ts` with your Apple notarization credentials.
4. **DMG signing**: The `.dmg` must be signed for Gatekeeper to accept it.

Without notarization, users need to right-click → Open on first launch, or run `xattr -cr /Applications/Pi\ Web.app`.

## Web vs Desktop

| Feature | Web Mode | Desktop Mode |
|---|---|---|
| Server | Next.js on port 30141 | Next.js on random loopback port |
| Auth | Origin guard; non-loopback bind requires explicit auth token | Origin + per-launch token |
| Directory picker | Text input field | Native macOS dialog |
| File picker | Browser `<input type="file">` | Native macOS dialog |
| Clipboard image | Not available | Native clipboard read |
| Notifications | Not available | Native macOS notifications |
| Reveal in Finder | Not available | Native shell action |
| Open in editor | Not available | Native app launcher |
| Window | Browser tab | Electron BrowserWindow with hidden titlebar |
| App menu | Not available | Full macOS menu bar |
| Single instance | N/A | Locked to one app window |
| Zoom | Browser zoom | Persisted per-window zoom |

Web mode (`bunx @agegr/pi-web`) continues to work unchanged. Desktop mode
is an optional wrapper for native window management and file system access.

## Known Limitations

- No custom app icon (uses Electron default)
- No code signing or notarization in default build
- No automatic updates
- macOS only — Windows/Linux support not yet verified
