import assert from "node:assert/strict";
import test from "node:test";

async function loadSubject() {
  return import("./secret-redaction.ts");
}

test("looksSecret matches apiKey / secret / token / password patterns", async () => {
  const { looksSecret } = await loadSubject();
  assert.equal(looksSecret("apiKey"), true);
  assert.equal(looksSecret("api_key"), true);
  assert.equal(looksSecret("secret"), true);
  assert.equal(looksSecret("token"), true);
  assert.equal(looksSecret("password"), true);
  assert.equal(looksSecret("credential"), true);
  assert.equal(looksSecret("privateKey"), true);
  assert.equal(looksSecret("private_key"), true);
  assert.equal(looksSecret("my_api_token"), true);
  assert.equal(looksSecret("api_key_123"), true);
});

test("looksSecret does NOT match normal keys", async () => {
  const { looksSecret } = await loadSubject();
  assert.equal(looksSecret("name"), false);
  assert.equal(looksSecret("provider"), false);
  assert.equal(looksSecret("modelId"), false);
  assert.equal(looksSecret("baseUrl"), false);
  assert.equal(looksSecret("displayName"), false);
});

test("looksEnvRef detects env-var references", async () => {
  const { looksEnvRef } = await loadSubject();
  assert.equal(looksEnvRef("OPENAI_API_KEY"), true);
  assert.equal(looksEnvRef("MY_SECRET_TOKEN"), true);
  assert.equal(looksEnvRef("!env OPENAI_KEY"), true);
  assert.equal(looksEnvRef("my-secret"), false);
  assert.equal(looksEnvRef(123), false);
  assert.equal(looksEnvRef(null), false);
});

test("redactValue redacts primitive secret values", async () => {
  const { redactValue } = await loadSubject();
  assert.equal(redactValue("apiKey", "sk-abc123"), "<redacted>");
  assert.equal(redactValue("secret", "mysecret"), "<redacted>");
  assert.equal(redactValue("token", "tok_123"), "<redacted>");
  assert.equal(redactValue("password", "hunter2"), "<redacted>");
  assert.equal(redactValue("credential", "xyz"), "<redacted>");
});

test("redactValue keeps env-ref placeholders", async () => {
  const { redactValue } = await loadSubject();
  assert.equal(redactValue("apiKey", "OPENAI_API_KEY"), "<env-ref>");
  assert.equal(redactValue("secret", "MY_SECRET"), "<env-ref>");
  assert.equal(redactValue("apiKey", "!env MY_KEY"), "<env-ref>");
});

test("redactValue does not redact non-secret keys", async () => {
  const { redactValue } = await loadSubject();
  assert.equal(redactValue("name", "my-provider"), "my-provider");
  assert.equal(redactValue("baseUrl", "https://api.example.com"), "https://api.example.com");
  assert.equal(redactValue("modelId", "claude-sonnet-4-6"), "claude-sonnet-4-6");
});

test("redactValue walks nested objects", async () => {
  const { redactValue } = await loadSubject();
  const input = {
    provider: {
      name: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-secret",
      headers: {
        Authorization: "Bearer tok",
        "X-Custom": "value",
      },
    },
    models: [{ id: "gpt-5", name: "GPT-5" }],
  };
  const result = redactValue("root", input);
  // Verify nested redaction preserved structure
  assert.equal(result.provider.name, "openai");
  assert.equal(result.provider.baseUrl, "https://api.openai.com");
  assert.equal(result.provider.apiKey, "<redacted>");
  assert.equal(result.provider.headers.Authorization, "<redacted>");
  assert.equal(result.provider.headers["X-Custom"], "value");
  assert.deepEqual(result.models, [{ id: "gpt-5", name: "GPT-5" }]);
});

test("redactValue handles null/undefined", async () => {
  const { redactValue } = await loadSubject();
  assert.equal(redactValue("apiKey", null), null);
  assert.equal(redactValue("apiKey", undefined), undefined);
  assert.equal(redactValue("name", null), null);
});

test("redactValue handles empty string secrets", async () => {
  const { redactValue } = await loadSubject();
  assert.equal(redactValue("apiKey", ""), "<redacted>");
});

test("redactValue does not mutate arrays", async () => {
  const { redactValue } = await loadSubject();
  const input = { keys: ["a", "b"] };
  const result = redactValue("root", input);
  assert.deepEqual(result.keys, ["a", "b"]);
});
