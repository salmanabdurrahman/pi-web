import assert from "node:assert/strict";
import test from "node:test";

const { proxy } = await import("./proxy.ts");
const { setDesktopAuthToken } = await import("./lib/server-auth.ts");

test("web mode rejects cross-origin API requests", () => {
  const res = proxy(
    new Request("http://127.0.0.1:30141/api/test", {
      headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
    }),
  );
  assert.equal(res.status, 403);
});

test("desktop mode requires auth token for non-browser API requests", () => {
  setDesktopAuthToken("test-token");

  const missingToken = proxy(new Request("http://127.0.0.1:30141/api/test"));
  assert.equal(missingToken.status, 401);

  const validTokenWithOriginMismatch = proxy(
    new Request("http://127.0.0.1:30141/api/test", {
      headers: {
        origin: "http://localhost:30141",
        "sec-fetch-site": "same-site",
        "x-pi-desktop-auth": "test-token",
      },
    }),
  );
  assert.equal(validTokenWithOriginMismatch.status, 200);
});

test("desktop mode allows same-origin browser API requests without auth header", () => {
  setDesktopAuthToken("test-token");

  const sameOrigin = proxy(
    new Request("http://127.0.0.1:30141/api/agent/session-id/events", {
      headers: {
        origin: "http://127.0.0.1:30141",
        "sec-fetch-site": "same-origin",
      },
    }),
  );
  assert.equal(sameOrigin.status, 200);
});

test("desktop mode rejects cross-site browser API requests without auth header", () => {
  setDesktopAuthToken("test-token");

  const crossSite = proxy(
    new Request("http://127.0.0.1:30141/api/agent/session-id/events", {
      headers: {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
    }),
  );
  assert.equal(crossSite.status, 401);
});
