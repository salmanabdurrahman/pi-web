import assert from "node:assert/strict";
import test from "node:test";

async function loadSubject() {
  return import("./audit-log.ts");
}

function interceptStderr(t) {
  const chunks = [];
  const original = process.stderr.write;
  const fake = (chunk) => {
    chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
    return true;
  };
  process.stderr.write = fake;
  t.after(() => {
    process.stderr.write = original;
  });
  return chunks;
}

test("auditLog writes JSON line to stderr", async (t) => {
  const { auditLog } = await loadSubject();
  const chunks = interceptStderr(t);

  auditLog("config.write", { path: "/tmp/models.json" });

  assert.ok(chunks.length === 1, "expected one write to stderr");
  const entry = JSON.parse(chunks[0]);
  assert.equal(entry.action, "config.write");
  assert.equal(entry.meta.path, "/tmp/models.json");
  assert.ok(typeof entry.ts === "string");
  assert.ok(Date.parse(entry.ts) > 0);
});

test("auditLog accepts empty meta", async (t) => {
  const { auditLog } = await loadSubject();
  const chunks = interceptStderr(t);

  auditLog("session.delete", {});

  const entry = JSON.parse(chunks[0]);
  assert.equal(entry.action, "session.delete");
  assert.deepEqual(entry.meta, {});
});

test("all audit action types emit correctly", async (t) => {
  const { auditLog } = await loadSubject();
  const actions = [
    "config.write",
    "auth.key.store",
    "auth.key.delete",
    "auth.oauth.login",
    "auth.oauth.logout",
    "plugin.install",
    "plugin.remove",
    "plugin.update",
    "plugin.disable",
    "plugin.enable",
    "skill.install",
    "skill.toggle",
    "worktree.create",
    "worktree.remove",
    "file.upload",
    "session.rename",
    "session.delete",
    "session.create",
  ];

  for (const action of actions) {
    const chunks = [];
    const original = process.stderr.write;
    process.stderr.write = (chunk) => {
      chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    };
    auditLog(action);
    process.stderr.write = original;

    const entry = JSON.parse(chunks[0]);
    assert.equal(entry.action, action, "action " + action + " should be emitted");
  }
});
