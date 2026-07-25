import { contextBridge, ipcRenderer } from "electron";

export interface FilePickerFile {
  path: string;
  name: string;
  size: number;
}

export interface ClipboardImage {
  buffer: string; // base64-encoded PNG
  width: number;
  height: number;
}

const api = {
  // ── Directory / File pickers ───────────────────────────────────────

  /** Open native macOS directory picker. Returns selected path or null. */
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke("select-directory"),

  /** Open native file picker. Returns file(s) or null. */
  openFilePicker: (opts?: {
    multiple?: boolean;
    title?: string;
    defaultPath?: string;
    extensions?: string[];
  }): Promise<FilePickerFile | FilePickerFile[] | null> =>
    ipcRenderer.invoke("open-file-picker", opts),

  // ── Notifications ──────────────────────────────────────────────────

  /** Show a native macOS notification. */
  showNotification: (title: string, body?: string): void => {
    ipcRenderer.send("show-notification", title, body);
  },

  // ── Clipboard ──────────────────────────────────────────────────────

  /** Read an image from the system clipboard. Returns base64 PNG or null. */
  readClipboardImage: (): Promise<ClipboardImage | null> =>
    ipcRenderer.invoke("read-clipboard-image"),

  // ── File system actions ────────────────────────────────────────────

  /** Reveal a file or folder in Finder. Returns true if path exists. */
  revealPath: (path: string): Promise<boolean> => ipcRenderer.invoke("reveal-path", path),

  /** Open a file or folder with the default or specified app. */
  openPath: (path: string, appName?: string): Promise<void> =>
    ipcRenderer.invoke("open-path", path, appName),

  /** Open a URL in the default browser. */
  openLink: (url: string): void => {
    ipcRenderer.send("open-link", url);
  },

  // ── Zoom ───────────────────────────────────────────────────────────

  /** Get current zoom factor. */
  getZoomFactor: (): Promise<number> => ipcRenderer.invoke("get-zoom-factor"),

  /** Set zoom factor (clamped to 0.2–10). */
  setZoomFactor: (factor: number): Promise<void> => ipcRenderer.invoke("set-zoom-factor", factor),

  /** Zoom in by one step (+0.2). Returns new factor. */
  zoomIn: (): Promise<number> => ipcRenderer.invoke("zoom-in"),

  /** Zoom out by one step (-0.2). Returns new factor. */
  zoomOut: (): Promise<number> => ipcRenderer.invoke("zoom-out"),

  /** Reset zoom to 100%. Returns 1. */
  resetZoom: (): Promise<number> => ipcRenderer.invoke("reset-zoom"),

  // ── Debug ──────────────────────────────────────────────────────────

  /** Export debug logs and reveal in Finder. Returns export path. */
  exportDebugLogs: (): Promise<string> => ipcRenderer.invoke("export-debug-logs"),

  // ── Window ─────────────────────────────────────────────────────────

  /** Check whether the window is currently focused. */
  getWindowFocused: (): Promise<boolean> => ipcRenderer.invoke("get-window-focused"),

  /** Focus this window. */
  setWindowFocus: (): Promise<void> => ipcRenderer.invoke("set-window-focus"),

  // ── Menu commands ──────────────────────────────────────────────────

  /** Listen for menu commands sent from the main process.
   *  Returns an unsubscribe function. */
  onMenuCommand: (cb: (command: string) => void): (() => void) => {
    const handler = (_event: unknown, command: string) => cb(command);
    ipcRenderer.on("menu-command", handler);
    return () => ipcRenderer.removeListener("menu-command", handler);
  },

  // ── App info ───────────────────────────────────────────────────────

  /** Get the app version string. */
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("get-app-version"),

  /** Whether the app is running as a packaged build. */
  isPackaged: (): Promise<boolean> => ipcRenderer.invoke("is-packaged"),
};

contextBridge.exposeInMainWorld("piDesktop", api);
