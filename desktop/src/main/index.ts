import { app, BrowserWindow, shell } from "electron";
import type { OnBeforeSendHeadersListenerDetails, BeforeSendResponse } from "electron";
import windowState from "electron-window-state";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";
import { killSidecar, spawnNextServer, waitForHealth } from "./server";
import { initLogging, writeLog } from "./logging";
import { createMenu } from "./menu";
import {
  isAllowedExternalUrl,
  isSidecarUrl,
  setSidecarOrigin,
  shouldAttachDesktopAuthHeader,
} from "./security";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function getPreloadPath(): string {
  const mainDir = dirname(fileURLToPath(import.meta.url));
  return join(mainDir, "../preload/index.js");
}

function createMainWindow(port: number, authToken: string): BrowserWindow {
  const state = windowState({
    file: "pi-web-window-state.json",
    defaultWidth: 1280,
    defaultHeight: 800,
  });

  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    show: false,
    autoHideMenuBar: true,
    title: "Pi Web",
    backgroundColor: "#1a1a2e",
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hidden" as const,
          trafficLightPosition: { x: 14, y: 14 },
        }
      : {}),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  state.manage(win);

  const sidecarUrl = `http://127.0.0.1:${port}`;
  setSidecarOrigin(sidecarUrl);

  // Inject auth token only into local sidecar API requests.
  // Never attach it to app pages, external origins, or subresources.
  win.webContents.session.webRequest.onBeforeSendHeaders(
    (
      details: OnBeforeSendHeadersListenerDetails,
      callback: (beforeSendResponse: BeforeSendResponse) => void,
    ) => {
      for (const key of Object.keys(details.requestHeaders)) {
        if (key.toLowerCase() === "x-pi-desktop-auth") delete details.requestHeaders[key];
      }
      if (shouldAttachDesktopAuthHeader(details)) {
        details.requestHeaders["X-Pi-Desktop-Auth"] = authToken;
      }
      callback({ requestHeaders: details.requestHeaders });
    },
  );

  // Persist zoom factor
  const zoomFactorKey = "pi-web-zoom-factor";
  const savedZoom = state.unmanage;
  let zoomLoaded = false;

  win.webContents.on("dom-ready", () => {
    // Restore saved zoom from store
    if (!zoomLoaded) {
      zoomLoaded = true;
      try {
        const stateObj = state as unknown as Record<string, unknown>;
        const zoom = Number(stateObj[zoomFactorKey] ?? 1);
        if (zoom >= 0.2 && zoom <= 10) {
          win.webContents.setZoomFactor(zoom);
        }
      } catch {
        // ignore
      }
    }
  });

  win.webContents.on("zoom-changed", (_event, zoomDirection) => {
    const factor = win.webContents.getZoomFactor();
    // Persist to window state store
    try {
      const stateObj = state as unknown as Record<string, unknown>;
      stateObj[zoomFactorKey] = factor;
    } catch {
      // ignore
    }
  });

  win.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isSidecarUrl(navigationUrl)) event.preventDefault();
  });

  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (isAllowedExternalUrl(targetUrl)) void shell.openExternal(targetUrl);
    return { action: "deny" };
  });

  void win.loadURL(sidecarUrl);

  win.once("ready-to-show", () => {
    win.show();
    if (isDev) win.webContents.openDevTools({ mode: "detach" });
  });

  win.on("closed", () => {
    mainWindow = null;
  });

  return win;
}

async function main() {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Initialize logging
  initLogging();
  writeLog("main", "app starting", {
    version: app.getVersion(),
    packaged: app.isPackaged,
  });

  // Generate per-launch auth token
  const crypto = await import("node:crypto");
  const authToken = crypto.randomBytes(32).toString("hex");

  // Spawn Next.js server on free port with auth token
  const { port, process: child } = await spawnNextServer(authToken);

  await app.whenReady();

  registerIpcHandlers(`http://127.0.0.1:${port}`);

  // Wait for Next.js server to be ready
  try {
    await waitForHealth(port, authToken);
  } catch (err) {
    writeLog("main", "health check failed", { error: String(err) });
    console.error("Next.js server failed to become healthy:", err);
    killSidecar();
    app.quit();
    return;
  }

  mainWindow = createMainWindow(port, authToken);

  // Build macOS application menu
  createMenu(() => mainWindow);

  writeLog("main", "ready", { port, dev: isDev });
}

// ── Lifecycle ──────────────────────────────────────────────────────────

app.on("before-quit", () => {
  writeLog("main", "before-quit");
  killSidecar();
});

app.on("will-quit", () => {
  writeLog("main", "will-quit");
  killSidecar();
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    writeLog("main", "signal", { signal });
    killSidecar();
    app.exit(0);
  });
}

// ── Start ──────────────────────────────────────────────────────────────

void main();
