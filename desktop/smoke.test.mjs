import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const { redactLogText, redactManifestValue } = await import("./src/main/log-redaction.ts");

test("desktop main process exports app lifecycle", async () => {
  const source = await readFile(new URL("../desktop/src/main/index.ts", import.meta.url), "utf8");
  assert.match(source, /app\.whenReady/);
  assert.match(source, /BrowserWindow/);
  assert.match(source, /createMainWindow/);
});

test("desktop preload exposes window.piDesktop", async () => {
  const source = await readFile(
    new URL("../desktop/src/preload/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /contextBridge/);
  assert.match(source, /selectDirectory|select-directory/);
});

test("desktop server spawns on loopback port", async () => {
  const source = await readFile(new URL("../desktop/src/main/server.ts", import.meta.url), "utf8");
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /port/);
});

test("desktop server generates per-launch auth token", async () => {
  const source = await readFile(new URL("../desktop/src/main/server.ts", import.meta.url), "utf8");
  // Should set auth token via environment variable
  assert.match(source, /PI_DESKTOP_AUTH_TOKEN/);
});

test("desktop menu includes essential items", async () => {
  const source = await readFile(new URL("../desktop/src/main/menu.ts", import.meta.url), "utf8");
  assert.match(source, /Settings/);
  assert.match(source, /role.*quit/);
  assert.match(source, /New Session/);
});

test("desktop logging exports redacted logs with sharing warning", async () => {
  const source = await readFile(new URL("../desktop/src/main/logging.ts", import.meta.url), "utf8");
  assert.match(source, /writeLog/);
  assert.match(source, /initLogging/);
  assert.match(source, /redactLogText/);
  assert.match(source, /README\.txt/);
  assert.match(source, /local paths, session names, project names/);
});

test("desktop log redaction removes auth headers, tokens, cookies, provider keys, oauth codes, private keys", () => {
  const redacted = redactLogText(`
Authorization: Bearer secret-token-value-1234567890
X-Pi-Desktop-Auth: 0123456789abcdef0123456789abcdef
Cookie: session=abc123; other=value
apiKey=sk-test-secret-value-1234567890
refresh_token=raw-refresh-token-value
OAuth_Code: local-code-secret-value
-----BEGIN PRIVATE KEY-----
abc123
-----END PRIVATE KEY-----
`);
  assert.doesNotMatch(
    redacted,
    /secret-token-value|0123456789abcdef|session=abc123|sk-test-secret|raw-refresh|local-code-secret|abc123/,
  );
  assert.match(redacted, /<redacted>|<redacted-private-key>/);
});

test("desktop manifest redaction recurses arrays and objects", () => {
  const redacted = redactManifestValue({
    headers: [{ authorization: "Bearer token-secret-value-1234567890" }],
    nested: { cookie: "sid=secret" },
  });
  assert.deepEqual(redacted, {
    headers: [{ authorization: "<redacted>" }],
    nested: { cookie: "<redacted>" },
  });
});

test("electron-builder includes standalone static and public assets", async () => {
  const source = await readFile(
    new URL("../desktop/electron-builder.config.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /\.next\/standalone/);
  assert.match(source, /\.next\/static/);
  assert.match(source, /standalone\/\.next\/static/);
  assert.match(source, /\.\.\/public/);
  assert.match(source, /standalone\/public/);
});
