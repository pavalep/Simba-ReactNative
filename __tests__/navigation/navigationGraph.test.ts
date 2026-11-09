/**
 * The navigation graph — pinned.
 *
 * There was no test for any of this. The app's navigation had been
 * reshaped several times (the tab shell was removed in "Phase 14.0
 * navigation refactoring", a nested `SettingsStack` was added, and the
 * duplicate-name warning it produced was silenced by renaming the inner
 * screen to `SettingsHome`), and nothing in the suite would have noticed
 * any of it.
 *
 * The specific defect this file exists to prevent:
 *
 *   The settings screens lived in a `SettingsStack` mounted under the root
 *   route "Settings". A nested navigator is not just a different shape —
 *   it changes what the app can do:
 *
 *     • `SettingsScreen`'s own rows had to reach THROUGH their navigator
 *       with `nav.getParent()?.navigate('MoviesScreen')`. The `?.` made a
 *       missing parent a SILENT no-op: the row does nothing, with no
 *       error, no log, nothing.
 *     • A screen outside the navigator could only reach a settings screen
 *       through `navigationRef.navigate('Settings', {screen: 'Privacy'})`.
 *       That works, but it pushes the WHOLE settings group, so Back from
 *       the Privacy Policy landed on `SettingsHome` — a screen the user
 *       never asked for.
 *     • The inner screen could not be called "Settings" without React
 *       Navigation warning about a screen nested inside a screen of the
 *       same name, so it was renamed `SettingsHome`. The rename silenced
 *       the warning; it did not remove the cause.
 *
 * The app has no tabs and exactly one stack, so the settings screens are
 * now siblings of every other screen. These tests make that structural
 * property hard to undo by accident.
 */

import fs from 'fs';
import path from 'path';
import {getStateFromPath} from '@react-navigation/native';
import {linking} from '../../src/navigation/linking';
import type {RootStackParamList} from '../../src/navigation/types';

const APP = path.resolve(__dirname, '..', '..');
const NAV = path.join(APP, 'src', 'navigation');

/**
 * Replace comment bodies with spaces (keeping the newlines).
 *
 * The source-level assertions below look for a construct that MUST NOT
 * appear in the code. Several of them appear in the comments that
 * explain WHY the construct is gone — and a grep that cannot tell a
 * comment from code would flag the explanation as the violation.
 * Stripping the comments first is what makes these assertions mean
 * "no call site does this" rather than "no file mentions this".
 */
function stripComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        out += text[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** The source of a file with its comments removed. */
function codeOf(file: string): string {
  return stripComments(fs.readFileSync(file, 'utf8'));
}

/**
 * The route names declared in a param-list type.
 *
 * A TypeScript type is erased at runtime, so `Object.keys(paramList)`
 * is empty — the declared routes can only be read from the source. This
 * parses the type body and returns the top-level keys.
 */
function declaredRoutes(file: string, typeName: string): string[] {
  const source = codeOf(file);
  const start = source.indexOf(`export type ${typeName} = {`);
  expect(start).toBeGreaterThan(-1);
  const open = source.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end).toBeGreaterThan(-1);
  const body = source.slice(open + 1, end);

  // Top-level keys only: a key is at depth 0 of the body.
  const names: string[] = [];
  let d = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') {
      d++;
      continue;
    }
    if (ch === '}') {
      d--;
      continue;
    }
    if (d === 0) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(body.slice(i));
      if (m) {
        names.push(m[1]);
        i += m[0].length - 1;
      }
    }
  }
  return names;
}

/** The settings screens that used to live inside the nested stack. */
const SETTINGS_ROUTES = [
  'Settings',
  'About',
  'AudioSettings',
  'Equalizer',
  'LinkedFolders',
  'FolderLinkingWizard',
  'Changelog',
  'Licenses',
  'Credits',
  'Privacy',
  'Terms',
  'Help',
] as const;

/** The deep-link path each settings screen has always answered to. */
const SETTINGS_PATHS: Record<string, string> = {
  Settings: 'settings',
  About: 'settings/about',
  AudioSettings: 'settings/audio',
  Equalizer: 'settings/equalizer',
  LinkedFolders: 'settings/folders/:type',
  FolderLinkingWizard: 'settings/folder-wizard/:type?',
  Changelog: 'settings/changelog',
  Licenses: 'settings/licenses',
  Credits: 'settings/credits',
  Privacy: 'settings/privacy',
  Terms: 'settings/terms',
  Help: 'settings/help',
};

/** The last route of a resolved linking state, and whether it is nested. */
function resolve(pathname: string) {
  const state = getStateFromPath(pathname, linking.config);
  if (!state) return null;
  const last = state.routes[state.routes.length - 1];
  return {state, last, nested: Boolean(last.state)};
}

describe('the navigation graph is one flat stack', () => {
  it('has exactly one navigator in src/navigation', () => {
    const files = fs
      .readdirSync(NAV)
      .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

    const creators: Record<string, string[]> = {};
    for (const file of files) {
      const source = fs.readFileSync(path.join(NAV, file), 'utf8');
      const hits = source.match(/create\w*Navigator/g);
      if (hits) creators[file] = [...new Set(hits)];
    }

    // Exactly one file creates a navigator. A second one is a nested
    // stack, and a nested stack is what this file exists to prevent.
    expect(Object.keys(creators)).toEqual(['RootNavigator.tsx']);
  });

  it('has no SettingsStack module left behind', () => {
    expect(fs.existsSync(path.join(NAV, 'SettingsStack.tsx'))).toBe(false);
  });

  it('registers every settings screen on the ROOT navigator', () => {
    const source = fs.readFileSync(path.join(NAV, 'RootNavigator.tsx'), 'utf8');
    for (const route of SETTINGS_ROUTES) {
      expect(source).toContain(`name="${route}"`);
    }
  });

  it('registers no other navigator inside the root navigator', () => {
    const source = fs.readFileSync(path.join(NAV, 'RootNavigator.tsx'), 'utf8');
    // A nested stack would be mounted through a `component={...}` that is
    // itself a navigator. The root navigator is the only place a
    // navigator may be created, and the flatness test above already
    // proves that; this asserts the root navigator does not import one.
    expect(source).not.toMatch(/from '\.\/SettingsStack'/);
    expect(source).not.toMatch(/NavigatorScreenParams/);
  });
});

describe('the settings screens are root routes, not a nested group', () => {
  it('has no "SettingsHome" route any more', () => {
    // The rename was a workaround for React Navigation's duplicate-name
    // warning. With the nesting gone, the real name is available again.
    const types = codeOf(path.join(NAV, 'types.ts'));
    expect(types).not.toContain('SettingsHome');
    expect(types).not.toContain('SettingsStackParamList');
  });

  it.each(SETTINGS_ROUTES)('resolves %s without a nested navigator', route => {
    const spec = SETTINGS_PATHS[route];
    // The optional-parameter route needs a concrete value.
    const concrete = spec.replace(':type?', 'audio').replace(':type', 'audio');
    const resolved = resolve('/' + concrete);
    expect(resolved).not.toBeNull();
    expect(resolved!.last.name).toBe(route);
    // A nested route carries its own `state` (the child navigator's
    // state). A flat route does not.
    expect(resolved!.nested).toBe(false);
  });

  it('resolves the settings paths that were always valid', () => {
    // These paths are a public contract: a share link or a bookmark that
    // points at simbaplayer://settings/privacy must keep working.
    expect(resolve('/settings')!.last.name).toBe('Settings');
    expect(resolve('/settings/privacy')!.last.name).toBe('Privacy');
    expect(resolve('/settings/terms')!.last.name).toBe('Terms');
    expect(resolve('/settings/about')!.last.name).toBe('About');
    expect(resolve('/settings/changelog')!.last.name).toBe('Changelog');
    expect(resolve('/settings/credits')!.last.name).toBe('Credits');
    expect(resolve('/settings/licenses')!.last.name).toBe('Licenses');
    expect(resolve('/settings/help')!.last.name).toBe('Help');
    expect(resolve('/settings/audio')!.last.name).toBe('AudioSettings');
    expect(resolve('/settings/equalizer')!.last.name).toBe('Equalizer');
  });

  it('still parses the settings path parameters', () => {
    const folders = resolve('/settings/folders/audio');
    expect(folders!.last.name).toBe('LinkedFolders');
    expect((folders!.last.params as {type?: string}).type).toBe('audio');

    const wizard = resolve('/settings/folder-wizard/video');
    expect(wizard!.last.name).toBe('FolderLinkingWizard');
    expect((wizard!.last.params as {type?: string}).type).toBe('video');
  });
});

describe('no caller navigates through the nested form any more', () => {
  /** Every source file that can call navigate(). */
  function sourceFiles(): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue;
          walk(full);
        } else if (/\.tsx?$/.test(entry.name)) {
          out.push(full);
        }
      }
    };
    walk(path.join(APP, 'src'));
    return out;
  }

  it('has no navigate({screen: …}) call left', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const source = codeOf(file);
      // The nested form: navigate('Settings', {screen: 'Privacy'}) and
      // navigate({name: 'Settings', params: {screen: …}}).
      if (/navigate\([^)]*screen\s*:/.test(source)) {
        offenders.push(path.relative(APP, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('has no getParent() escape hatch left', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const source = codeOf(file);
      if (/getParent\(\)/.test(source)) {
        offenders.push(path.relative(APP, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('every root route is registered and reachable', () => {
  it('registers every route in RootStackParamList', () => {
    const source = codeOf(path.join(NAV, 'RootNavigator.tsx'));
    const registered = [...source.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map(
      m => m[1],
    );

    const declared = declaredRoutes(
      path.join(NAV, 'types.ts'),
      'RootStackParamList',
    );

    // Every declared route has a screen, and every screen is declared.
    // A route that exists in the type but not in the navigator is a
    // navigation call that silently does nothing.
    expect(registered.length).toBeGreaterThan(40);
    expect(new Set(registered)).toEqual(new Set(declared));
  });

  it('gives every route a deep-link path, except the one that never had one', () => {
    const screens = (linking.config as {screens: Record<string, unknown>}).screens;
    const declared = declaredRoutes(
      path.join(NAV, 'types.ts'),
      'RootStackParamList',
    );
    const withoutPath = declared.filter(name => screens[name] === undefined);

    // `AddToPlaylist` has never had a deep-link path — it is a screen
    // that is only ever opened by a picker's result. Pinning the
    // exception means a route that LOSES its path is a test failure
    // rather than a silently broken share link.
    expect(withoutPath).toEqual(['AddToPlaylist']);
  });
});
