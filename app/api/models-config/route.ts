import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { invalidateModelsCache } from "@/lib/models-cache";
import { redactValue } from "@/lib/secret-redaction";
import { auditLog } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

function getModelsPath(): string {
  return join(getAgentDir(), "models.json");
}

function readModelsJson(): Record<string, unknown> {
  const path = getModelsPath();
  if (!existsSync(path)) return { providers: {} };
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return { providers: {} };
  }
}

function writeModelsJson(data: Record<string, unknown>): void {
  const path = getModelsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

/** Validate that a models.json body has the expected top-level shape.
 *  Unknown fields are preserved — only structural requirements are checked. */
function validateModelsShape(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return "body must be a JSON object";
  }
  const obj = body as Record<string, unknown>;
  if (obj.providers !== undefined && (typeof obj.providers !== "object" || obj.providers === null || Array.isArray(obj.providers))) {
    return "providers must be an object if present";
  }
  // Validate each provider entry has a reasonable structure
  if (obj.providers && typeof obj.providers === "object") {
    const providers = obj.providers as Record<string, unknown>;
    for (const [name, entry] of Object.entries(providers)) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        return `providers.${name} must be an object`;
      }
      const p = entry as Record<string, unknown>;
      // Every provider must have either baseUrl or models
      if (p.models !== undefined && !Array.isArray(p.models)) {
        return `providers.${name}.models must be an array if present`;
      }
    }
  }
  if (obj.defaultProvider !== undefined && typeof obj.defaultProvider !== "string") {
    return "defaultProvider must be a string if present";
  }
  if (obj.defaultModel !== undefined && typeof obj.defaultModel !== "string") {
    return "defaultModel must be a string if present";
  }
  return null;
}

export async function GET() {
  const raw = readModelsJson();
  // Redact secret values before returning to client.
  const safe = redactValue("models", raw);
  return NextResponse.json(safe);
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const validationError = validateModelsShape(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    writeModelsJson(body);
    invalidateModelsCache();
    auditLog("config.write", { path: getModelsPath() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
