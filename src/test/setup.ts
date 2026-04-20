import "@testing-library/jest-dom";
import "fake-indexeddb/auto";

// jsdom doesn't ship a WebCrypto subtle that supports AES-GCM/PBKDF2 natively
// in all environments — fall back to Node's native webcrypto.
import { webcrypto } from "node:crypto";
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  // @ts-expect-error - assigning node webcrypto to global
  globalThis.crypto = webcrypto;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
