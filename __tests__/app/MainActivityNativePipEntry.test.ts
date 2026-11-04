/**
 * The HOME path's Picture-in-Picture entry is NATIVE, and the app's part of
 * it is exactly one call.
 *
 * ## The defect this pins
 *
 * Pressing HOME opened **no** PiP window at all, and on return the screen
 * was black and chromeless with the presentation store stuck at
 * `pipActive: true` / `pipEntryRequested: true`.
 *
 * Measured on emulator-5554 (API 37) on 2026-11-03:
 *
 *  - `MainActivity.onUserLeaveHint()` fired, and the library reported
 *    `autoEnter=true` and `emit succeeded` — the leave hint DID reach JS;
 *  - but the effect that would have driven the entry ran **5.7 s late**, and
 *    its `requestAnimationFrame` **never fired**.
 *
 * The reason is not a bug in the effect. It is WHERE the work was being
 * done: **an Activity in PiP is "paused, but rendering" — what stops is
 * REACT.** RN pauses the React scheduler with the Activity, so by the time
 * the app is backgrounded a React commit cannot land and there is no frame
 * clock to wait on. A React-driven entry cannot work on this path at all.
 *
 * So the entry has to be native, and it has to happen in the only hook that
 * fires before the Activity pauses. The library does the work — it hides the
 * chrome with a native `visibility = GONE` on the host view it finds
 * through the app's `nativeID`, asks the OS for the window, and restores the
 * chrome when PiP ends. The app's job is to hand it the Activity.
 *
 * ## Why this is a source check
 *
 * The contract lives in Kotlin, and this repository has no native test
 * harness. The repo's established answer to "a contract that spans a file no
 * unit test can mount" is a source check — the same shape as
 * `MainActivityPipActionReceiver.test.ts` and `MainActivityBackPress.test.ts`.
 * This is that.
 */

const fs = require('fs');
const path = require('path');

// This file is a MODULE, not a script, for the same reason
// `MainActivityPipActionReceiver.test.ts` is one: the repo's other
// native-source guards are top-level scripts whose `const fs` / `const path`
// live in the global scope, and two script files in one TypeScript program
// that declare the same name collide — `tsc` reports it as a duplicate
// declaration, which is a false alarm about this file. `export {}` puts
// this file's declarations in its own scope.
export {};

const MAIN_ACTIVITY = path.join(
  __dirname,
  '../../android/app/src/main/java/com/simba/player/MainActivity.kt',
);

/**
 * The file's CODE, with the comments removed.
 *
 * The comment above `onUserLeaveHint()` explains WHY the entry is native and
 * names both the old JS-driven path and the new native one. A guard that
 * matched the raw text would therefore fail on its own documentation — so
 * the guard reads code, not prose.
 */
function readMainActivityCode(): string {
  const raw = fs.readFileSync(MAIN_ACTIVITY, 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('MainActivity — the HOME path enters PiP natively', () => {
  it('hands the Activity to the library on the user-leave hint', () => {
    // The library needs the Activity: it is the only thing that can enter
    // Picture-in-Picture, and the only thing that can find the chrome's
    // host view in the native tree.
    const code = readMainActivityCode();

    expect(code).toMatch(/MpvBridgeModule\.notifyUserLeaveHint\(\s*this\s*\)/);
  });

  it('does NOT call the no-argument form', () => {
    // The old no-arg `notifyUserLeaveHint()` raised a JS event and let the
    // app drive the entry from React — which is the path that provably
    // cannot work while the Activity is pausing. If it were still called
    // here, the app would drive the entry AND the library would drive it,
    // and the second entry would be refused by the OS.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/notifyUserLeaveHint\(\s*\)/);
  });

  it('does NOT ask for the PiP window itself', () => {
    // The library owns the entry: it knows how the params are built, how
    // the source rect is measured and how the chrome is found. A second
    // `enterPictureInPictureMode` here would be a second owner of the same
    // decision, and the two would race.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/enterPictureInPictureMode/);
  });

  it('still forwards the PiP mode change to the library', () => {
    // This is where the chrome is RESTORED: the library restores the view
    // it hid when the argument says PiP has ended. Without this the app
    // would come back with an invisible chrome.
    const code = readMainActivityCode();

    expect(code).toMatch(
      /MpvBridgeModule\.onPictureInPictureModeChanged\(\s*isInPictureInPictureMode\s*\)/,
    );
  });

  it('does NOT hide or show any view itself', () => {
    // The chrome is hidden by the library, through the host view it finds
    // by `nativeID`. The app does not know that view, and it must not
    // start hunting for it: a second hiding mechanism is a second owner of
    // the same fact, and the two would not agree on when to restore it.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/setVisibility/);
    expect(code).not.toMatch(/View\.GONE/);
    expect(code).not.toMatch(/View\.VISIBLE/);
  });

  it('does NOT reach for ReactFindViewUtil itself', () => {
    // The lookup by `nativeID` is the library's: it is the library that
    // knows the chrome id, because the app publishes it through
    // `pip.chromeNativeId`. An app that found the view itself would be
    // back to owning the hide.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/ReactFindViewUtil/);
    expect(code).not.toMatch(/findView/);
  });
});
