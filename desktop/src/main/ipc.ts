import { BrowserWindow, Notification, clipboard, dialog, ipcMain, shell } from "electron";
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { execFile } from "node:child_process";
import { exportDebugLogs } from "./logging";

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 10;
const ZOOM_STEP = 0.2;

export function registerIpcHandlers(): void {
  // ── Directory picker ──────────────────────────────────────────────

  ipcMain.handle("select-directory", async (_event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory", "createDirectory"],
      title: "Select Project Directory",
      buttonLabel: "Open",
    });

    if (result.canceled) return null;
    return result.filePaths[0] ?? null;
  });

  // ── File picker ───────────────────────────────────────────────────

  ipcMain.handle(
    "open-file-picker",
    async (
      _event: IpcMainInvokeEvent,
      opts?: {
        multiple?: boolean;
        title?: string;
        defaultPath?: string;
        extensions?: string[];
      },
    ) => {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return null;

      const result = await dialog.showOpenDialog(win, {
        properties: ["openFile", ...(opts?.multiple ? (["multiSelections"] as const) : [])],
        title: opts?.title ?? "Choose a file",
        defaultPath: opts?.defaultPath,
        filters: opts?.extensions ? [{ name: "Files", extensions: opts.extensions }] : undefined,
      });

      if (result.canceled) return null;

      const files = await Promise.all(
        result.filePaths.map(async (filePath) => ({
          path: filePath,
          name: basename(filePath),
          size: (await stat(filePath)).size,
        })),
      );

      return opts?.multiple ? files : (files[0] ?? null);
    },
  );

  // ── Notifications ─────────────────────────────────────────────────

  ipcMain.on("show-notification", (_event: IpcMainEvent, title: string, body?: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // ── Clipboard ─────────────────────────────────────────────────────

  ipcMain.handle("read-clipboard-image", () => {
    const image = clipboard.readImage();
    if (image.isEmpty()) return null;
    const buffer = image.toPNG();
    const size = image.getSize();
    return {
      buffer: Buffer.from(buffer).toString("base64"),
      width: size.width,
      height: size.height,
    };
  });

  // ── File system actions ───────────────────────────────────────────

  ipcMain.handle("reveal-path", async (_event: IpcMainInvokeEvent, path: string) => {
    const exists = await stat(path).then(
      () => true,
      () => false,
    );
    if (!exists) return false;
    shell.showItemInFolder(path);
    return true;
  });

  ipcMain.handle(
    "open-path",
    async (_event: IpcMainInvokeEvent, path: string, appName?: string) => {
      if (!appName) {
        await shell.openPath(path);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const [cmd, args] =
          process.platform === "darwin"
            ? (["open", ["-a", appName, path]] as const)
            : ([appName, [path]] as const);
        execFile(cmd, args, (err) => (err ? reject(err) : resolve()));
      });
      return;
    },
  );

  ipcMain.on("open-link", (_event: IpcMainEvent, url: string) => {
    void shell.openExternal(url);
  });

  // ── Zoom ──────────────────────────────────────────────────────────

  ipcMain.handle("get-zoom-factor", (event: IpcMainInvokeEvent) => event.sender.getZoomFactor());

  ipcMain.handle("set-zoom-factor", (event: IpcMainInvokeEvent, factor: number) => {
    const clamped = Math.min(Math.max(factor, ZOOM_MIN), ZOOM_MAX);
    event.sender.setZoomFactor(clamped);
  });

  ipcMain.handle("zoom-in", (event: IpcMainInvokeEvent) => {
    const current = event.sender.getZoomFactor();
    const clamped = Math.min(current + ZOOM_STEP, ZOOM_MAX);
    event.sender.setZoomFactor(clamped);
    return clamped;
  });

  ipcMain.handle("zoom-out", (event: IpcMainInvokeEvent) => {
    const current = event.sender.getZoomFactor();
    const clamped = Math.max(current - ZOOM_STEP, ZOOM_MIN);
    event.sender.setZoomFactor(clamped);
    return clamped;
  });

  ipcMain.handle("reset-zoom", (event: IpcMainInvokeEvent) => {
    event.sender.setZoomFactor(1);
    return 1;
  });

  // ── Debug logs ────────────────────────────────────────────────────

  ipcMain.handle("export-debug-logs", () => {
    return exportDebugLogs();
  });

  // ── Window state ──────────────────────────────────────────────────

  ipcMain.handle("get-window-focused", (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isFocused() ?? false;
  });

  ipcMain.handle("set-window-focus", (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.focus();
  });

  // ── App info ──────────────────────────────────────────────────────

  ipcMain.handle("get-app-version", () => {
    return import("electron").then(({ app }) => app.getVersion());
  });

  ipcMain.handle("is-packaged", () => {
    return import("electron").then(({ app }) => app.isPackaged);
  });
}
