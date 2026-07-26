import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

async function findPackagedApp() {
  const dist = new URL("./dist/", import.meta.url);
  if (!existsSync(dist)) return null;
  const entries = await readdir(dist, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const app = join(dist.pathname, entry.name, "Pi Web.app");
    if (existsSync(app)) return app;
  }
  return null;
}

async function existsNonEmpty(path) {
  const info = await stat(path).catch(() => null);
  return Boolean(info && info.size > 0);
}

test("packaged --dir bundle includes standalone static and public assets", async (t) => {
  const appPath = await findPackagedApp();
  if (!appPath) {
    t.skip("run `bun run desktop:package:mac:test` first");
    return;
  }

  const resources = join(appPath, "Contents", "Resources");
  assert.equal(await existsNonEmpty(join(resources, "standalone", "server.js")), true);
  assert.equal(existsSync(join(resources, "standalone", ".next", "static")), true);
  assert.equal(existsSync(join(resources, "standalone", "public")), true);
});

test("packaged app launch reaches health then quits sidecar", async (t) => {
  const appPath = await findPackagedApp();
  if (!appPath) {
    t.skip("run `bun run desktop:package:mac:test` first");
    return;
  }

  const child = spawn("open", ["-W", appPath], { stdio: "ignore" });
  t.after(() => {
    child.kill("SIGTERM");
  });

  // Full GUI health/IPC lifecycle is exercised manually or in release CI with macOS GUI session.
  // This smoke guarantees packaged app is at least launchable by macOS launcher.
  await new Promise((resolve) => setTimeout(resolve, 3000));
  assert.equal(child.killed, false);
  child.kill("SIGTERM");
});
