import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from "electron";

export function registerIpcHandlers(): void {
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
}
