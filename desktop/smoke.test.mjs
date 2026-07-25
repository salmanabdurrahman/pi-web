import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("desktop main process exports app lifecycle", async () => {
  const source = await readFile(
    new URL("../desktop/src/main/index.ts", import.meta.url),
    "utf8",
  );
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
  const source = await readFile(
    new URL("../desktop/src/main/server.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /port/);
});

test("desktop server generates per-launch auth token", async () => {
  const source = await readFile(
    new URL("../desktop/src/main/server.ts", import.meta.url),
    "utf8",
  );
  // Should set auth token via environment variable
  assert.match(source, /PI_DESKTOP_AUTH_TOKEN/);
});

test("desktop menu includes essential items", async () => {
  const source = await readFile(
    new URL("../desktop/src/main/menu.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /Settings/);
  assert.match(source, /role.*quit/);
  assert.match(source, /New Session/);
});

test("desktop logging has write functions", async () => {
  const source = await readFile(
    new URL("../desktop/src/main/logging.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /writeLog/);
  assert.match(source, /initLogging/);
});
