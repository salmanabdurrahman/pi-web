import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Configuration, FileSet } from "electron-builder";

const APP_ID = "com.agegr.pi-web";
const appRoot = join(import.meta.dirname, "..");

const extraResources: FileSet[] = [
  // Self-contained Next.js server from `next build` with output: "standalone".
  // Static/public assets must sit beside the standalone server for offline packaged runs.
  { from: "../.next/standalone", to: "standalone" },
  { from: "../.next/static", to: "standalone/.next/static" },
];

if (existsSync(join(appRoot, "public"))) {
  extraResources.push({ from: "../public", to: "standalone/public", filter: ["**/*"] });
}

const config: Configuration = {
  appId: APP_ID,
  productName: "Pi Web",
  artifactName: "pi-web-desktop-${os}-${arch}.${ext}",
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  files: ["out/**/*", "resources/**/*"],
  extraResources,
  publish: [],
  mac: {
    icon: "resources/icon.png",
    identity: null,
    category: "public.app-category.developer-tools",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.plist",
    entitlementsInherit: "resources/entitlements.plist",
    target: ["dmg", "zip"],
  },
  dmg: {
    sign: false,
  },
  linux: {
    icon: "resources/icon.png",
    category: "Development",
    target: ["AppImage"],
  },
};

export default config;
