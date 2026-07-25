/// <reference types="electron-vite" />

declare namespace NodeJS {
  interface ProcessEnv {
    PI_DESKTOP_AUTH_TOKEN?: string;
    PI_WEB_NO_OPEN?: string;
    ELECTRON_IS_PACKAGED?: string;
  }
}
