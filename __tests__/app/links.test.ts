/**
 * The app's outbound links — the guard that keeps them true.
 *
 * 2026-11-12. Three of the app's links were wrong, and two of them
 * pointed at things that do not exist:
 *
 *  • the support address was `support@simbaplayer.app` — a domain the
 *    project does not have;
 *  • `https://simbaplayer.app` was a deep-link prefix AND the web
 *    fallback of every shared link — no such website;
 *  • the bug report pointed at `github.com/diegopvlk/Cine/issues`, a
 *    different project's issue tracker.
 *
 * And the `simbaplayer://` scheme resolved nowhere on Android, because
 * the app never DECLARED the scheme in its manifest: React Navigation's
 * linking config only parses URLs the platform hands it, and the
 * platform was never asked.
 *
 * `src/constants/links.ts` is the one owner now. This file is what
 * stops it drifting again.
 */

import fs from 'fs';
import path from 'path';
import {
  ISSUES_URL,
  PLAY_STORE_URL,
  PROJECT_URL,
  SUPPORT_EMAIL,
  supportMailto,
} from '../../src/constants/links';
import {buildFallbackUrl, buildShareUrl} from '../../src/services/shareService';

const ROOT = path.resolve(__dirname, '../..');

const read = (...parts: string[]) =>
  fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

/** Every source file, for the "no dead domain anywhere" sweep. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

/**
 * Strip comments, keeping string literals.
 *
 * The dead domain is allowed to be *named* in a comment that explains why
 * it was removed — that history is worth keeping. It is not allowed to
 * appear in code, where it would be live again. So the sweep runs over
 * the source with its comments removed.
 *
 * This is a small lexer: it tracks quote state ('", `) so that a `//`
 * inside a URL is not mistaken for a comment, and it drops block comments
 * as well as line comments.
 */
function stripComments(text: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (quote) {
      out += ch;
      if (ch === '\\') {
        // Escaped character — copy it and whatever follows it.
        out += next ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

describe('the app links', () => {
  it('the Play Store listing is this app’s applicationId', () => {
    const gradle = read('android', 'app', 'build.gradle');
    const applicationId = gradle.match(/applicationId\s+"([^"]+)"/)?.[1];

    expect(applicationId).toBeTruthy();
    expect(PLAY_STORE_URL).toContain(`id=${applicationId}`);
  });

  it('the bug report goes to this project’s issue tracker', () => {
    expect(PROJECT_URL).toBe('https://github.com/pavalep/Simba-ReactNative');
    expect(ISSUES_URL).toBe(`${PROJECT_URL}/issues`);
  });

  it('the support address is the one the owner reads', () => {
    expect(SUPPORT_EMAIL).toBe('support@pavalep.cpm');
  });

  it('the mailto carries the address and an encoded subject', () => {
    expect(supportMailto('Simba Player Help')).toBe(
      'mailto:support@pavalep.cpm?subject=Simba%20Player%20Help',
    );
  });

  it('the dead domain is gone from every source file', () => {
    // `simbaplayer.app` was a domain the project does not have. It was
    // a linking prefix, a share fallback and a support address.
    //
    // The sweep runs over the source with its COMMENTS stripped: naming
    // the dead domain in a comment that explains the removal is allowed
    // (and wanted); having it in code is not.
    const offenders: string[] = [];
    for (const file of sourceFiles(path.join(ROOT, 'src'))) {
      const text = stripComments(fs.readFileSync(file, 'utf8'));
      if (text.includes('simbaplayer.app')) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('Android declares the simbaplayer scheme', () => {
    // Without this intent-filter the app is never asked to handle the
    // link, and every `simbaplayer://` URL is dead on arrival.
    const manifest = read(
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );

    expect(manifest).toContain('<data android:scheme="simbaplayer" />');
    expect(manifest).toContain('android.intent.category.BROWSABLE');
  });

  it('the only linking prefix is the scheme', () => {
    const linking = read('src', 'navigation', 'linking.ts');
    const prefixes = linking.match(/prefixes:\s*\[([^\]]*)\]/)?.[1] ?? '';

    expect(prefixes).toContain("'simbaplayer://'");
    expect(prefixes).not.toContain('simbaplayer.app');
  });

  it('a shared link carries the scheme, and falls back to the project', () => {
    // The shared deep link still names the item; the fallback is the
    // link that always resolves. Both used to point at a dead domain.
    const deepLink = buildShareUrl({
      route: 'ArtistScreen',
      params: {artistName: 'Eminem'},
      title: 'Eminem',
    });

    expect(deepLink).toBe('simbaplayer://artist/Eminem');
    expect(deepLink).not.toContain('simbaplayer.app');
    expect(buildFallbackUrl()).toBe(PROJECT_URL);
  });

  it('the share service no longer builds a web URL per item', () => {
    // `buildHttpsUrl` produced `https://simbaplayer.app/<path>` — a URL
    // on a site that does not exist, sent to the recipient of every
    // share. It is gone, and nothing replaced it: the project has no
    // website yet, so there is no per-item web address to give.
    const share = read('src', 'services', 'shareService.ts');

    expect(share).not.toContain('buildHttpsUrl');
  });
});
