/**
 * The app's stack — the list the About page and the Credits page both
 * show.
 *
 * 2026-11-12: the About page's "Built with" card named Redux Toolkit
 * and the Credits page named Redux Toolkit and redux-persist. The app
 * has used Zustand and MMKV since V17 — `package.json` has no `redux`
 * and no `@reduxjs/toolkit`, and all 23 stores are `zustand` stores.
 *
 * `src/constants/techStack.ts` owns the list now. This test is what
 * keeps it honest: every package it names has to be a real dependency,
 * and the libraries it left out cannot come back by accident.
 */

import fs from 'fs';
import path from 'path';
import {TECH_STACK, BUILT_WITH_CHIPS} from '../../src/constants/techStack';

const ROOT = path.resolve(__dirname, '../..');

const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
);
const dependencies: Record<string, string> = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
};

/** The packages the stack names, and the package they ship as. */
const PACKAGES: Record<string, string> = {
  'react-native': 'react-native',
  TypeScript: 'typescript',
  React: 'react',
  Zustand: 'zustand',
  MMKV: 'react-native-mmkv',
  'react-native-linear-gradient': 'react-native-linear-gradient',
  'react-native-svg': 'react-native-svg',
  'react-native-safe-area-context': 'react-native-safe-area-context',
  'react-native-haptic-feedback': 'react-native-haptic-feedback',
  Jest: 'jest',
  'React Navigation': '@react-navigation/native',
};

describe('the app stack', () => {
  it('names packages the app actually depends on', () => {
    for (const [entryName, packageName] of Object.entries(PACKAGES)) {
      expect({
        entry: entryName,
        installed: Boolean(dependencies[packageName]),
      }).toEqual({entry: entryName, installed: true});
    }
  });

  it('has no Redux — the app has not used it since V17', () => {
    expect(dependencies.redux).toBeUndefined();
    expect(dependencies['@reduxjs/toolkit']).toBeUndefined();
    expect(dependencies['redux-persist']).toBeUndefined();

    const printed = TECH_STACK.flatMap(group =>
      group.entries.map(entry => entry.label),
    ).join(' | ');
    expect(printed).not.toMatch(/redux/i);
  });

  it('ships every "Built with" chip as a stack entry', () => {
    const names = TECH_STACK.flatMap(group =>
      group.entries.map(entry => entry.name),
    );

    for (const chip of BUILT_WITH_CHIPS) {
      expect(names).toContain(chip);
    }
  });

  it('does not list a chip twice', () => {
    expect(new Set(BUILT_WITH_CHIPS).size).toBe(BUILT_WITH_CHIPS.length);
  });
});
