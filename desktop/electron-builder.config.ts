import type { Configuration } from "electron-builder";

const APP_ID = "com.agegr.pi-web";

const config: Configuration = {
  appId: APP_ID,
  productName: "Pi Web",
  artifactName: "pi-web-desktop-${os}-${arch}.${ext}",
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  files: ["out/**/*", "resources/**/*"],
  extraResources: [
    // Self-contained Next.js server from `next build` with output: "standalone".
    // Static/public assets must sit beside the standalone server for offline packaged runs.
    { from: "../.next/standalone", to: "standalone" },
    { from: "../.next/static", to: "standalone/.next/static" },
    { from: "../public", to: "standalone/public", filter: ["**/*"] },
  ],
  mac: {
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
    category: "Development",
    target: ["AppImage"],
  },
};

export default config;
