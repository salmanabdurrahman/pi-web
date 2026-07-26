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
    // Self-contained Next.js server from `next build` with output: "standalone"
    { from: "../.next/standalone", to: "standalone" },
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
