import { registerSW } from "virtual:pwa-register";
import { canApplyUpdateNow } from "./updatePolicy";

// Registers the service worker that makes the app open offline (backlog B-01)
// and applies new versions at a safe moment. See updatePolicy.ts.
export function registerServiceWorker() {
  let updateWaiting = false;

  const applyIfSafe = () => {
    if (!updateWaiting) return;
    if (!canApplyUpdateNow({ visibility: document.visibilityState, pathname: location.pathname })) return;
    updateWaiting = false;
    // Activates the waiting worker and reloads this page once it controls it.
    void updateSW(true);
  };

  const updateSW = registerSW({
    onNeedRefresh() {
      updateWaiting = true;
      applyIfSafe();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // The browser only looks for a new version on navigation. An installed
      // app can stay open for weeks, so also look each time it comes back to
      // the foreground. Failing (offline) is fine: the current version stays.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine) {
          registration.update().catch(() => {});
        }
      });
    },
  });

  document.addEventListener("visibilitychange", applyIfSafe);
}
