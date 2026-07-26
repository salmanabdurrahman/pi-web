import { strict as assert } from "node:assert";
import test from "node:test";
import {
  isAllowedExternalUrl,
  isSidecarApiUrl,
  isSidecarUrl,
  setSidecarOrigin,
  shouldAttachDesktopAuthHeader,
} from "./security";

test("desktop auth header attaches only to sidecar API URLs", () => {
  setSidecarOrigin("http://127.0.0.1:3456");
  assert.equal(shouldAttachDesktopAuthHeader({ url: "http://127.0.0.1:3456/api/health" }), true);
  assert.equal(shouldAttachDesktopAuthHeader({ url: "http://127.0.0.1:3456/" }), false);
  assert.equal(shouldAttachDesktopAuthHeader({ url: "http://127.0.0.1:3457/api/health" }), false);
  assert.equal(shouldAttachDesktopAuthHeader({ url: "https://example.com/api/health" }), false);
});

test("sidecar URL helpers enforce current origin", () => {
  setSidecarOrigin("http://127.0.0.1:3456/app");
  assert.equal(isSidecarUrl("http://127.0.0.1:3456/session"), true);
  assert.equal(isSidecarApiUrl("http://127.0.0.1:3456/api/files/x"), true);
  assert.equal(isSidecarApiUrl("http://127.0.0.1:3456/files/x"), false);
  assert.equal(isSidecarUrl("not a url"), false);
});

test("external URL allow-list permits only http and https", () => {
  assert.equal(isAllowedExternalUrl("https://example.com"), true);
  assert.equal(isAllowedExternalUrl("http://example.com"), true);
  assert.equal(isAllowedExternalUrl("file:///tmp/a"), false);
  assert.equal(isAllowedExternalUrl("javascript:alert(1)"), false);
});
