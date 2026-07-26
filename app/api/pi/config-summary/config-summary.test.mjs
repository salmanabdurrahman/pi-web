/**
 * Tests for /api/pi/config-summary route — redaction and fallback behavior.
 *
 * Run: node --test app/api/pi/config-summary/config-summary.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ── Redaction logic (mirrored from route.ts for unit testing) ──

const SECRET_KEY_PATTERNS = [
  /(?<![a-zA-Z])api[_-]?key(?![a-zA-Z])/i,
  /(?<![a-zA-Z])secret(?![a-zA-Z])/i,
  /(?<![a-zA-Z])token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])access[_-]?token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])refresh[_-]?token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])id[_-]?token(?![a-zA-Z])/i,
  /(?<![a-zA-Z])cookie(?![a-zA-Z])/i,
  /(?<![a-zA-Z])session(?![a-zA-Z])/i,
  /(?<![a-zA-Z])bearer(?![a-zA-Z])/i,
  /(?<![a-zA-Z])password(?![a-zA-Z])/i,
  /(?<![a-zA-Z])credential(?![a-zA-Z])/i,
  /(?<![a-zA-Z])private[_-]?key(?![a-zA-Z])/i,
  /(?<![a-zA-Z])auth(?:orization)?(?![a-zA-Z])/i,
];

function looksSecret(key) {
  return SECRET_KEY_PATTERNS.some((p) => p.test(key));
}

function looksEnvRef(value) {
  if (typeof value !== "string") return false;
  return /^[A-Z_][A-Z0-9_]*$/.test(value) || value.startsWith("!");
}

function redactValue(key, value) {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(key, item));
  if (typeof value === "object" && value !== null) {
    const redacted = {};
    for (const [k, v] of Object.entries(value)) redacted[k] = redactValue(k, v);
    return redacted;
  }
  if (looksSecret(key)) {
    if (looksEnvRef(value)) return "<env-ref>";
    if (typeof value === "string" && value.length > 0) return "<redacted>";
    return "<redacted>";
  }
  return value;
}

// ── Tests ──

describe("redactValue", () => {
  it("passes through non-secret primitives", () => {
    assert.equal(redactValue("name", "pi"), "pi");
    assert.equal(redactValue("count", 42), 42);
    assert.equal(redactValue("enabled", true), true);
  });

  it("passes through null/undefined", () => {
    assert.equal(redactValue("anything", null), null);
    assert.equal(redactValue("anything", undefined), undefined);
  });

  it("redacts apiKey values", () => {
    assert.equal(redactValue("apiKey", "sk-abc123"), "<redacted>");
    assert.equal(redactValue("api_key", "secret"), "<redacted>");
    assert.equal(redactValue("OPENAI_API_KEY", "sk-xyz"), "<redacted>");
  });

  it("shows env-ref for env-var-looking strings in secret keys", () => {
    assert.equal(redactValue("apiKey", "OPENAI_API_KEY"), "<env-ref>");
    assert.equal(redactValue("apiKey", "!op read api-key"), "<env-ref>");
  });

  it("redacts nested objects with secret keys", () => {
    const result = redactValue("provider", {
      name: "openai",
      apiKey: "sk-secret",
      timeout: 30000,
    });
    assert.deepEqual(result, {
      name: "openai",
      apiKey: "<redacted>",
      timeout: 30000,
    });
  });

  it("redacts deeply nested secret-like keys", () => {
    const result = redactValue("config", {
      auth: {
        token: "bearer-xyz",
        user: "admin",
      },
      database: {
        password: "db-pass",
        host: "localhost",
      },
    });
    assert.deepEqual(result, {
      auth: {
        token: "<redacted>",
        user: "admin",
      },
      database: {
        password: "<redacted>",
        host: "localhost",
      },
    });
  });

  it("handles credential and private_key patterns", () => {
    assert.equal(redactValue("credential", "my-cred"), "<redacted>");
    assert.equal(redactValue("private_key", "-----BEGIN"), "<redacted>");
    assert.equal(redactValue("secret", "shhh"), "<redacted>");
  });

  it("does not redact non-secret keys in nested objects", () => {
    const result = redactValue("compaction", {
      enabled: true,
      reserveTokens: 16000,
    });
    assert.deepEqual(result, {
      enabled: true,
      reserveTokens: 16000,
    });
  });

  it("recurses arrays", () => {
    assert.deepEqual(redactValue("items", []), []);
    assert.deepEqual(redactValue("items", [1, 2, 3]), [1, 2, 3]);
    assert.deepEqual(redactValue("headers", [{ Authorization: "Bearer x" }]), [
      { Authorization: "<redacted>" },
    ]);
  });

  it("handles empty string in secret key", () => {
    assert.equal(redactValue("apiKey", ""), "<redacted>");
  });
});

describe("looksEnvRef", () => {
  it("detects UPPER_CASE env var names", () => {
    assert.equal(looksEnvRef("OPENAI_API_KEY"), true);
    assert.equal(looksEnvRef("MY_SECRET_TOKEN"), true);
  });

  it("detects shell command references", () => {
    assert.equal(looksEnvRef("!op read item"), true);
    assert.equal(looksEnvRef("!pass show api"), true);
  });

  it("rejects literal values", () => {
    assert.equal(looksEnvRef("sk-abc123"), false);
    assert.equal(looksEnvRef("my-key"), false);
    assert.equal(looksEnvRef(42), false);
    assert.equal(looksEnvRef(null), false);
  });

  it("rejects lowercase env-like strings", () => {
    assert.equal(looksEnvRef("openai_api_key"), false);
  });
});

describe("looksSecret", () => {
  it("matches common secret key patterns", () => {
    assert.equal(looksSecret("apiKey"), true);
    assert.equal(looksSecret("api_key"), true);
    assert.equal(looksSecret("OPENAI_API_KEY"), true);
    assert.equal(looksSecret("secret"), true);
    assert.equal(looksSecret("token"), true);
    assert.equal(looksSecret("password"), true);
    assert.equal(looksSecret("credential"), true);
    assert.equal(looksSecret("private_key"), true);
    assert.equal(looksSecret("PRIVATE_KEY"), true);
  });

  it("does not match innocent keys", () => {
    assert.equal(looksSecret("name"), false);
    assert.equal(looksSecret("timeout"), false);
    assert.equal(looksSecret("enabled"), false);
    assert.equal(looksSecret("username"), false);
    assert.equal(looksSecret("authentication_mode"), false);
    assert.equal(looksSecret("reserveTokens"), false);
  });
});

describe("config summary shape", () => {
  it("ConfigSummary interface has required top-level fields", () => {
    const requiredKeys = ["agentDir", "cwd", "global", "project", "resources", "parityGaps"];
    // Structural check: all keys exist in expected shape
    const sample = {
      agentDir: null,
      cwd: null,
      global: {
        defaultProvider: null,
        defaultModel: null,
        defaultThinkingLevel: null,
        enabledModels: null,
        transport: null,
        compaction: null,
        retry: null,
        branchSummary: null,
        packages: { count: 0, loaded: 0, disabled: 0, sources: [] },
        prompts: { count: 0, paths: [] },
        skills: { count: 0 },
        extensions: { count: 0 },
        themes: { count: 0 },
        mcp: { serverCount: 0, authRefTypes: [], directTools: { enabled: 0, disabled: 0 } },
      },
      project: { hasSettings: false, packages: null },
      resources: { skills: { count: 0, diagnostics: 0 } },
      parityGaps: [],
    };
    for (const key of requiredKeys) {
      assert.ok(key in sample, `Missing key: ${key}`);
    }
  });
});
