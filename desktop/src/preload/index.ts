import { contextBridge, ipcRenderer } from "electron";

const api = {
  /** Open native macOS directory picker. Returns selected path or null. */
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke("select-directory"),
};

contextBridge.exposeInMainWorld("piDesktop", api);
