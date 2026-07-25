import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ErrorBoundary exports a class component", async () => {
  const source = await readFile(
    new URL("../components/ErrorBoundary.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /export class ErrorBoundary/);
  assert.match(source, /extends Component/);
  assert.match(source, /componentDidCatch/);
  assert.match(source, /getDerivedStateFromError/);
});

test("ErrorBoundary fallback includes crash report export button", async () => {
  const source = await readFile(
    new URL("../components/ErrorBoundary.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /Export crash report/);
  assert.match(source, /handleExport/);
  assert.match(source, /pi-web-crash-/);
  assert.match(source, /Reload app/);
});

test("ErrorBoundary fallback does not leak sensitive data", async () => {
  const source = await readFile(
    new URL("../components/ErrorBoundary.tsx", import.meta.url),
    "utf8",
  );
  // The crash report should only export error details, browser info, and URL
  assert.match(source, /navigator\.userAgent/);
  assert.match(source, /window\.location\.href/);
  assert.match(source, /error\.name/);
  assert.match(source, /error\.message/);
  assert.match(source, /error\.stack/);
  // Must NOT export messages, secrets, or session data
  assert.doesNotMatch(source, /api[Kk]ey/i);
  assert.doesNotMatch(source, /token/i);
  assert.doesNotMatch(source, /secret/i);
  assert.doesNotMatch(source, /password/i);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
});
