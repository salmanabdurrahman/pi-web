import assert from "node:assert/strict";
import test from "node:test";
import { parseLaunchOptions, isLoopbackHostname } from "./pi-web-options.js";

test("defaults bind to framework default without auth requirement", () => {
  const opts = parseLaunchOptions([], {});
  assert.equal(opts.port, "30141");
  assert.equal(opts.hostname, null);
  assert.equal(opts.authToken, null);
});

test("non-loopback hostname requires explicit auth token", () => {
  assert.throws(
    () => parseLaunchOptions(["-H", "0.0.0.0"], {}),
    /requires --auth-token or PI_WEB_AUTH_TOKEN/,
  );
});

test("non-loopback hostname accepts explicit auth token", () => {
  const opts = parseLaunchOptions(["-H", "0.0.0.0", "--auth-token", "secret"], {});
  assert.equal(opts.hostname, "0.0.0.0");
  assert.equal(opts.authToken, "secret");
});

test("loopback hostname detection", () => {
  assert.equal(isLoopbackHostname(null), true);
  assert.equal(isLoopbackHostname("localhost"), true);
  assert.equal(isLoopbackHostname("127.0.0.1"), true);
  assert.equal(isLoopbackHostname("::1"), true);
  assert.equal(isLoopbackHostname("0.0.0.0"), false);
  assert.equal(isLoopbackHostname("192.168.1.5"), false);
});
