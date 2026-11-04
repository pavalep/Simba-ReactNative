/// <reference types="node" />
/**
 * The app's expanded chrome has ONE owner for its `nativeID`, and the app
 * does not drive the HOME path's PiP entry.
 *
 * ## Why the id exists
 *
 * The HOME path's PiP entry is native, because an Activity in PiP is
 * "paused, but rendering" — and what stops is the REACT-TO-NATIVE
 * pipeline, in two independent places: Fabric stops applying mount items
 * (so a React commit never reaches the native view tree), and the JS
 * timer manager freezes (so `requestAnimationFrame`, a zero-delay timer
 * on that registry, never fires). Measured on emulator-5554 (API 37) on
 * 2026-11-03: the leave hint reached JS immediately, the entry effect ran
 * 5.7 s late, the `requestAnimationFrame` never fired, and no PiP window
 * opened at all.
 *
 * The library therefore hides the chrome natively — `visibility = GONE` on
 * the host view — and to find that host view it needs to know which view it
 * is. React Native publishes the answer: a view's `nativeID` is stored on
 * the native view as `R.id.view_tag_native_id`, and
 * `ReactFindViewUtil.findView(root, id)` walks the native tree looking for
 * it.
 *
 * The library ships no chrome of its own, so the APP owns that string. And
 * it must own it in exactly ONE place: the `nativeID` prop on the chrome
 * root and the `pip.chromeNativeId` in the library config have to be the
 * same string, or the library will look for a view that is not there and
 * the PiP window will carry the app's dead control bar — the exact defect
 * the user reported.
 *
 * ## Why the app must not drive the HOME path
 *
 * The library owns the HOME path now. If the app ALSO drove it, the OS
 * would refuse the second entry, the app would read that refusal as "PiP
 * failed", and the chrome would come back over a live PiP window.
 */

const fs = require('fs');
const path = require('path');

export {};

const SRC = path.join(__dirname, '../../../src');
const APP_ROOT = path.join(__dirname, '../../..');

const PIP_CHROME_MODULE = path.join(SRC, 'infrastructure/player/pipChrome.ts');
const VIDEO_PLAYER = path.join(
  SRC,
  'components/player/video/VideoPlayer/VideoPlayer.tsx',
);
const APP_TSX = path.join(APP_ROOT, 'App.tsx');
const USE_PIP_ENTRY = path.join(SRC, 'infrastructure/player/usePipEntry.ts');

/** The file's CODE, with the comments removed. */
function readCode(file: string): string {
  const raw = fs.readFileSync(file, 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Every source file under `src/`, plus the app root entry point. */
function appSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(SRC);
  out.push(APP_TSX);
  return out;
}

describe("the app's expanded chrome nativeID", () => {
  it('is declared in exactly ONE module', () => {
    // The literal must live in `pipChrome.ts` and nowhere else. If a
    // second copy of the string appeared, the `nativeID` prop and the
    // `pip.chromeNativeId` config could drift apart and the library would
    // look for a view that does not exist.
    const literal = /simba-expanded-chrome/;
    const offenders = appSourceFiles()
      .filter(file => literal.test(fs.readFileSync(file, 'utf8')))
      .map(file => path.relative(APP_ROOT, file).split(path.sep).join('/'));

    expect(offenders).toEqual([
      'src/infrastructure/player/pipChrome.ts',
    ]);
  });

  it('is put on the chrome ROOT, not on some inner view', () => {
    // One `GONE` on the chrome root takes the whole overlay with it, which
    // is what the PiP window must not show. Hiding an inner view would
    // leave the rest of the chrome behind.
    const code = readCode(VIDEO_PLAYER);

    expect(code).toMatch(/nativeID=\{PIP_CHROME_NATIVE_ID\}/);
  });

  it('is handed to the library as pip.chromeNativeId', () => {
    const code = readCode(APP_TSX);

    expect(code).toMatch(/chromeNativeId:\s*PIP_CHROME_NATIVE_ID/);
  });

  it('is not spelled out as a literal at either end', () => {
    // Both ends read the one owner. A literal at either end is a second
    // owner, and the drift is silent.
    expect(readCode(VIDEO_PLAYER)).not.toMatch(/nativeID=\{['"]/);
    expect(readCode(APP_TSX)).not.toMatch(/chromeNativeId:\s*['"]/);
  });
});

describe("the app does not drive the HOME path's PiP entry", () => {
  it('does NOT listen for the user-leave event', () => {
    // The library raises no such event any more: it performs the entry
    // itself. An app that still listened would ask for a second window.
    const code = readCode(USE_PIP_ENTRY);

    expect(code).not.toMatch(/onUserLeaveHint/);
  });

  it('does NOT subscribe to any player event at all', () => {
    // `usePipEntry()` is the foreground entry only: the app asks the OS
    // for the window after the frame that removed the chrome. There is
    // nothing left for it to listen to.
    const code = readCode(USE_PIP_ENTRY);

    expect(code).not.toMatch(/subscribePlayerEvent/);
  });

  it('still waits a frame before asking the OS', () => {
    // The foreground order is the contract: the chrome is unmounted, the
    // frame that drew it without the chrome is presented, and only then is
    // the OS asked. The HOME path is native and does not need this.
    const code = readCode(USE_PIP_ENTRY);

    expect(code).toMatch(/requestAnimationFrame/);
    expect(code).toMatch(/enterPip\(\)/);
  });
});

/**
 * The range of the JSX element whose opening `<View` is at `openIndex`.
 *
 * `<View` openings are counted against `</View>` closings. The
 * comment-stripped source of `VideoPlayer.tsx` has no self-closing
 * `<View />` and no `<View` inside a string literal, so the count is
 * exact — and it is what makes "is this element INSIDE that one?" a
 * question about the source rather than about the prose.
 */
function viewElementRange(code: string, openIndex: number): [number, number] {
  let depth = 0;
  let cursor = openIndex;
  while (cursor < code.length) {
    const nextOpen = code.indexOf('<View', cursor);
    const nextClose = code.indexOf('</View>', cursor);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + '<View'.length;
      continue;
    }
    depth -= 1;
    cursor = nextClose + '</View>'.length;
    if (depth === 0) return [openIndex, cursor];
  }
  throw new Error('the <View> element is not balanced');
}

describe('everything that must not survive the chrome hide is INSIDE the chrome root', () => {
  const code = readCode(VIDEO_PLAYER);

  /**
   * The chrome root's subtree — the ONE view the library hides.
   */
  const chromeRoot = (): string => {
    const nativeIdIndex = code.indexOf('nativeID={PIP_CHROME_NATIVE_ID}');
    expect(nativeIdIndex).toBeGreaterThan(-1);
    const open = code.lastIndexOf('<View', nativeIdIndex);
    const [start, end] = viewElementRange(code, open);
    return code.slice(start, end);
  };

  /**
   * The picture's box — the chrome root's SIBLING.
   */
  const pictureBox = (): string => {
    const anchor = code.indexOf('dockStyle ?? styles.picture');
    expect(anchor).toBeGreaterThan(-1);
    // The anchor sits INSIDE the picture's opening tag, so the tag's
    // own `<View` is the nearest one BEFORE it.
    const open = code.lastIndexOf('<View', anchor);
    const [start, end] = viewElementRange(code, open);
    return code.slice(start, end);
  };

  it('mounts the gesture layer INSIDE the chrome root', () => {
    // The gesture layer is a NATIVE view (RNGH's `GestureDetector`),
    // and a native gesture view claims the touches in its bounds. As a
    // SIBLING of the chrome root it survived the library's
    // `visibility = GONE` and kept swallowing every tap aimed at the
    // picture inside the PiP window.
    expect(chromeRoot()).toContain('<VerticalSwipeGestures />');
  });

  it('mounts the loading overlay INSIDE the chrome root', () => {
    // A spinner that is a sibling of the chrome root keeps painting
    // into the PiP window.
    expect(chromeRoot()).toContain('<VideoLoadingOverlay />');
  });

  it('mounts the error overlay INSIDE the chrome root', () => {
    // Same for the error card: it is a full-bleed scrim, so as a
    // sibling it would cover the picture in the PiP window.
    expect(chromeRoot()).toContain('<VideoErrorOverlay />');
  });

  it('mounts NONE of them as a sibling of the chrome root', () => {
    // The picture's box is a sibling of the chrome root, so a sibling
    // is exactly what survives the hide.
    const picture = pictureBox();

    expect(picture).not.toContain('VerticalSwipeGestures');
    expect(picture).not.toContain('VideoLoadingOverlay');
    expect(picture).not.toContain('VideoErrorOverlay');
  });

  it('leaves the picture’s box holding the surface and nothing else', () => {
    // The picture stays mounted and stays reachable: the surface is
    // still in the picture's box, and the box carries nothing that
    // could claim its taps.
    const picture = pictureBox();

    expect(picture).toContain('<VideoSurface');
    expect(picture.split('<VideoSurface').length - 1).toBe(1);
  });

  it('mounts each of them exactly once', () => {
    // Two mount sites would be two owners of the same decision, and
    // only one of them would be inside the chrome root.
    for (const tag of [
      '<VerticalSwipeGestures',
      '<VideoLoadingOverlay',
      '<VideoErrorOverlay',
    ]) {
      expect(code.split(tag).length - 1).toBe(1);
    }
  });

  it('keeps the stacking order: gesture layer, then the overlays, then the chrome', () => {
    // picture < gesture layer < loading/error overlays < chrome controls
    //
    // The gesture layer is a native gesture view, so it has to be ABOVE
    // the picture and BELOW the overlays — otherwise the error card's
    // Retry and Close stop receiving touches (device evidence,
    // emulator-5554, 2026-10-20).
    const root = chromeRoot();

    const gesture = root.indexOf('<VerticalSwipeGestures');
    const loading = root.indexOf('<VideoLoadingOverlay');
    const error = root.indexOf('<VideoErrorOverlay');
    const chrome = root.indexOf('<SimbaStatusBar');

    expect(gesture).toBeGreaterThanOrEqual(0);
    expect(gesture).toBeLessThan(loading);
    expect(loading).toBeLessThan(error);
    // The chrome's own controls are above all three, as they were.
    expect(error).toBeLessThan(chrome);
  });
});
