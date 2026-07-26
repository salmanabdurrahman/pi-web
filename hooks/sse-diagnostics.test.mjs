import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("useAgentSession tracks SSE connection states", async () => {
  const source = await readFile(new URL("../hooks/useAgentSession.ts", import.meta.url), "utf8");
  // Should track all SSE states
  assert.match(source, /sseStatus/);
  assert.match(source, /lastEventTimestamp/);
  assert.match(source, /sseReconnectReason/);
  // Should set SSE status on connection events
  assert.match(source, /setSseStatus\("connected"\)/);
  assert.match(source, /setSseStatus\("reconnecting"\)/);
  assert.match(source, /setSseStatus\("disconnected"\)/);
  assert.match(source, /setSseStatus\("connecting"\)/);
});

test("useAgentSession tracks last event timestamp", async () => {
  const source = await readFile(new URL("../hooks/useAgentSession.ts", import.meta.url), "utf8");
  assert.match(source, /setLastEventTimestamp\(new Date\(\)\)/);
});

test("useAgentSession tracks reconciliation reasons", async () => {
  const source = await readFile(new URL("../hooks/useAgentSession.ts", import.meta.url), "utf8");
  assert.match(source, /reconciliationCountRef\.current \+= 1/);
  // Should pass reconciliation reasons
  assert.match(source, /"tab visible"/);
  assert.match(source, /"periodic check"/);
  assert.match(source, /"online restored"/);
});

test("useAgentSession exposes SSE diagnostics in return value", async () => {
  const source = await readFile(new URL("../hooks/useAgentSession.ts", import.meta.url), "utf8");
  const returnSection = source.slice(source.indexOf("return {"));
  assert.match(returnSection, /sseStatus,/);
  assert.match(returnSection, /lastEventTimestamp,/);
  assert.match(returnSection, /sseReconnectReason,/);
});

test("SSE fatal close triggers reconnect with reason", async () => {
  const source = await readFile(new URL("../hooks/useAgentSession.ts", import.meta.url), "utf8");
  assert.match(source, /"fatal close, retrying"/);
  assert.match(source, /"stream closed by server"/);
  assert.match(source, /"network interruption"/);
});
