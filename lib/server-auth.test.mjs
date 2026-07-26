import assert from "node:assert/strict";
import test from "node:test";

async function loadSubject() {
  return import(`./server-auth.ts?test=${Date.now()}-${Math.random()}`);
}

test("validateDesktopAuthToken allows all when no token is set", async () => {
  delete globalThis.__piDesktopAuthToken;
  const { validateDesktopAuthToken, isDesktopMode } = await loadSubject();
  assert.equal(isDesktopMode(), false);
  assert.equal(validateDesktopAuthToken(null), true);
  assert.equal(validateDesktopAuthToken("any-random-value"), true);
});

test("generateDesktopAuthToken creates 64-char hex token", async () => {
  delete globalThis.__piDesktopAuthToken;
  const { generateDesktopAuthToken, isDesktopMode, validateDesktopAuthToken } = await loadSubject();
  const token = generateDesktopAuthToken();
  assert.equal(token.length, 64);
  assert.match(token, /^[0-9a-f]+$/);
  assert.equal(isDesktopMode(), true);
  assert.equal(validateDesktopAuthToken(token), true);
  assert.equal(validateDesktopAuthToken("wrong"), false);
  assert.equal(validateDesktopAuthToken(null), false);
});

test("setDesktopAuthToken accepts external token", async () => {
  delete globalThis.__piDesktopAuthToken;
  const { setDesktopAuthToken, isDesktopMode, validateDesktopAuthToken } = await loadSubject();
  setDesktopAuthToken("my-secret-token");
  assert.equal(isDesktopMode(), true);
  assert.equal(validateDesktopAuthToken("my-secret-token"), true);
  assert.equal(validateDesktopAuthToken("other"), false);
});

test("setDesktopAuthToken ignores empty tokens", async () => {
  delete globalThis.__piDesktopAuthToken;
  const { setDesktopAuthToken, isDesktopMode, validateDesktopAuthToken } = await loadSubject();
  setDesktopAuthToken("");
  assert.equal(isDesktopMode(), false);
  assert.equal(validateDesktopAuthToken(null), true);
});

test("validateDesktopAuthToken constant-time comparison", async () => {
  delete globalThis.__piDesktopAuthToken;
  const { setDesktopAuthToken, validateDesktopAuthToken } = await loadSubject();
  setDesktopAuthToken("abcdefgh");
  assert.equal(validateDesktopAuthToken("abcdefgi"), false);
  assert.equal(validateDesktopAuthToken("abc"), false);
  assert.equal(validateDesktopAuthToken("abcdefgh"), true);
});
