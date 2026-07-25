// Default custom UI terminal columns. The ExtensionCustomPanel in ChatWindow
// renders at min(920px, 100%). With ~9px per monospace char at 12px font,
// 100 columns fills ~900px. Future: pass viewport width from client.
export const DEFAULT_CUSTOM_UI_COLUMNS = 100;
export const DEFAULT_CUSTOM_UI_ROWS = 40;

export interface HeadlessCustomUiTerminal {
  readonly columns: number;
  readonly rows: number;
  readonly kittyProtocolActive: false;
}

export interface HeadlessCustomUiTui {
  readonly terminal: HeadlessCustomUiTerminal;
  requestRender(force?: boolean): void;
}

export function createHeadlessCustomUiTui(
  requestRender: (force?: boolean) => void,
  columns = DEFAULT_CUSTOM_UI_COLUMNS,
  rows = DEFAULT_CUSTOM_UI_ROWS,
): HeadlessCustomUiTui {
  const terminal = Object.freeze({
    columns,
    rows,
    kittyProtocolActive: false as const,
  });

  return Object.freeze({ terminal, requestRender });
}
