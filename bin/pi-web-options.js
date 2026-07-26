"use strict";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseArgs } = require("util");

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isEnabled(value) {
  return typeof value === "string" && TRUE_VALUES.has(value.trim().toLowerCase());
}

function isLoopbackHostname(hostname) {
  if (!hostname) return true;
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function parseLaunchOptions(args = process.argv.slice(2), env = process.env) {
  const { values: cliArgs } = parseArgs({
    args,
    options: {
      port: { type: "string", short: "p" },
      hostname: { type: "string", short: "H" },
      "auth-token": { type: "string" },
      "no-open": { type: "boolean" },
    },
    strict: false,
  });

  const hostname = cliArgs.hostname ?? env.HOSTNAME ?? null;
  const authToken =
    cliArgs["auth-token"] ?? env.PI_WEB_AUTH_TOKEN ?? env.PI_DESKTOP_AUTH_TOKEN ?? null;

  if (!isLoopbackHostname(hostname) && !authToken) {
    throw new Error(
      `Binding Pi Web to non-loopback host ${hostname} requires --auth-token or PI_WEB_AUTH_TOKEN`,
    );
  }

  return {
    port: cliArgs.port ?? env.PORT ?? "30141",
    hostname,
    authToken,
    openBrowser: !cliArgs["no-open"] && !isEnabled(env.PI_WEB_NO_OPEN),
  };
}

module.exports = { parseLaunchOptions, isLoopbackHostname };
