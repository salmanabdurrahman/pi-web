import type { OnBeforeSendHeadersListenerDetails } from "electron";

let sidecarOrigin = "";

export function setSidecarOrigin(origin: string): void {
  sidecarOrigin = new URL(origin).origin;
}

export function getSidecarOrigin(): string {
  return sidecarOrigin;
}

export function isSidecarUrl(value: string): boolean {
  if (!sidecarOrigin) return false;
  try {
    return new URL(value).origin === sidecarOrigin;
  } catch {
    return false;
  }
}

export function isSidecarApiUrl(value: string): boolean {
  if (!isSidecarUrl(value)) return false;
  try {
    return new URL(value).pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

export function shouldAttachDesktopAuthHeader(
  details: Pick<OnBeforeSendHeadersListenerDetails, "url">,
): boolean {
  return isSidecarApiUrl(details.url);
}

export function isAllowedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
