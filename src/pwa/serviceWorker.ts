// Service worker registration and updates (backlog B-01).
//
// The service worker makes the app open with no network. A new version is
// downloaded in the background and then waits. This module decides when the
// waiting version takes over.
//
// Rule: a running app is never reloaded. A reload would throw away the vault
// key held in memory, unsaved input, and a panic activation whose cancel
// window is still a timer in the page. So the waiting version is activated
// only at app start, before anything is rendered, and only when this is the
// only open tab of the app, because activating replaces the service worker
// under every open tab. In every other case it keeps waiting and the browser
// activates it by its own rule, once all tabs of the app are closed.
//
// Nothing here listens for a change of controlling service worker, and the
// app does not use vite-plugin-pwa's register helper (which does, and
// reloads): the only reload is the one this tab asks for below.

/** Every tab holds this lock, shared, for as long as it lives. */
const TAB_LOCK = "amiready-app-tab";
/** Set in sessionStorage across the one reload an update is allowed to cause. */
const RELOAD_FLAG = "amiready-update-reload";
const REGISTRATION_TIMEOUT_MS = 2000;
// Measured in Chrome: asked within about 30 ms of the page starting, while the
// page it replaced is still being torn down, a waiting worker sometimes never
// activates. 300 ms was always enough. Only paid when an update is waiting.
const SETTLE_MS = 300;
const ACTIVATION_TIMEOUT_MS = 4000;
const RELOAD_TIMEOUT_MS = 5000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** True when this page load is the reload that followed an update. Reads once. */
function consumeReloadFlag(): boolean {
  try {
    const set = sessionStorage.getItem(RELOAD_FLAG) !== null;
    sessionStorage.removeItem(RELOAD_FLAG);
    return set;
  } catch {
    // No sessionStorage, so no loop guard: do not apply updates from the page.
    return true;
  }
}

/** Asks the waiting worker to activate. False if it did not happen in time. */
function activate(waiting: ServiceWorker): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ACTIVATION_TIMEOUT_MS);
    waiting.addEventListener("statechange", () => {
      if (waiting.state !== "activated" && waiting.state !== "redundant") return;
      clearTimeout(timer);
      resolve(waiting.state === "activated");
    });
    // Handled by the generated sw.js (registerType "prompt").
    waiting.postMessage({ type: "SKIP_WAITING" });
  });
}

async function applyIfOnlyTab(): Promise<void> {
  // Without Web Locks there is no reliable way to know this is the only tab.
  if (!("serviceWorker" in navigator) || !navigator.locks) return;
  // At most one update reload per launch.
  if (consumeReloadFlag()) return;

  // Other tabs hold the lock in shared mode, so an exclusive lock is available
  // only when there is none. It is held until the update is done.
  await navigator.locks.request(TAB_LOCK, { mode: "exclusive", ifAvailable: true }, async (lock) => {
    if (!lock) return;

    const registration = await Promise.race([
      navigator.serviceWorker.getRegistration(),
      sleep(REGISTRATION_TIMEOUT_MS).then(() => undefined),
    ]);
    const waiting = registration?.waiting;
    if (!waiting) return;
    await sleep(SETTLE_MS);
    // If it does not activate in time, the current version starts. The request
    // cannot be withdrawn, so the browser may still activate the new worker
    // later, under the running app: see the B-01 notes in docs/backlog.md.
    if (!(await activate(waiting))) return;

    sessionStorage.setItem(RELOAD_FLAG, "1");
    location.reload();
    // Keep the lock while the page is being replaced. If the reload somehow
    // does not happen, give up and let the current version render.
    await sleep(RELOAD_TIMEOUT_MS);
  });
}

/**
 * Call once at app start and render when it resolves. If a new version is
 * waiting and this is the only tab, it is activated and the page reloads into
 * it before anything was shown. Always resolves; never waits longer than the
 * timeouts above.
 */
export async function applyWaitingUpdateAtStart(): Promise<void> {
  try {
    await applyIfOnlyTab();
  } catch {
    // Starting the current version always wins over updating.
  }
  try {
    // Never resolves: the lock is released when this tab goes away.
    void navigator.locks?.request(TAB_LOCK, { mode: "shared" }, () => new Promise<void>(() => {}));
  } catch {
    // Other tabs will then not see this one and may update under it.
  }
}

/** Registers the service worker and keeps looking for new versions. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .then((registration) => {
      // The browser looks for a new version on navigation only. An installed
      // app can stay open for weeks, so also look each time it comes back to
      // the foreground. This downloads; it never activates or reloads.
      // Offline the check fails and the current version simply stays.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
    })
    .catch(() => {
      // The app works without it, only not offline.
    });
}
