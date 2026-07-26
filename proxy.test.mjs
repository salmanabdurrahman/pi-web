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

test("desktop mode requires auth token before allowing API requests", () => {
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
