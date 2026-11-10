// When may a waiting service worker take over and reload the app?
//
// A new version is downloaded in the background and waits. Activating it
// reloads the page, so it must never happen under the user's hands:
// - not while the app is visible (a reload would discard what is on screen);
// - not on a panic screen, even in the background, because the phone may lock
//   or switch to the SMS composer in the middle of an activation.
// If neither moment comes, the browser activates the waiting version by
// itself the next time the app is opened after all its tabs were closed.

export interface UpdateMoment {
  visibility: DocumentVisibilityState;
  pathname: string;
}

const isPanicRoute = (pathname: string) => pathname === "/panic" || pathname.startsWith("/panic/");

export function canApplyUpdateNow({ visibility, pathname }: UpdateMoment): boolean {
  return visibility === "hidden" && !isPanicRoute(pathname);
}
