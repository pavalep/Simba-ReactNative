/**
 * No zustand selector may BUILD A NEW REFERENCE on every call.
 *
 * ## The defect this pins
 *
 * The Radio screen crashed with React's "Maximum update depth exceeded".
 *
 * zustand 5 compares a selector's result with `Object.is` to decide whether
 * the subscriber must re-render. A selector that returns a FRESH array on
 * every call — `s.items.filter(...)` — produces a reference that is never
 * equal to the previous one, so `useSyncExternalStore` re-renders forever.
 * React throws at 50 nested updates.
 *
 * Measured on emulator-5554 (API 37) on 2026-11-05 against
 * `src/screens/RadioScreenNew/hooks/useRadioBrowser.ts:239`:
 *
 *   const favorites = useLiveFavoritesStore(s =>
 *     s.items.filter(f => f.kind === 'radio'),
 *   );
 *
 * A sweep of `src/` found SEVEN sites with the same shape — the Radio
 * browser, the Radio favourites screen, the Live TV browser, the Live TV
 * favourites screen, the album detail screen, the artist detail screen and
 * the album enrichment hook. The repo had already been bitten by this exact
 * class twice and fixed it the same way both times
 * (`src/screens/Artist/hooks/useArtistScreen.ts:31-42` and
 * `src/screens/Album/hooks/useAlbumScreen.ts:31-46`): select the STABLE
 * array, derive outside the selector.
 *
 * ## The rule
 *
 * Select a stable reference. Derive with `useMemo`.
 *
 *   const allItems = useLiveFavoritesStore(s => s.items);
 *   const favorites = useMemo(
 *     () => allItems.filter(f => f.kind === 'radio'),
 *     [allItems],
 *   );
 *
 * ## Why this is a source check
 *
 * The bug is a SHAPE of code, not a value at runtime: whether a selector
 * allocates depends on the expression, and the crash only fires when the
 * screen is mounted. A source scan sees every call site at once, including
 * the ones no test happens to mount. This is the same shape as
 * `MainActivityNativePipEntry.test.ts` and
 * `MainActivityPipActionReceiver.test.ts` — and the same answer this repo
 * already uses for "a rule that spans every file".
 *
 * ## Why the scanner has to prove itself
 *
 * A scan that finds nothing proves nothing. Two of the tests below feed the
 * scanner a synthetic source and assert it DOES flag it, and one asserts the
 * walker actually reaches the source tree. Without those, a scanner that
 * returned an empty list forever would pass this file forever.
 */

const fs = require('fs');
const path = require('path');

// This file is a MODULE, not a script, for the same reason
// `MainActivityNativePipEntry.test.ts` is one: the repo's other
// native-source guards are top-level scripts whose `const fs` / `const path`
// live in the global scope, and two script files in one TypeScript program
// that declare the same name collide. `export {}` puts this file's
// declarations in its own scope.
export {};

const SRC_DIR = path.join(__dirname, '../../src');

/**
 * The calls that allocate a new array or object.
 *
 * Every one of these, applied to a store's state inside a selector, returns
 * a reference the store cannot recognise as unchanged.
 */
const REFERENCE_BUILDERS = [
  '.filter(',
  '.map(',
  '.sort(',
  '.reverse(',
  '.slice(',
  '.concat(',
  '.flat(',
  '.flatMap(',
  '.reduce(',
  'Object.keys(',
  'Object.values(',
  'Object.entries(',
];

interface SelectorHit {
  /** 1-based line of the hook call in the ORIGINAL source. */
  line: number;
  /** The hook's name, e.g. `useMediaStore`. */
  hook: string;
  /** Which allocation(s) were found inside the selector. */
  builders: string[];
}

/**
 * Blank out the CONTENTS of comments and string literals, keeping every
 * other character (and every offset) intact.
 *
 * The guard has to read code, not prose: a file may legitimately mention
 * `.filter(` in a comment explaining why it does NOT filter, and a string
 * like `'radio'` must not shift the offsets the line numbers are computed
 * from.
 */
function maskCommentsAndStrings(src: string): string {
  const out = src.split('');
  let i = 0;
  const n = src.length;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) {
      if (out[k] !== '\n') out[k] = ' ';
    }
  };
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      blank(i, j);
      i = j;
      continue;
    }
    if (c === '/' && d === '*') {
      let j = i + 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      blank(i, j);
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === c) break;
        j++;
      }
      blank(i + 1, j);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out.join('');
}

/** Split an argument list on top-level commas. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * Find every store hook call whose SELECTOR builds a new reference.
 *
 * A store hook is any `use…Store(` call. Its first argument is the
 * selector; the rest (a custom equality fn, for example) are not.
 */
function findReferenceBuildingSelectors(src: string): SelectorHit[] {
  const masked = maskCommentsAndStrings(src);
  const hits: SelectorHit[] = [];
  const re = /\buse[A-Za-z0-9_]*Store\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const open = masked.indexOf('(', m.index);
    let depth = 0;
    let close = -1;
    for (let i = open; i < masked.length; i++) {
      const ch = masked[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close < 0) continue;
    const selector = splitTopLevel(masked.slice(open + 1, close))[0] ?? '';
    const builders = REFERENCE_BUILDERS.filter(b => selector.includes(b));
    // The leading `\s*` keeps the literal from starting with `=`, which ESLint's
    // `no-div-regex` reads as an ambiguous `/=` division. The match set is
    // identical: `=>` is still required, only optional whitespace may precede it.
    if (/\s*=>\s*\(\s*\{/.test(selector)) builders.push('=> ({');
    if (/\s*=>\s*\[\s*\[/.test(selector)) builders.push('=> [[');
    if (builders.length > 0) {
      hits.push({
        line: src.slice(0, m.index).split('\n').length,
        hook: m[0].replace(/\s*\($/, ''),
        builders,
      });
    }
    re.lastIndex = close;
  }
  return hits;
}

/** Every .ts/.tsx file under a directory. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('zustand selectors — no reference-building selectors', () => {
  it('flags a selector that filters inside the selector', () => {
    // The scanner must actually be able to find the defect it is guarding.
    const source = [
      "import {useLiveFavoritesStore} from './state';",
      'export function useRadioBrowser() {',
      '  const favorites = useLiveFavoritesStore(s =>',
      "    s.items.filter(f => f.kind === 'radio'),",
      '  );',
      '  return favorites;',
      '}',
    ].join('\n');

    const hits = findReferenceBuildingSelectors(source);

    expect(hits).toHaveLength(1);
    expect(hits[0].hook).toBe('useLiveFavoritesStore');
    expect(hits[0].builders).toContain('.filter(');
    expect(hits[0].line).toBe(3);
  });

  it('flags a selector that sorts inside the selector', () => {
    const source = [
      'export function useAlbumDetail() {',
      '  const tracks = useMediaStore(s =>',
      '    s.tracks',
      '      .filter(t => t.album === album)',
      '      .sort((a, b) => a.trackNumber - b.trackNumber),',
      '  );',
      '  return tracks;',
      '}',
    ].join('\n');

    const hits = findReferenceBuildingSelectors(source);

    expect(hits).toHaveLength(1);
    expect(hits[0].builders).toEqual(expect.arrayContaining(['.filter(', '.sort(']));
  });

  it('does NOT flag a selector that returns a stable slice', () => {
    // The fix's own shape must pass, or the guard would forbid the fix.
    const source = [
      'export function useRadioBrowser() {',
      '  const allItems = useLiveFavoritesStore(s => s.items);',
      '  const favorites = useMemo(',
      "    () => allItems.filter(f => f.kind === 'radio'),",
      '    [allItems],',
      '  );',
      '  return favorites;',
      '}',
    ].join('\n');

    expect(findReferenceBuildingSelectors(source)).toEqual([]);
  });

  it('does NOT flag a comment that mentions .filter(', () => {
    // Prose is not code. A comment explaining the rule must not trip it.
    const source = [
      'export function useThing() {',
      '  // Never call .filter( inside the selector.',
      '  const item = useThingStore(s => s.currentItem);',
      '  return item;',
      '}',
    ].join('\n');

    expect(findReferenceBuildingSelectors(source)).toEqual([]);
  });

  it('reaches the source tree it claims to scan', () => {
    // A walker that silently found nothing would make every other test in
    // this file pass for the wrong reason.
    const files = walk(SRC_DIR);

    expect(files.length).toBeGreaterThan(200);
    expect(
      files.some(f => f.endsWith(path.join('state', 'mediaStore.ts'))),
    ).toBe(true);
    expect(
      files.some(f =>
        f.endsWith(
          path.join('screens', 'RadioScreenNew', 'hooks', 'useRadioBrowser.ts'),
        ),
      ),
    ).toBe(true);
  });

  it('finds NO reference-building selector anywhere in src/', () => {
    // The guard itself. Each entry is a call site that would rebuild its
    // reference on every store read and re-render forever.
    const offenders: string[] = [];
    for (const file of walk(SRC_DIR)) {
      const src = fs.readFileSync(file, 'utf8');
      for (const hit of findReferenceBuildingSelectors(src)) {
        offenders.push(
          `${path.relative(SRC_DIR, file)}:${hit.line}  ${hit.hook} → ${hit.builders.join(' ')}`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
