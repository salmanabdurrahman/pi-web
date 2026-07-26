import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GET /api/health returns ok status with runtime diagnostics", async () => {
  const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  assert.match(source, /status.*ok/);
  assert.match(source, /sdkVersion/);
  assert.match(source, /agentDir/);
  assert.match(source, /resourceLoader/);
  assert.match(source, /activeSessionCount/);
  assert.match(source, /runningSessionIds/);
  assert.match(source, /runningSessionCount/);
  assert.match(source, /desktopMode/);
});

test("GET /api/health reads SDK version from package.json", async () => {
  const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  assert.match(source, /getSdkVersion/);
  assert.match(source, /@earendil-works\/pi-coding-agent\/package\.json/);
});

test("GET /api/health gets agent dir safely", async () => {
  const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  assert.match(source, /getAgentDir/);
  assert.match(source, /try\s*\{/);
});

test("GET /api/health includes session counts from RPC manager", async () => {
  const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  assert.match(source, /getRunningRpcSessionIds/);
  assert.match(source, /getRpcSessionCount/);
});

test("GET /api/health checks desktop token presence", async () => {
  const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  assert.match(source, /__piDesktopAuthToken/);
});

test("GET /api/health uses DefaultResourceLoader with cwd and agentDir", async () => {
  const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  assert.match(source, /new DefaultResourceLoader\(\{/);
  assert.match(source, /cwd:/);
  assert.match(source, /agentDir/);
});
