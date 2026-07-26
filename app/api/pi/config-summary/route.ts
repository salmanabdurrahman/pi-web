import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import {
  DefaultResourceLoader,
  getAgentDir,
  SettingsManager,
  type PackageSource,
} from "@earendil-works/pi-coding-agent";
import { redactValue } from "@/lib/secret-redaction";
import { getAllowedFileRoots, isExistingFilePathAllowed } from "@/lib/file-access";

export const dynamic = "force-dynamic";

// ── Local type mirrors from SDK (not re-exported in public API) ──

interface SettingsLike {
  piStatus?: unknown;
  transport?: string;
  theme?: string;
  defaultProjectTrust?: string;
  enableInstallTelemetry?: boolean;
  enableAnalytics?: boolean;
  lastChangelogVersion?: string;
  steeringMode?: string;
  followUpMode?: string;
}

interface CompactionSettingsLike {
  enabled?: boolean;
  reserveTokens?: number;
  keepRecentTokens?: number;
}

interface RetrySettingsLike {
  enabled?: boolean;
  maxRetries?: number;
  baseDelayMs?: number;
  provider?: {
    timeoutMs?: number;
    maxRetries?: number;
    maxRetryDelayMs?: number;
  };
}

interface BranchSummarySettingsLike {
  reserveTokens?: number;
  skipPrompt?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function packageSourceToString(pkg: PackageSource): string {
  return typeof pkg === "string" ? pkg : pkg.source;
}

interface McpSummary {
  serverCount: number;
  authRefTypes: string[];
  directTools: { enabled: number; disabled: number };
}

function summarizeMcpConfig(agentDir: string): McpSummary {
  const empty = { serverCount: 0, authRefTypes: [], directTools: { enabled: 0, disabled: 0 } };
  const path = join(agentDir, "mcp.json");
  if (!existsSync(path)) return empty;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const serversValue = raw.servers ?? raw.mcpServers ?? raw;
    if (typeof serversValue !== "object" || serversValue === null || Array.isArray(serversValue)) {
      return empty;
    }
    const authTypes = new Set<string>();
    let directEnabled = 0;
    let directDisabled = 0;
    for (const server of Object.values(serversValue as Record<string, unknown>)) {
      if (typeof server !== "object" || server === null || Array.isArray(server)) continue;
      const s = server as Record<string, unknown>;
      if (s.directTools === true) directEnabled += 1;
      if (s.directTools === false) directDisabled += 1;
      const env = s.env;
      if (typeof env === "object" && env !== null && !Array.isArray(env)) authTypes.add("env");
      if (s.auth !== undefined || s.authRef !== undefined) authTypes.add("auth-ref");
      if (s.headers !== undefined) authTypes.add("headers");
      if (s.oauth !== undefined) authTypes.add("oauth");
    }
    return {
      serverCount: Object.keys(serversValue as Record<string, unknown>).length,
      authRefTypes: Array.from(authTypes).sort(),
      directTools: { enabled: directEnabled, disabled: directDisabled },
    };
  } catch {
    return empty;
  }
}

function isDisabledPackage(pkg: PackageSource): boolean {
  if (typeof pkg === "string") return false;
  return (
    Array.isArray(pkg.extensions) &&
    pkg.extensions.length === 0 &&
    Array.isArray(pkg.skills) &&
    pkg.skills.length === 0 &&
    Array.isArray(pkg.prompts) &&
    pkg.prompts.length === 0 &&
    Array.isArray(pkg.themes) &&
    pkg.themes.length === 0
  );
}

// ── Parity gap detection ─────────────────────────────────────────────────────

interface ParityGap {
  field: string;
  message: string;
  severity: "info" | "warning";
}

function detectParityGaps(globalSettings: SettingsLike): ParityGap[] {
  const gaps: ParityGap[] = [];

  if ((globalSettings as any).piStatus !== undefined && (globalSettings as any).piStatus !== null) {
    gaps.push({
      field: "piStatus",
      message: "piStatus is configured but Pi Web has its own status bar; this field is ignored.",
      severity: "info",
    });
  }

  if (typeof globalSettings.transport === "string") {
    gaps.push({
      field: "transport",
      message: `Transport is set to "${globalSettings.transport}" but Pi Web always uses in-process SDK.`,
      severity: "info",
    });
  }

  if (globalSettings.theme) {
    gaps.push({
      field: "theme",
      message: "Pi Web manages its own theme separately from this setting.",
      severity: "info",
    });
  }

  if (globalSettings.defaultProjectTrust) {
    gaps.push({
      field: "defaultProjectTrust",
      message: "Project trust is managed through Pi Web file access allow-list.",
      severity: "info",
    });
  }

  if (globalSettings.enableInstallTelemetry !== undefined) {
    gaps.push({
      field: "enableInstallTelemetry",
      message: "Install telemetry is CLI-only; not applicable to Pi Web.",
      severity: "info",
    });
  }

  if (globalSettings.enableAnalytics !== undefined) {
    gaps.push({
      field: "enableAnalytics",
      message: "Analytics are CLI-only; not applicable to Pi Web.",
      severity: "info",
    });
  }

  if (globalSettings.lastChangelogVersion) {
    gaps.push({
      field: "lastChangelogVersion",
      message: "Changelog tracking is CLI-only.",
      severity: "info",
    });
  }

  if (globalSettings.steeringMode) {
    gaps.push({
      field: "steeringMode",
      message: `Steering mode "${globalSettings.steeringMode}" — Pi Web UI has its own steer/follow-up queue controls.`,
      severity: "info",
    });
  }

  if (globalSettings.followUpMode) {
    gaps.push({
      field: "followUpMode",
      message: `Follow-up mode "${globalSettings.followUpMode}" — Pi Web UI has its own steer/follow-up queue controls.`,
      severity: "info",
    });
  }

  return gaps;
}

// ── Main endpoint ────────────────────────────────────────────────────────────

export interface ConfigSummary {
  agentDir: string | null;
  cwd: string | null;
  global: {
    defaultProvider: string | null;
    defaultModel: string | null;
    defaultThinkingLevel: string | null;
    enabledModels: string[] | null;
    transport: string | null;
    piStatus: unknown;
    compaction: CompactionSettingsLike | null;
    retry: RetrySettingsLike | null;
    branchSummary: BranchSummarySettingsLike | null;
    packages: { count: number; loaded: number; disabled: number; sources: string[] };
    prompts: { count: number; paths: string[] };
    skills: { count: number };
    extensions: { count: number };
    themes: { count: number };
    mcp: McpSummary;
  };
  project: {
    hasSettings: boolean;
    packages: { count: number } | null;
  };
  resources: {
    skills: { count: number; diagnostics: number };
  };
  parityGaps: ParityGap[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestedCwd = searchParams.get("cwd") || process.cwd();
  const includeDetails = searchParams.get("details") === "1";

  if (!existsSync(requestedCwd)) {
    return NextResponse.json({ error: "CWD not found" }, { status: 404 });
  }

  const allowedRoots = await getAllowedFileRoots();
  if (!isExistingFilePathAllowed(requestedCwd, allowedRoots)) {
    return NextResponse.json({ error: "CWD is outside allowed roots" }, { status: 403 });
  }

  try {
    const agentDir = getAgentDir();
    const settingsManager = SettingsManager.create(requestedCwd, agentDir);
    const globalSettings = settingsManager.getGlobalSettings();
    const projectSettings = settingsManager.getProjectSettings();

    // ── Global settings (redacted) ──
    const globalDefaultProvider = globalSettings.defaultProvider ?? null;
    const globalDefaultModel = globalSettings.defaultModel ?? null;
    const globalDefaultThinkingLevel = globalSettings.defaultThinkingLevel ?? null;
    const globalEnabledModels = globalSettings.enabledModels ?? null;
    const globalTransport = globalSettings.transport ?? null;
    const globalPiStatus = (globalSettings as any).piStatus ?? null;

    const globalCompaction = globalSettings.compaction
      ? (redactValue("compaction", globalSettings.compaction) as CompactionSettingsLike)
      : null;
    const globalRetry = globalSettings.retry
      ? (redactValue("retry", globalSettings.retry) as RetrySettingsLike)
      : null;
    const globalBranchSummary = globalSettings.branchSummary
      ? (redactValue("branchSummary", globalSettings.branchSummary) as BranchSummarySettingsLike)
      : null;

    // Packages
    const globalPackages = globalSettings.packages ?? [];
    const loadedPkgs = globalPackages.filter((p) => !isDisabledPackage(p));
    const disabledPkgs = globalPackages.filter((p) => isDisabledPackage(p));
    const packageSources = globalPackages.map(packageSourceToString);

    // Prompts
    const globalPrompts = globalSettings.prompts ?? [];

    // Raw paths
    const globalExtensions = globalSettings.extensions ?? [];
    const globalSkills = globalSettings.skills ?? [];
    const globalThemes = globalSettings.themes ?? [];

    const globalMcp = summarizeMcpConfig(agentDir);

    // ── Project overrides ──
    const projectHasSettings = Object.keys(projectSettings).length > 0;
    const projectPackages = projectSettings.packages ?? [];

    // ── Resource loader ──
    let resourceSkillsCount = 0;
    let resourceDiagnosticsCount = 0;
    try {
      const loader = new DefaultResourceLoader({ cwd: requestedCwd, agentDir });
      await loader.reload();
      const { skills } = loader.getSkills();
      resourceSkillsCount = skills.length;
    } catch {
      // Resource loading may fail if cwd is invalid — skip gracefully
    }

    // ── Parity gaps ──
    const parityGaps = detectParityGaps(globalSettings as unknown as SettingsLike);

    const summary: ConfigSummary = {
      agentDir: includeDetails ? agentDir : null,
      cwd: includeDetails ? requestedCwd : null,
      global: {
        defaultProvider: globalDefaultProvider,
        defaultModel: globalDefaultModel,
        defaultThinkingLevel: globalDefaultThinkingLevel,
        enabledModels: globalEnabledModels,
        transport: globalTransport,
        piStatus: globalPiStatus,
        compaction: globalCompaction,
        retry: globalRetry,
        branchSummary: globalBranchSummary,
        packages: {
          count: globalPackages.length,
          loaded: loadedPkgs.length,
          disabled: disabledPkgs.length,
          sources: includeDetails ? packageSources : [],
        },
        prompts: {
          count: globalPrompts.length,
          paths: includeDetails ? globalPrompts : [],
        },
        skills: { count: globalSkills.length },
        extensions: { count: globalExtensions.length },
        themes: { count: globalThemes.length },
        mcp: globalMcp,
      },
      project: {
        hasSettings: projectHasSettings,
        packages: projectHasSettings ? { count: projectPackages.length } : null,
      },
      resources: {
        skills: { count: resourceSkillsCount, diagnostics: resourceDiagnosticsCount },
      },
      parityGaps,
    };

    return NextResponse.json(summary);
  } catch (error) {
    // Fallback: return minimal config from raw settings file
    try {
      const agentDir = getAgentDir();
      const settingsManager = SettingsManager.create(requestedCwd, agentDir);
      const global = settingsManager.getGlobalSettings();

      return NextResponse.json({
        agentDir: includeDetails ? agentDir : null,
        cwd: includeDetails ? requestedCwd : null,
        global: {
          defaultProvider: global.defaultProvider ?? null,
          defaultModel: global.defaultModel ?? null,
          defaultThinkingLevel: global.defaultThinkingLevel ?? null,
          enabledModels: global.enabledModels ?? null,
          transport: global.transport ?? null,
          piStatus: (global as any).piStatus ?? null,
          compaction: global.compaction ? redactValue("compaction", global.compaction) : null,
          retry: global.retry ? redactValue("retry", global.retry) : null,
          branchSummary: global.branchSummary
            ? redactValue("branchSummary", global.branchSummary)
            : null,
          packages: {
            count: (global.packages ?? []).length,
            loaded: 0,
            disabled: 0,
            sources: includeDetails ? (global.packages ?? []).map(packageSourceToString) : [],
          },
          prompts: {
            count: (global.prompts ?? []).length,
            paths: includeDetails ? (global.prompts ?? []) : [],
          },
          skills: { count: (global.skills ?? []).length },
          extensions: { count: (global.extensions ?? []).length },
          themes: { count: (global.themes ?? []).length },
          mcp: summarizeMcpConfig(agentDir),
        },
        project: { hasSettings: false, packages: null },
        resources: { skills: { count: 0, diagnostics: 0 } },
        parityGaps: [],
        _fallback: true,
        _error: "Config summary fallback used",
      });
    } catch (fallbackError) {
      return NextResponse.json(
        {
          error: "Failed to load config",
          detail: "Config summary unavailable",
        },
        { status: 500 },
      );
    }
  }
}
