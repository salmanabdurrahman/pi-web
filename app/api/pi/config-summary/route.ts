import { NextResponse } from "next/server";
import {
  DefaultResourceLoader,
  getAgentDir,
  SettingsManager,
  type PackageSource,
} from "@earendil-works/pi-coding-agent";
import { looksEnvRef, looksSecret, redactValue } from "@/lib/secret-redaction";

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

  if (globalSettings.piStatus !== undefined && globalSettings.piStatus !== null) {
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
  agentDir: string;
  cwd: string;
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
    const globalPiStatus = globalSettings.piStatus ?? null;

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
      agentDir,
      cwd: requestedCwd,
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
          sources: packageSources,
        },
        prompts: {
          count: globalPrompts.length,
          paths: globalPrompts,
        },
        skills: { count: globalSkills.length },
        extensions: { count: globalExtensions.length },
        themes: { count: globalThemes.length },
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
        agentDir,
        cwd: requestedCwd,
        global: {
          defaultProvider: global.defaultProvider ?? null,
          defaultModel: global.defaultModel ?? null,
          defaultThinkingLevel: global.defaultThinkingLevel ?? null,
          enabledModels: global.enabledModels ?? null,
          transport: global.transport ?? null,
          piStatus: global.piStatus ?? null,
          compaction: global.compaction ? redactValue("compaction", global.compaction) : null,
          retry: global.retry ? redactValue("retry", global.retry) : null,
          branchSummary: global.branchSummary
            ? redactValue("branchSummary", global.branchSummary)
            : null,
          packages: {
            count: (global.packages ?? []).length,
            loaded: 0,
            disabled: 0,
            sources: (global.packages ?? []).map(packageSourceToString),
          },
          prompts: { count: (global.prompts ?? []).length, paths: global.prompts ?? [] },
          skills: { count: (global.skills ?? []).length },
          extensions: { count: (global.extensions ?? []).length },
          themes: { count: (global.themes ?? []).length },
        },
        project: { hasSettings: false, packages: null },
        resources: { skills: { count: 0, diagnostics: 0 } },
        parityGaps: [],
        _fallback: true,
        _error: error instanceof Error ? error.message : String(error),
      });
    } catch (fallbackError) {
      return NextResponse.json(
        {
          error: "Failed to load config",
          detail: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  }
}
