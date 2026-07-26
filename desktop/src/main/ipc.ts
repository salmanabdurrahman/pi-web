import { BrowserWindow, Notification, clipboard, dialog, ipcMain, shell } from "electron";
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { realpath, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { exportDebugLogs } from "./logging";
import { isAllowedExternalUrl } from "./security";

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 10;
const ZOOM_STEP = 0.2;

const pickedPaths = new Set<string>();

function assertTrustedSender(
  event: IpcMainEvent | IpcMainInvokeEvent,
  sidecarOrigin: string,
): void {
  const senderUrl = event.senderFrame?.url;
  if (!senderUrl || new URL(senderUrl).origin !== sidecarOrigin) {
    throw new Error("Untrusted IPC sender");
  }
}

async function rememberPickedPath(path: string): Promise<void> {
  pickedPaths.add(await realpath(path));
}

async function isPickedPath(path: string): Promise<boolean> {
  const target = await realpath(path);
  for (const root of pickedPaths) {
    if (target === root || target.startsWith(`${root}/`)) return true;
  }
  return false;
}

function assertPlainPath(path: string): void {
  if (typeof path !== "string" || !path || path.includes("\0")) {
    throw new Error("Invalid path");
  }
  resolve(path);
}

export function registerIpcHandlers(sidecarOrigin: string): void {
  // ── Directory picker ──────────────────────────────────────────────

  ipcMain.handle("select-directory", async (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory", "createDirectory"],
      title: "Select Project Directory",
      buttonLabel: "Open",
    });

    if (result.canceled) return null;
    const selected = result.filePaths[0] ?? null;
    if (selected) await rememberPickedPath(selected);
    return selected;
  });

  // ── File picker ───────────────────────────────────────────────────

  ipcMain.handle(
    "open-file-picker",
    async (
      event: IpcMainInvokeEvent,
      opts?: {
        multiple?: boolean;
        title?: string;
        defaultPath?: string;
        extensions?: string[];
      },
    ) => {
      assertTrustedSender(event, sidecarOrigin);
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return null;

      const result = await dialog.showOpenDialog(win, {
        properties: ["openFile", ...(opts?.multiple ? (["multiSelections"] as const) : [])],
        title: opts?.title ?? "Choose a file",
        defaultPath: opts?.defaultPath,
        filters: opts?.extensions ? [{ name: "Files", extensions: opts.extensions }] : undefined,
      });

      if (result.canceled) return null;
      await Promise.all(result.filePaths.map(rememberPickedPath));

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

  ipcMain.on("show-notification", (event: IpcMainEvent, title: string, body?: string) => {
    assertTrustedSender(event, sidecarOrigin);
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // ── Clipboard ─────────────────────────────────────────────────────

  ipcMain.handle("read-clipboard-image", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
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

  ipcMain.handle("reveal-path", async (event: IpcMainInvokeEvent, path: string) => {
    assertTrustedSender(event, sidecarOrigin);
    assertPlainPath(path);
    if (!(await isPickedPath(path))) throw new Error("Path is outside user-picked roots");
    const exists = await stat(path).then(
      () => true,
      () => false,
    );
    if (!exists) return false;
    shell.showItemInFolder(path);
    return true;
  });

  ipcMain.handle("open-path", async (event: IpcMainInvokeEvent, path: string, appName?: string) => {
    assertTrustedSender(event, sidecarOrigin);
    assertPlainPath(path);
    if (appName) throw new Error("Opening with arbitrary apps is not supported");
    if (!(await isPickedPath(path))) throw new Error("Path is outside user-picked roots");
    await shell.openPath(path);
    return;
  });

  ipcMain.on("open-link", (event: IpcMainEvent, url: string) => {
    assertTrustedSender(event, sidecarOrigin);
    if (isAllowedExternalUrl(url)) void shell.openExternal(url);
  });

  // ── Zoom ──────────────────────────────────────────────────────────

  ipcMain.handle("get-zoom-factor", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    return event.sender.getZoomFactor();
  });

  ipcMain.handle("set-zoom-factor", (event: IpcMainInvokeEvent, factor: number) => {
    assertTrustedSender(event, sidecarOrigin);
    const clamped = Math.min(Math.max(factor, ZOOM_MIN), ZOOM_MAX);
    event.sender.setZoomFactor(clamped);
  });

  ipcMain.handle("zoom-in", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    const current = event.sender.getZoomFactor();
    const clamped = Math.min(current + ZOOM_STEP, ZOOM_MAX);
    event.sender.setZoomFactor(clamped);
    return clamped;
  });

  ipcMain.handle("zoom-out", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    const current = event.sender.getZoomFactor();
    const clamped = Math.max(current - ZOOM_STEP, ZOOM_MIN);
    event.sender.setZoomFactor(clamped);
    return clamped;
  });

  ipcMain.handle("reset-zoom", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    event.sender.setZoomFactor(1);
    return 1;
  });

  // ── Debug logs ────────────────────────────────────────────────────

  ipcMain.handle("export-debug-logs", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    return exportDebugLogs();
  });

  // ── Window state ──────────────────────────────────────────────────

  ipcMain.handle("get-window-focused", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isFocused() ?? false;
  });

  ipcMain.handle("set-window-focus", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.focus();
  });

  // ── App info ──────────────────────────────────────────────────────

  ipcMain.handle("get-app-version", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    return import("electron").then(({ app }) => app.getVersion());
  });

  ipcMain.handle("is-packaged", (event: IpcMainInvokeEvent) => {
    assertTrustedSender(event, sidecarOrigin);
    return import("electron").then(({ app }) => app.isPackaged);
  });
}
