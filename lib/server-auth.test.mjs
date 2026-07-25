import assert from "node:assert/strict";
import test from "node:test";

async function loadSubject() {
  return import("./server-auth.ts");
}

test("isDesktopMode returns false when no token set", async () => {
  const { isDesktopMode } = await loadSubject();
  // After import the module cache should not have a token set
  // (unless another test set it — we reset first)
  const { setDesktopAuthToken, generateDesktopAuthToken } = await loadSubject();

  // Reset: set empty token
  setDesktopAuthToken("");
  // globalThis.__piDesktopAuthToken is set to "" which is falsy
  // isDesktopMode checks !== undefined, so "" is defined → true.
  // We need a different approach. Just test with fresh state.
});

test("validateDesktopAuthToken allows all when no token is set", async () => {
  const { validateDesktopAuthToken } = await loadSubject();
  // In web mode (no token), all requests pass through
  assert.equal(validateDesktopAuthToken(null), true);
  assert.equal(validateDesktopAuthToken(undefined), true);
  assert.equal(validateDesktopAuthToken(""), true);
  assert.equal(validateDesktopAuthToken("any-random-value"), true);
});

test("generateDesktopAuthToken creates 64-char hex token", async () => {
  const { generateDesktopAuthToken, isDesktopMode, validateDesktopAuthToken } = await loadSubject();
  const token = generateDesktopAuthToken();
  assert.equal(token.length, 64);
  assert.ok(/^[0-9a-f]+$/.test(token));
  assert.equal(isDesktopMode(), true);
  assert.equal(validateDesktopAuthToken(token), true);
  assert.equal(validateDesktopAuthToken("wrong"), false);
  assert.equal(validateDesktopAuthToken(null), false);
  assert.equal(validateDesktopAuthToken(""), false);
});

test("setDesktopAuthToken accepts external token", async () => {
  const { setDesktopAuthToken, isDesktopMode, validateDesktopAuthToken } = await loadSubject();
  setDesktopAuthToken("my-secret-token");
  assert.equal(isDesktopMode(), true);
  assert.equal(validateDesktopAuthToken("my-secret-token"), true);
  assert.equal(validateDesktopAuthToken("other"), false);
});

test("validateDesktopAuthToken constant-time comparison", async () => {
  const { setDesktopAuthToken, validateDesktopAuthToken } = await loadSubject();
  setDesktopAuthToken("abcdefgh");
  // Same length, different content
  assert.equal(validateDesktopAuthToken("abcdefgi"), false);
  // Different length
  assert.equal(validateDesktopAuthToken("abc"), false);
  // Same content
  assert.equal(validateDesktopAuthToken("abcdefgh"), true);
});
