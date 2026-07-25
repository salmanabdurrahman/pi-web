import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// We can't directly import Next.js route handlers in a plain Node test,
// but we can test the shared libs they depend on.
// This test validates the redaction behavior via the shared lib.

async function loadRedaction() {
  return import("../../../lib/secret-redaction.ts");
}

test("models-config redaction: redacts apiKey in providers", async () => {
  const { redactValue } = await loadRedaction();
  const modelsConfig = {
    providers: {
      openai: {
        name: "OpenAI",
        baseUrl: "https://api.openai.com",
        apiKey: "sk-abc123secret",
        models: [{ id: "gpt-5", name: "GPT-5" }],
      },
      anthropic: {
        name: "Anthropic",
        secret: "my-anthropic-secret",
        apiKey: "ANTHROPIC_API_KEY",
        models: [{ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" }],
      },
    },
    defaultProvider: "openai",
    defaultModel: "gpt-5",
  };

  const safe = redactValue("root", modelsConfig);

  // Verify structure preserved
  assert.equal(safe.defaultProvider, "openai");
  assert.equal(safe.defaultModel, "gpt-5");

  // OpenAI: apiKey should be redacted, baseUrl and name preserved
  assert.equal(safe.providers.openai.name, "OpenAI");
  assert.equal(safe.providers.openai.baseUrl, "https://api.openai.com");
  assert.equal(safe.providers.openai.apiKey, "<redacted>");
  assert.deepEqual(safe.providers.openai.models, [{ id: "gpt-5", name: "GPT-5" }]);

  // Anthropic: secret redacted, apiKey shows env-ref
  assert.equal(safe.providers.anthropic.name, "Anthropic");
  assert.equal(safe.providers.anthropic.secret, "<redacted>");
  assert.equal(safe.providers.anthropic.apiKey, "<env-ref>");
  assert.deepEqual(safe.providers.anthropic.models, [
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
  ]);
});

test("models-config redaction: passes through providers without secrets unchanged", async () => {
  const { redactValue } = await loadRedaction();
  const modelsConfig = {
    providers: {
      cleanProvider: {
        name: "Clean",
        baseUrl: "https://clean.example.com",
        models: [{ id: "model-1" }],
      },
    },
  };

  const safe = redactValue("root", modelsConfig);
  assert.deepEqual(safe, modelsConfig);
});

test("models-config redaction: handles empty providers", async () => {
  const { redactValue } = await loadRedaction();
  assert.deepEqual(redactValue("root", { providers: {} }), { providers: {} });
  assert.deepEqual(redactValue("root", {}), {});
});
