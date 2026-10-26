/**
 * `MainActivity.onBackPressed()` — the Android back button must reach JS.
 *
 * ## The defect this pins
 *
 * Bug `B-011`: the Android back button did nothing anywhere in the app. Not
 * in the player, not on Home — where it should have closed the app.
 *
 * The cause was a workaround that could never have worked. The override
 * dispatched a synthetic `KEYCODE_BACK` into the view hierarchy before
 * calling `super.onBackPressed()`, on the belief that the JS `BackHandler`
 * would "consume it".
 *
 * The JS `BackHandler` is not a key-event listener. It subscribes to the
 * `hardwareBackPress` DEVICE EVENT, and that event is emitted by
 * `DeviceEventManagerModule.emitHardwareBackPressed()` — reachable only from
 * `ReactHostImpl.onBackPressed()`, which `ReactActivityDelegate` calls. A
 * view-level `dispatchKeyEvent` cannot produce it. So the dispatch never
 * handed the press to JS, and its early return stopped RN's own route from
 * ever running.
 *
 * ## Why this is a source check
 *
 * The fix is in Kotlin, and this repository has no native test harness. The
 * repo's established answer to "a contract that spans a file no unit test
 * can mount" is a source check — the same shape as
 * `usePresentation.test.tsx` ("must not read the session") and the wiring
 * check in `useVideoOwnsWindow.test.tsx`. This is that.
 *
 * It pins the CONTRACT, not the prose:
 *   - the synthetic dispatch is gone,
 *   - `super.onBackPressed()` is called (RN's route to the JS handler),
 *   - the PiP branch survives (a PiP window has no JS behind it).
 *
 * A behavioural test of the real thing needs a device; this is the guard
 * that keeps the bug from coming back in a commit that never touches a
 * device.
 */

const fs = require('fs');
const path = require('path');

const MAIN_ACTIVITY = path.join(
  __dirname,
  '../../android/app/src/main/java/com/simba/player/MainActivity.kt',
);

/**
 * The file's CODE, with the comments removed.
 *
 * The comment above `super.onBackPressed()` quotes the old synthetic
 * dispatch by name, because the next reader needs to know what was removed
 * and why. A guard that matched the raw text would therefore fail on its
 * own documentation — so the guard reads code, not prose.
 */
function readMainActivityCode(): string {
  const raw = fs.readFileSync(MAIN_ACTIVITY, 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * The body of `onBackPressed()` alone.
 *
 * The order assertion has to look at the FUNCTION, not the file: the name
 * `isInPictureInPictureMode` also appears in `onPictureInPictureModeChanged`,
 * so a file-wide index would find that earlier parameter and report the
 * PiP check as "before super" no matter what the function did — an
 * assertion that cannot fail.
 *
 * `onBackPressed` is the last member of the class, so its body runs from
 * its signature to the end of the file.
 */
function readOnBackPressed(): string {
  const code = readMainActivityCode();
  const start = code.indexOf('override fun onBackPressed()');
  if (start < 0) {
    throw new Error('onBackPressed() was not found in MainActivity.kt');
  }
  return code.slice(start);
}

describe('MainActivity.onBackPressed — the Android back button must reach JS', () => {
  it('does NOT dispatch a synthetic KEYCODE_BACK into the view hierarchy', () => {
    // The dispatch is the bug. It asked the view hierarchy whether it
    // wanted the key, the hierarchy said yes, and the method returned before
    // RN's route to the JS BackHandler could run.
    //
    // Checked against the WHOLE file: the dispatch must not reappear
    // anywhere in the activity, not just inside this function.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/dispatchKeyEvent/);
    expect(code).not.toMatch(/KEYCODE_BACK/);
  });

  it('calls super.onBackPressed() so React Native can reach the JS handler', () => {
    // `super.onBackPressed()` IS `ReactActivity.onBackPressed()` ->
    // `mDelegate.onBackPressed()` -> `ReactHostImpl.onBackPressed()` ->
    // `emitHardwareBackPressed()` -> the JS `hardwareBackPress` event.
    const fn = readOnBackPressed();

    expect(fn).toMatch(/super\.onBackPressed\(\)/);
  });

  it('still finishes the Activity when the back press arrives in PiP', () => {
    // A PiP window has no JS behind it — the Activity has to close itself.
    // The branch must survive the fix, or PiP becomes a trap.
    const fn = readOnBackPressed();

    expect(fn).toMatch(/isInPictureInPictureMode/);
    expect(fn).toMatch(/finish\(\)/);
  });

  it('keeps the PiP check BEFORE the super call', () => {
    // Order matters: PiP is checked first, because in PiP the JS behind the
    // window is not the thing the user is looking at. If super ran first,
    // a back press in PiP would be handed to the JS behind the window.
    const fn = readOnBackPressed();
    const pipAt = fn.indexOf('isInPictureInPictureMode');
    const superAt = fn.indexOf('super.onBackPressed()');

    expect(pipAt).toBeGreaterThan(-1);
    expect(superAt).toBeGreaterThan(-1);
    expect(pipAt).toBeLessThan(superAt);
  });

  it('leaves no diagnostic instrumentation behind', () => {
    // The probe that produced the measurement is not allowed to ship: a
    // Log.i on every back press is noise in a shipping app.
    const code = readMainActivityCode();

    expect(code).not.toMatch(/BACKPROBE/);
  });
});
