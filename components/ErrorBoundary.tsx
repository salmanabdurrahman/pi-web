"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Pi Web error boundary caught:", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, errorInfo }: { error: Error | null; errorInfo: ErrorInfo | null }) {
  const handleExport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : null,
      componentStack: errorInfo?.componentStack ?? null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      location: typeof window !== "undefined" ? window.location.href : null,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pi-web-crash-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: 32,
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-mono)",
        lineHeight: 1.5,
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--error)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Something went wrong</h2>
        </div>
        <p
          style={{
            margin: 0,
            marginBottom: 12,
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          An unexpected error occurred in the Pi Web interface.
        </p>
        {error && (
          <pre
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              overflow: "auto",
              maxHeight: 240,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--text-muted)",
            }}
          >
            {error.name}: {error.message}
          </pre>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 20px",
              border: "none",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--text-on-accent)",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Reload app
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: "8px 20px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--bg-panel)",
              color: "var(--text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Export crash report
          </button>
        </div>
        <p
          style={{
            marginTop: 24,
            color: "var(--text-dim)",
            fontSize: 11,
          }}
        >
          The crash report contains only error details, browser version, and page URL. No session
          data, API keys, or personal information is included.
        </p>
      </div>
    </div>
  );
}
