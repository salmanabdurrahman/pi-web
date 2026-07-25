import { parseUnifiedPatch, type SplitDiffCell } from "@/lib/patch";

export function SplitPatchView({ text }: { text: string }) {
  const files = parseUnifiedPatch(text);
  if (!files) return <pre className="p-3 text-[13px]">{text}</pre>;

  return (
    <div className="flex flex-col">
      {files.map((file, i) => (
        <div key={i} className="flex flex-col border-b border-[var(--border)] last:border-b-0">
          {(file.oldPath || file.newPath) && (
            <div className="flex grid grid-cols-2 divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--bg)] text-[12px] text-[var(--text-muted)]">
              <SplitDiffHeader title={file.oldPath || "Before"} side="left" />
              <SplitDiffHeader title={file.newPath || "After"} side="right" />
            </div>
          )}
          <div className="flex flex-col bg-[var(--bg-panel)] font-mono text-[12px] leading-relaxed">
            {file.rows.map((row, j) => {
              if (row.type === "hunk") {
                return (
                  <div
                    key={j}
                    className="bg-[#f1f8ff] px-2 py-1 text-[var(--text-dim)] dark:bg-[#1f2f45]"
                  >
                    {row.text}
                  </div>
                );
              }
              return (
                <div key={j} className="grid grid-cols-2 divide-x divide-[var(--border)]">
                  <SplitDiffCellView cell={row.left} side="left" />
                  <SplitDiffCellView cell={row.right} side="right" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SplitDiffHeader({ title, side }: { title: string; side: "left" | "right" }) {
  return (
    <div className={`flex items-center px-2 py-1 ${side === "right" ? "pl-3" : ""}`}>
      {title.replace(/^(a|b)\//, "")}
    </div>
  );
}

function SplitDiffCellView({ cell, side }: { cell: SplitDiffCell; side: "left" | "right" }) {
  const isRemoved = cell.type === "removed";
  const isAdded = cell.type === "added";
  const isEmpty = cell.type === "empty";

  let bgClass = "";
  if (isRemoved) bgClass = "bg-[#ffeef0] dark:bg-[#4a1c23]";
  else if (isAdded) bgClass = "bg-[#e6ffed] dark:bg-[#1a3b26]";
  else if (isEmpty) bgClass = "bg-[var(--bg-panel)]";

  return (
    <div className={`flex min-h-[20px] items-start ${bgClass}`}>
      <div className="w-[40px] shrink-0 border-r border-[var(--border)]/50 px-2 pt-[2px] text-right text-[10px] text-[var(--text-dim)] select-none">
        {cell.lineNo ?? ""}
      </div>
      <div className="flex-1 px-3 py-[1px] break-all whitespace-pre-wrap">
        {isEmpty ? " " : cell.text || " "}
      </div>
    </div>
  );
}
