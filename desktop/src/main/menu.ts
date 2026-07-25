import { BrowserWindow, Menu, app, shell } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import { exportDebugLogs } from "./logging";

const isMac = process.platform === "darwin";

export function createMenu(getMainWindow: () => BrowserWindow | null): void {
  if (!isMac) return;

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Settings…",
          accelerator: "Cmd+,",
          click: () => sendToRenderer(getMainWindow(), "open-settings"),
        },
        { type: "separator" },
        {
          label: "Export Debug Logs…",
          click: () => exportDebugLogs(),
        },
        {
          label: "Reload",
          accelerator: "Cmd+R",
          click: () => getMainWindow()?.reload(),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "New Session",
          accelerator: "Cmd+N",
          click: () => sendToRenderer(getMainWindow(), "new-session"),
        },
        {
          label: "Open Project…",
          accelerator: "Cmd+O",
          click: () => sendToRenderer(getMainWindow(), "open-project"),
        },
        { type: "separator" },
        {
          label: "New Window",
          accelerator: "Cmd+Shift+N",
          click: () => sendToRenderer(getMainWindow(), "new-window"),
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { type: "separator" },
        {
          label: "Toggle Sidebar",
          accelerator: "Cmd+B",
          click: () => sendToRenderer(getMainWindow(), "toggle-sidebar"),
        },
        {
          label: "Toggle Right Panel",
          accelerator: "Cmd+J",
          click: () => sendToRenderer(getMainWindow(), "toggle-right-panel"),
        },
      ],
    },
    {
      label: "Go",
      submenu: [
        {
          label: "Previous Session",
          accelerator: "Cmd+[",
          click: () => sendToRenderer(getMainWindow(), "prev-session"),
        },
        {
          label: "Next Session",
          accelerator: "Cmd+]",
          click: () => sendToRenderer(getMainWindow(), "next-session"),
        },
        { type: "separator" },
        {
          label: "Previous Project",
          accelerator: "Cmd+Shift+[",
          click: () => sendToRenderer(getMainWindow(), "prev-project"),
        },
        {
          label: "Next Project",
          accelerator: "Cmd+Shift+]",
          click: () => sendToRenderer(getMainWindow(), "next-project"),
        },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Pi Web Documentation",
          click: () => shell.openExternal("https://github.com/earendil-works/pi-coding-agent"),
        },
        {
          label: "Report Issue",
          click: () =>
            shell.openExternal("https://github.com/earendil-works/pi-coding-agent/issues"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendToRenderer(win: BrowserWindow | null, command: string): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send("menu-command", command);
  }
}
