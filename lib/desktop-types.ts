// Desktop API type declarations.
//
// In Electron mode the preload script exposes window.piDesktop with all
// of these methods.  In web mode window.piDesktop is undefined and the
// app falls back to browser-native behaviour for each feature.
//
// Keep this in sync with desktop/src/preload/index.ts.

export interface FilePickerFile {
  path: string;
  name: string;
  size: number;
}

export interface ClipboardImage {
  /** Base64-encoded PNG image data. */
  buffer: string;
  width: number;
  height: number;
}

export interface PiDesktopAPI {
  /** Open native directory picker. Returns selected path or null. */
  selectDirectory(): Promise<string | null>;

  /** Open native file picker. */
  openFilePicker(opts?: {
    multiple?: boolean;
    title?: string;
    defaultPath?: string;
    extensions?: string[];
  }): Promise<FilePickerFile | FilePickerFile[] | null>;

  /** Show a native macOS notification. */
  showNotification(title: string, body?: string): void;

  /** Read an image from the system clipboard. Returns base64 PNG or null. */
  readClipboardImage(): Promise<ClipboardImage | null>;

  /** Reveal a file or folder in Finder. Returns true if path exists. */
  revealPath(path: string): Promise<boolean>;

  /** Open a file with the default or specified app. */
  openPath(path: string, appName?: string): Promise<void>;

  /** Open a URL in the default browser. */
  openLink(url: string): void;

  /** Get current zoom factor (0.2–10). */
  getZoomFactor(): Promise<number>;

  /** Set zoom factor (clamped to 0.2–10). */
  setZoomFactor(factor: number): Promise<void>;

  /** Zoom in by one step (+0.2). Returns new factor. */
  zoomIn(): Promise<number>;

  /** Zoom out by one step (-0.2). Returns new factor. */
  zoomOut(): Promise<number>;

  /** Reset zoom to 100%. Returns 1. */
  resetZoom(): Promise<number>;

  /** Export debug logs and reveal in Finder. Returns export path. */
  exportDebugLogs(): Promise<string>;

  /** Check whether the window is currently focused. */
  getWindowFocused(): Promise<boolean>;

  /** Focus this window. */
  setWindowFocus(): Promise<void>;

  /** Listen for menu commands sent from the main process.
   *  Returns an unsubscribe function. */
  onMenuCommand(cb: (command: string) => void): () => void;

  /** Get the app version string. */
  getAppVersion(): Promise<string>;

  /** Whether the app is running as a packaged build. */
  isPackaged(): Promise<boolean>;
}

declare global {
  interface Window {
    piDesktop?: PiDesktopAPI;
  }
}

export {};
