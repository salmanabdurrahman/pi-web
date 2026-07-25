import { useEffect, useState } from "react";
import { GitStatusResponse, GitFileStatus } from "@/lib/git-types";
import { parseUnifiedPatch, SplitDiffCell } from "@/lib/patch";

interface ReviewPanelProps {
  onMentionFile?: (filePath: string) => void;
  cwd: string;
}

export function ReviewPanel({ cwd, onMentionFile }: ReviewPanelProps) {
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [activeFile, setActiveFile] = useState<GitFileStatus | null>(null);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch(`/api/git/status?cwd=${encodeURIComponent(cwd)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStatus(data);
      })
      .catch((err) => setError(err.message));
  }, [cwd]);

  useEffect(() => {
    if (!activeFile) {
      setDiffText(null);
      return;
    }
    fetch(
      `/api/git/diff?cwd=${encodeURIComponent(cwd)}&path=${encodeURIComponent(activeFile.filePath)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setDiffText(`Error: ${data.error}`);
        else if (data.patch) setDiffText(data.patch);
        else setDiffText("No text diff available.");
      })
      .catch((err) => setDiffText(`Error: ${err.message}`));
  }, [activeFile, cwd]);

  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!status) return <div className="p-4 text-[var(--text-dim)]">Loading status...</div>;

  if (!status.isGitRepository) {
    return <div className="p-4 text-[var(--text-dim)]">Not a git repository.</div>;
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[var(--bg)] text-[13px] text-[var(--text)]">
      {/* Sidebar: File list */}
      <div className="flex min-h-0 w-[280px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-panel)]">
        <div className="border-b border-[var(--border)] px-3 py-2 font-medium">Changes</div>
        <div className="border-b border-[var(--border)] px-2 py-2">
          <input
            type="text"
            placeholder="Filter files..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {status.files.filter((f) => f.filePath.toLowerCase().includes(filter.toLowerCase()))
            .length === 0 ? (
            <div className="px-3 py-2 text-[var(--text-dim)]">No changes.</div>
          ) : (
            status.files
              .filter((f) => f.filePath.toLowerCase().includes(filter.toLowerCase()))
              .map((f) => (
                <div
                  key={f.filePath}
                  onClick={() => setActiveFile(f)}
                  className={`flex cursor-pointer items-center justify-between px-3 py-1 hover:bg-[var(--bg-hover)] ${activeFile?.filePath === f.filePath ? "bg-[var(--bg-selected)]" : ""}`}
                >
                  <span className="truncate">
                    {f.filePath.replace(status.repositoryRoot + "/", "")}
                  </span>
                  <span
                    className={`ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold ${getStatusColor(f.code)}`}
                  >
                    {f.code}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Main: Diff view */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeFile ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)] px-4 py-2 font-medium">
              <span className="truncate">{activeFile.filePath}</span>
              {onMentionFile && (
                <button
                  onClick={() =>
                    onMentionFile(activeFile.filePath.replace(status.repositoryRoot + "/", ""))
                  }
                  className="ml-4 rounded bg-[var(--bg-hover)] px-2 py-1 text-[11px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
                >
                  @ Mention
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {diffText ? (
                <ReviewDiffViewer text={diffText} />
              ) : (
                <div className="p-4 text-[var(--text-dim)]">Loading diff...</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[var(--text-dim)]">
            Select a file to review changes
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusColor(code: string) {
  switch (code) {
    case "M":
      return "text-blue-500 bg-blue-500/10";
    case "A":
      return "text-green-500 bg-green-500/10";
    case "D":
      return "text-red-500 bg-red-500/10";
    case "U":
      return "text-green-500 bg-green-500/10"; // untracked
    default:
      return "text-gray-500 bg-gray-500/10";
  }
}

// Lightweight diff viewer for ReviewPanel
function ReviewDiffViewer({ text }: { text: string }) {
  const files = parseUnifiedPatch(text);
  if (!files) return <pre className="p-4 text-[12px]">{text}</pre>;

  return (
    <div className="flex flex-col bg-[var(--bg)]">
      {files.map((file, i) => (
        <div key={i} className="flex flex-col font-mono text-[12px] leading-relaxed">
          {file.rows.map((row, j) => {
            if (row.type === "hunk") {
              return (
                <div
                  key={j}
                  className="border-y border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 text-[var(--text-dim)]"
                >
                  {row.text}
                </div>
              );
            }
            return (
              <div key={j} className="grid grid-cols-2 divide-x divide-[var(--border)]">
                <CellView cell={row.left} side="left" />
                <CellView cell={row.right} side="right" />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CellView({ cell, side }: { cell: SplitDiffCell; side: "left" | "right" }) {
  const bg =
    cell.type === "added"
      ? "bg-green-500/10 text-green-900 dark:text-green-200"
      : cell.type === "removed"
        ? "bg-red-500/10 text-red-900 dark:text-red-200"
        : cell.type === "empty"
          ? "bg-[var(--bg-panel)]"
          : "text-[var(--text)]";

  return (
    <div
      className={`flex min-h-[20px] ${bg} ${side === "left" ? "border-r border-[var(--border)]" : ""}`}
    >
      <div className="w-[40px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-panel)] px-2 py-[2px] text-right text-[var(--text-dim)] select-none">
        {cell.lineNo ?? ""}
      </div>
      <div className="flex-1 px-3 py-[2px] break-all whitespace-pre-wrap">
        {cell.type === "empty" ? " " : cell.text || " "}
      </div>
    </div>
  );
}
