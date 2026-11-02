/**
 * V22 W22 — register item 68: the app's portrait lock goes through the LIB.
 *
 * ## The defect this pins
 *
 * `src/utils/orientation.ts` imported `react-native-orientation-locker`, whose
 * module body constructs a `NativeEventEmitter` with no argument — so merely
 * importing the helper THREW, and with it `AppContent`. Neither file had a
 * test, because neither file COULD have one.
 *
 * The helper now asks the lib's own command for the portrait lock. That is the
 * standing rule for system controls in this app — brightness, volume and PiP
 * all route through the central lib facade — and it makes the window ONE
 * writer: the player's own lock (`useTransport`) and the close path
 * (`useClosePlayback`) already make this exact call.
 *
 * ## Why the second test is a source check
 *
 * "The helper does not import the third-party package" is a weaker claim than
 * the app needs. The rule is that NO system control goes through a third-party
 * OS-control package, so the guard reads the whole `src/` tree. It is the
 * repo's established answer to a contract that spans files — the same shape as
 * `__tests__/app/MainActivityBackPress.test.ts`.
 */

import {lockToPortrait, type OrientationCommands} from '../../src/utils/orientation';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../../src');

/** Every `.ts` / `.tsx` file under `src/`. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('lockToPortrait', () => {
  it("asks the lib for 'portrait'", () => {
    const setOrientation = jest.fn();
    const commands: OrientationCommands = {setOrientation};

    lockToPortrait(commands);

    expect(setOrientation).toHaveBeenCalledTimes(1);
    expect(setOrientation).toHaveBeenCalledWith('portrait');
  });

  it('no source file imports a third-party orientation package', () => {
    const offenders = sourceFiles(SRC).filter(file =>
      /from\s+['"]react-native-orientation-locker['"]/.test(
        fs.readFileSync(file, 'utf8'),
      ),
    );

    expect(offenders.map(file => path.relative(SRC, file))).toEqual([]);
  });
});
