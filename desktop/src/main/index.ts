import { app, BrowserWindow } from "electron";
import type { OnBeforeSendHeadersListenerDetails, BeforeSendResponse } from "electron";
import windowState from "electron-window-state";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";
import { killSidecar, spawnNextServer, waitForHealth } from "./server";

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
      sandbox: false, // needed for electron-window-state + preload IPC
    },
  });

  state.manage(win);

  // Inject auth token into every API request from the renderer.
  // The proxy middleware requires X-Pi-Desktop-Auth for all /api/* routes.
  win.webContents.session.webRequest.onBeforeSendHeaders(
    (
      details: OnBeforeSendHeadersListenerDetails,
      callback: (beforeSendResponse: BeforeSendResponse) => void,
    ) => {
      details.requestHeaders["X-Pi-Desktop-Auth"] = authToken;
      callback({ requestHeaders: details.requestHeaders });
    },
  );

  const url = `http://127.0.0.1:${port}`;
  void win.loadURL(url);

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

  // Generate per-launch auth token
  const crypto = await import("node:crypto");
  const authToken = crypto.randomBytes(32).toString("hex");

  // Spawn Next.js server on free port with auth token
  const { port, process: child } = await spawnNextServer(authToken);

  await app.whenReady();

  registerIpcHandlers();

  // Wait for Next.js server to be ready
  try {
    await waitForHealth(port, authToken);
  } catch (err) {
    console.error("Next.js server failed to become healthy:", err);
    killSidecar();
    app.quit();
    return;
  }

  mainWindow = createMainWindow(port, authToken);
}

// ── Lifecycle ──────────────────────────────────────────────────────────

app.on("before-quit", () => {
  killSidecar();
});

app.on("will-quit", () => {
  killSidecar();
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    killSidecar();
    app.exit(0);
  });
}

// ── Start ──────────────────────────────────────────────────────────────

void main();
