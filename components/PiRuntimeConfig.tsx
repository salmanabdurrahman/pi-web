"use client";

import { useState, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParityGap {
  field: string;
  message: string;
  severity: "info" | "warning";
}

interface ConfigSummary {
  agentDir: string | null;
  cwd: string | null;
  global: {
    defaultProvider: string | null;
    defaultModel: string | null;
    defaultThinkingLevel: string | null;
    enabledModels: string[] | null;
    transport: string | null;
    piStatus: unknown;
    compaction: {
      enabled?: boolean;
      reserveTokens?: number;
      keepRecentTokens?: number;
    } | null;
    retry: {
      enabled?: boolean;
      maxRetries?: number;
      baseDelayMs?: number;
      provider?: {
        timeoutMs?: number;
        maxRetries?: number;
        maxRetryDelayMs?: number;
      };
    } | null;
    branchSummary: {
      reserveTokens?: number;
      skipPrompt?: boolean;
    } | null;
    packages: { count: number; loaded: number; disabled: number; sources: string[] };
    prompts: { count: number; paths: string[] };
    skills: { count: number };
    extensions: { count: number };
    themes: { count: number };
    mcp: {
      serverCount: number;
      authRefTypes: string[];
      directTools: { enabled: number; disabled: number };
    };
  };
  project: {
    hasSettings: boolean;
    packages: { count: number } | null;
  };
  resources: {
    skills: { count: number; diagnostics: number };
  };
  parityGaps: ParityGap[];
  _fallback?: boolean;
  _error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortenPath(p: string): string {
  return p.replace(/^\/(?:Users|home)\/[^/]+/, "~");
}

function formatTokens(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
}

function formatMs(ms: number | undefined): string {
  if (ms === undefined) return "—";
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

// ── Section component ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        padding: "4px 0",
        borderBottom: "1px solid rgba(128,128,128,0.08)",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-dim)", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 12,
          color: muted ? "var(--text-dim)" : "var(--text)",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Badge({
  children,
  color,
  bgColor,
}: {
  children: React.ReactNode;
  color?: string;
  bgColor?: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 600,
        color: color ?? "var(--text-muted)",
        background: bgColor ?? "var(--bg-panel)",
        border: `1px solid ${color ?? "var(--border)"}`,
      }}
    >
      {children}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PiRuntimeConfig({ cwd, onClose }: { cwd: string; onClose: () => void }) {
  const isMobile = useIsMobile();
  const [data, setData] = useState<ConfigSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams({ cwd });
      if (showDetails) qs.set("details", "1");
      const res = await fetch(`/api/pi/config-summary?${qs.toString()}`);
      const d = (await res.json()) as ConfigSummary & { error?: string; detail?: string };
      if (!res.ok || d.error) throw new Error(d.error ?? d.detail ?? `HTTP ${res.status}`);
      setData(d);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cwd, showDetails]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Invalidate caches then reload
    try {
      await fetch("/api/pi/config-refresh", { method: "POST" }).catch(() => {});
    } catch {
      /* ignore */
    }
    await load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        Loading Pi runtime config…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#ef4444", fontSize: 13 }}>
        Failed to load: {error}
      </div>
    );
  }

  if (!data) return null;

  const g = data.global;
  const p = data.project;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: isMobile ? "calc(100vw - 16px)" : 760,
          maxWidth: "calc(100vw - 16px)",
          height: isMobile ? "calc(100dvh - 16px)" : "78vh",
          maxHeight: "calc(100dvh - 16px)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Pi Runtime</span>
            <code
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                maxWidth: 280,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {shortenPath(cwd)}
            </code>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {/* Agent Dir */}
          <Section title="Agent Directory">
            <Row
              label="Agent dir"
              value={data.agentDir ? shortenPath(data.agentDir) : "Hidden by default"}
              mono
            />
            <Row label="CWD" value={data.cwd ? shortenPath(data.cwd) : "Hidden by default"} mono />
            <Row
              label="Details"
              value={
                <button
                  onClick={() => setShowDetails((v) => !v)}
                  style={{
                    padding: "2px 8px",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  {showDetails ? "Hide paths" : "Show local paths"}
                </button>
              }
            />
            {data._fallback && (
              <Row
                label="Status"
                value={
                  <Badge color="#d97706" bgColor="rgba(217,119,6,0.1)">
                    Fallback — {data._error}
                  </Badge>
                }
              />
            )}
          </Section>

          {/* Default Model & Provider */}
          <Section title="Default Model">
            <Row
              label="Provider"
              value={g.defaultProvider || "—"}
              muted={!g.defaultProvider}
              mono
            />
            <Row label="Model" value={g.defaultModel || "—"} muted={!g.defaultModel} mono />
            <Row
              label="Thinking level"
              value={g.defaultThinkingLevel || "—"}
              muted={!g.defaultThinkingLevel}
              mono
            />
            {g.enabledModels && g.enabledModels.length > 0 && (
              <Row
                label="Enabled models"
                value={
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 2,
                    }}
                  >
                    {g.enabledModels.map((m: string) => (
                      <code key={m} style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {m}
                      </code>
                    ))}
                  </div>
                }
              />
            )}
          </Section>

          {/* Runtime */}
          <Section title="Runtime">
            <Row label="Transport" value={g.transport || "auto"} mono />
            {g.piStatus ? (
              <Row
                label="piStatus"
                value={
                  <Badge color="#6366f1" bgColor="rgba(99,102,241,0.12)">
                    Configured
                  </Badge>
                }
              />
            ) : (
              <Row
                label="piStatus"
                value={<span style={{ color: "var(--text-dim)" }}>Not configured</span>}
              />
            )}
          </Section>

          {/* Compaction */}
          <Section title="Compaction">
            {g.compaction ? (
              <>
                <Row
                  label="Enabled"
                  value={
                    <Badge
                      color={g.compaction.enabled ? "#16a34a" : "var(--text-dim)"}
                      bgColor={g.compaction.enabled ? "rgba(22,163,74,0.1)" : undefined}
                    >
                      {g.compaction.enabled ? "Yes" : "No"}
                    </Badge>
                  }
                />
                <Row label="Reserve tokens" value={formatTokens(g.compaction.reserveTokens)} mono />
                <Row
                  label="Keep recent tokens"
                  value={formatTokens(g.compaction.keepRecentTokens)}
                  mono
                />
              </>
            ) : (
              <Row
                label="Status"
                value={<span style={{ color: "var(--text-dim)" }}>Not configured</span>}
              />
            )}
          </Section>

          {/* Retry */}
          <Section title="Retry">
            {g.retry ? (
              <>
                <Row
                  label="Enabled"
                  value={
                    <Badge
                      color={g.retry.enabled ? "#16a34a" : "var(--text-dim)"}
                      bgColor={g.retry.enabled ? "rgba(22,163,74,0.1)" : undefined}
                    >
                      {g.retry.enabled ? "Yes" : "No"}
                    </Badge>
                  }
                />
                <Row label="Max retries" value={g.retry.maxRetries ?? "—"} mono />
                <Row label="Base delay" value={formatMs(g.retry.baseDelayMs)} mono />
                {g.retry.provider && (
                  <>
                    <Row
                      label="Provider timeout"
                      value={formatMs(g.retry.provider.timeoutMs)}
                      mono
                    />
                    <Row
                      label="Provider max retries"
                      value={g.retry.provider.maxRetries ?? "—"}
                      mono
                    />
                  </>
                )}
              </>
            ) : (
              <Row
                label="Status"
                value={<span style={{ color: "var(--text-dim)" }}>Not configured</span>}
              />
            )}
          </Section>

          {/* Branch Summary */}
          <Section title="Branch Summary">
            {g.branchSummary ? (
              <>
                <Row
                  label="Reserve tokens"
                  value={formatTokens(g.branchSummary.reserveTokens)}
                  mono
                />
                <Row
                  label="Skip prompt"
                  value={
                    <Badge color={g.branchSummary.skipPrompt ? "#d97706" : "var(--text-dim)"}>
                      {g.branchSummary.skipPrompt ? "Yes" : "No"}
                    </Badge>
                  }
                />
              </>
            ) : (
              <Row
                label="Status"
                value={<span style={{ color: "var(--text-dim)" }}>Not configured</span>}
              />
            )}
          </Section>

          {/* Packages */}
          <Section title="Packages">
            <Row label="Total" value={g.packages.count} mono />
            <Row
              label="Loaded"
              value={
                <Badge color="#16a34a" bgColor="rgba(22,163,74,0.1)">
                  {g.packages.loaded}
                </Badge>
              }
            />
            <Row
              label="Disabled"
              value={
                g.packages.disabled > 0 ? (
                  <Badge color="#d97706" bgColor="rgba(217,119,6,0.1)">
                    {g.packages.disabled}
                  </Badge>
                ) : (
                  "0"
                )
              }
            />
            {g.packages.sources.length > 0 && (
              <Row
                label="Sources"
                value={
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 2,
                      maxHeight: 120,
                      overflowY: "auto",
                    }}
                  >
                    {g.packages.sources.map((s: string, i: number) => (
                      <code
                        key={i}
                        style={{ fontSize: 10, color: "var(--text-muted)", wordBreak: "break-all" }}
                      >
                        {s}
                      </code>
                    ))}
                  </div>
                }
              />
            )}
          </Section>

          {/* Prompts */}
          <Section title="Prompts">
            <Row label="Count" value={g.prompts.count} mono />
            {g.prompts.paths.length > 0 && (
              <Row
                label="Paths"
                value={
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 2,
                      maxHeight: 80,
                      overflowY: "auto",
                    }}
                  >
                    {g.prompts.paths.map((p: string, i: number) => (
                      <code key={i} style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {p}
                      </code>
                    ))}
                  </div>
                }
              />
            )}
          </Section>

          {/* Resource counts */}
          <Section title="Resources (configured counts)">
            <Row label="Skills" value={g.skills.count} mono />
            <Row label="Extensions" value={g.extensions.count} mono />
            <Row label="Themes" value={g.themes.count} mono />
          </Section>

          {/* MCP */}
          <Section title="MCP Config">
            <Row label="Servers" value={g.mcp.serverCount} mono />
            <Row
              label="Auth refs"
              value={g.mcp.authRefTypes.length ? g.mcp.authRefTypes.join(", ") : "None detected"}
              mono
            />
            <Row label="directTools enabled" value={g.mcp.directTools.enabled} mono />
          </Section>

          {/* Resolved resources */}
          <Section title="Resolved Resources">
            <Row label="Skills" value={data.resources.skills.count} mono />
            {data.resources.skills.diagnostics > 0 && (
              <Row
                label="Diagnostics"
                value={
                  <Badge color="#d97706" bgColor="rgba(217,119,6,0.1)">
                    {data.resources.skills.diagnostics}
                  </Badge>
                }
              />
            )}
          </Section>

          {/* Project overrides */}
          {p.hasSettings && (
            <Section title="Project Overrides (.pi/settings.json)">
              <Row
                label="Has project settings"
                value={
                  <Badge color="#6366f1" bgColor="rgba(99,102,241,0.12)">
                    Yes
                  </Badge>
                }
              />
              {p.packages && <Row label="Project packages" value={p.packages.count} mono />}
            </Section>
          )}

          {/* Parity gaps */}
          {data.parityGaps.length > 0 && (
            <Section title={`Parity Gaps (${data.parityGaps.length})`}>
              {data.parityGaps.map((gap: ParityGap) => (
                <div
                  key={gap.field}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: "1px solid rgba(128,128,128,0.08)",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      marginTop: 5,
                      background: gap.severity === "warning" ? "#d97706" : "#6366f1",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <code style={{ fontSize: 10, color: "var(--accent)" }}>{gap.field}</code>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                      {gap.message}
                    </div>
                  </div>
                </div>
              ))}
            </Section>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            borderTop: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: "6px 12px",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-muted)",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.5 : 1,
              fontSize: 12,
            }}
          >
            {refreshing ? "Refreshing…" : "Refresh config"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
