/**
 * A playlist holds ONE lane. There is no mixed playlist.
 *
 * ## The defect this pins
 *
 * The `MIXED` playlist kind - one list carrying both audio and video - was
 * removed on 2026-11-05. A list that spans two lanes is a QUEUE, not a
 * playlist, and the mixed kind made every lane rule a special case:
 *
 *  - `isPlaylistMediaKindAllowed` carried a second branch for it;
 *  - the create modal offered it as a third kind;
 *  - the kind filter chip offered it on TWO pages (the Library and the
 *    management page, which share ONE chip list);
 *  - the queue's "save as playlist" wrote one;
 *  - a record persisted with it needed its own rehydrate rule.
 *
 * ## The rule
 *
 * A playlist is `AUDIO_ONLY` or `VIDEO_ONLY`, the kind filter lists exactly
 * those, and a record persisted with the old kind is SPLIT when it is read
 * back. `normalizePlaylistRecord` in `src/state/playlistsStore.ts` is the ONE
 * owner of that migration, and it is the only place in `src/` allowed to
 * name the removed kind as a value.
 *
 * ## Why a source check
 *
 * The kind is a TYPE, and a type cannot be asserted at runtime: a third
 * kind can be added to the union and every runtime assertion here still
 * passes. So this file pins the union twice - once at runtime, through the
 * labels that are keyed by it, and once at COMPILE time, through an exact
 * type equality that `tsc --noEmit` fails on - and then scans the source
 * tree for any OTHER place that still branches on the removed kind.
 *
 * ## Why the scanner has to prove itself
 *
 * A scan that finds nothing proves nothing. One test below feeds the
 * scanner a synthetic source and asserts it DOES flag it, and one asserts
 * the walker actually reaches the source tree. Without those, a scanner
 * that returned an empty list forever would pass this file forever.
 */

const fs = require('fs');
const path = require('path');

// This file is a MODULE, not a script, for the same reason
// `app/ZustandSelectorStability.test.ts` is one: the repo's other
// native-source guards are top-level scripts whose `const fs` / `const path`
// live in the global scope, and two script files in one TypeScript program
// that declare the same name collide. `export {}` puts this file's
// declarations in its own scope.
export {};

import {
  PLAYLIST_KIND_LABELS,
  isPlaylistMediaKindAllowed,
  type PlaylistKind,
} from '../../../src/types/playlist';
import {LOCAL_PLAYLIST_FILTERS} from '../../../src/features/library/presentation/related/localFilesConfig';

const SRC_DIR = path.join(__dirname, '../../../src');

/**
 * The ONE file in `src/` that may name the removed kind.
 *
 * The migration has to recognise the old records, so it has to say what it
 * recognises. Nothing else may: a second branch on the removed kind is a
 * second rule, and a second rule is one copy too many.
 */
const MIGRATION_OWNER = 'src/state/playlistsStore.ts';

/** The removed kind, as a quoted VALUE. A docblock may name it in prose. */
const REMOVED_KIND_LITERAL = /['"]MIXED['"]/;

/** Every .ts/.tsx file under a directory. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** The files under `src/` that still name the removed kind as a value. */
function filesNamingTheRemovedKind(): string[] {
  return walk(SRC_DIR)
    .filter(file => REMOVED_KIND_LITERAL.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(path.join(SRC_DIR, '..'), file).split(path.sep).join('/'));
}

/** Compile-time equality: false as soon as either side gains a member. */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

// If a third kind is added to `PlaylistKind`, this line stops compiling:
// `Equal` becomes `false` and `true` is no longer assignable to it.
const KINDS_ARE_EXACTLY_TWO: Equal<PlaylistKind, 'AUDIO_ONLY' | 'VIDEO_ONLY'> = true;

describe('a playlist holds ONE lane', () => {
  it('has exactly two kinds - runtime', () => {
    expect(Object.keys(PLAYLIST_KIND_LABELS).sort()).toEqual(['AUDIO_ONLY', 'VIDEO_ONLY']);
  });

  it('has exactly two kinds - compile time', () => {
    // The value is `true` only while `PlaylistKind` is exactly the two.
    expect(KINDS_ARE_EXACTLY_TWO).toBe(true);
  });

  it('refuses the other lane in both directions', () => {
    expect(isPlaylistMediaKindAllowed('AUDIO_ONLY', 'music', 'audio')).toBe(true);
    expect(isPlaylistMediaKindAllowed('AUDIO_ONLY', 'movie', 'video')).toBe(false);
    expect(isPlaylistMediaKindAllowed('VIDEO_ONLY', 'movie', 'video')).toBe(true);
    expect(isPlaylistMediaKindAllowed('VIDEO_ONLY', 'music', 'audio')).toBe(false);
  });

  it('still refuses a kind the allow-list refuses', () => {
    // A radio station's lane matches, but a lane is not a permission.
    expect(isPlaylistMediaKindAllowed('AUDIO_ONLY', 'radio', 'audio')).toBe(false);
    expect(isPlaylistMediaKindAllowed('VIDEO_ONLY', 'live-tv', 'video')).toBe(false);
  });
});

describe('the kind filter', () => {
  it('offers ALL plus the two kinds - and nothing else', () => {
    expect(LOCAL_PLAYLIST_FILTERS.map(filter => filter.key)).toEqual([
      'ALL',
      'AUDIO_ONLY',
      'VIDEO_ONLY',
    ]);
  });

  it('labels the kinds from the ONE owner of the labels', () => {
    expect(LOCAL_PLAYLIST_FILTERS.map(filter => filter.label)).toEqual([
      'All',
      PLAYLIST_KIND_LABELS.AUDIO_ONLY,
      PLAYLIST_KIND_LABELS.VIDEO_ONLY,
    ]);
  });
});

describe('the removed kind is named in ONE place only', () => {
  it('is named by the migration and by nothing else', () => {
    expect(filesNamingTheRemovedKind()).toEqual([MIGRATION_OWNER]);
  });

  it('the scanner really reads the tree', () => {
    // The walk has to reach the source files, or the assertion above is
    // true because the scanner looked at nothing.
    const files = walk(SRC_DIR);
    expect(files.length).toBeGreaterThan(200);
    expect(files.some(file => file.endsWith(path.join('types', 'playlist.ts')))).toBe(true);
    expect(files.some(file => file.endsWith(path.join('state', 'playlistsStore.ts')))).toBe(true);
  });

  it('the scanner flags a source that names it', () => {
    // The self-test: a synthetic file that names the removed kind MUST be
    // found, or the assertion above is worthless.
    const synthetic = "const kind = 'MIXED';\n";
    expect(REMOVED_KIND_LITERAL.test(synthetic)).toBe(true);
  });

  it('the scanner ignores a source that only mentions it in prose', () => {
    // A docblock may name what was removed. That is documentation, not a
    // branch on a kind that no longer exists.
    const prose = ' * The legacy `MIXED` playlist kind used to be split.\n';
    expect(REMOVED_KIND_LITERAL.test(prose)).toBe(false);
  });
});
