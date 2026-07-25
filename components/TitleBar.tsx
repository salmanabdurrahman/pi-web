"use client";

import { useEffect, useState } from "react";
import type { SessionStatsInfo } from "@/lib/pi-types";

interface TitleBarProps {
  sessionStats: SessionStatsInfo | null;
  contextUsage?: { contextWindow: number } | null;
  isRunning?: boolean;
}

export function TitleBar({ sessionStats, contextUsage, isRunning }: TitleBarProps) {
  const [piVersion, setPiVersion] = useState<string>("...");
  const [appVersion] = useState<string>("0.8.0");
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(typeof window !== "undefined" && !!(window as any).piDesktop);
    fetch("/api/pi/config-summary")
      .then((r) => r.json())
      .then((d) => {
        if (d.version) setPiVersion(d.version);
      })
      .catch((e) => console.error(e));
  }, []);

  const formatCompact = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
        ? `${(n / 1000).toFixed(0)}k`
        : String(n);

  const tokens = sessionStats?.tokens?.total ? formatCompact(sessionStats.tokens.total) : null;
  const ctxLimit =
    (contextUsage?.contextWindow ?? sessionStats?.contextUsage?.contextWindow)
      ? formatCompact(contextUsage?.contextWindow ?? sessionStats?.contextUsage?.contextWindow ?? 0)
      : null;
  const cost = sessionStats?.cost ? `$${sessionStats.cost.toFixed(4)}` : null;

  return (
    <div
      className="flex h-[38px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)] px-3 font-[family-name:var(--font-mono)] text-[12px] text-[var(--text-muted)] select-none"
      style={
        {
          paddingLeft: isDesktop ? 80 : 12,
          WebkitAppRegion: "drag",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-[14px]">
        <span className="font-semibold text-[var(--text)]">Pi Web</span>
        <span className="opacity-70">v{appVersion}</span>
        {piVersion !== "..." && <span className="opacity-70">Pi {piVersion}</span>}
      </div>

      <div className="flex items-center gap-[20px]">
        {isRunning && (
          <span className="flex items-center gap-[6px] font-semibold text-[var(--accent)]">
            <span className="inline-block h-[6px] w-[6px] rounded-full bg-current" />
            Running
          </span>
        )}

        {tokens && ctxLimit && (
          <span title="Tokens / Context limit" className="flex gap-[4px]">
            <span>{tokens}</span>
            <span className="opacity-40">/</span>
            <span>{ctxLimit}</span>
          </span>
        )}

        {cost && (
          <span title="Total session cost" className="font-medium text-[var(--text)]">
            {cost}
          </span>
        )}
      </div>
    </div>
  );
}
