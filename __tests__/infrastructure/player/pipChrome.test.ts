/// <reference types="node" />
/**
 * The app's expanded chrome has ONE owner for its `nativeID`, and the app
 * does not drive the HOME path's PiP entry.
 *
 * ## Why the id exists
 *
 * The HOME path's PiP entry is native, because an Activity in PiP is
 * "paused, but rendering" — what stops is REACT. RN pauses the React
 * scheduler with the Activity, so while the app is backgrounded a React
 * commit cannot land and no frame is produced. Measured on emulator-5554
 * (API 37) on 2026-11-03: the leave hint reached JS immediately, the entry
 * effect ran 5.7 s late, the `requestAnimationFrame` never fired, and no PiP
 * window opened at all.
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
