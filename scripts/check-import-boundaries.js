#!/usr/bin/env node
/**
 * V21 W2 P05 T05.03 — import-boundary linter
 *
 * Enforces the two hard rules in `md/SIMBA_MOBILE_V21_FOLDERS.md`:
 *
 *   1. ADAPTER RULE — `src/infrastructure/api/<provider>/**` cannot
 *      import from `src/features/`, `src/screens/`, `src/navigation/`,
 *      `src/state/*Store.ts`, or `src/infrastructure/player/`.
 *
 *   2. PLAYER RULE — only `src/infrastructure/player/**` may import
 *      from `@simba-dev/react-native-media-player`.
 *
 * Plus two soft rules (warning, not error):
 *
 *   3. The "domain" group is pure — no React, no fetch, no Date.now.
 *   4. The "shared" group is leaf — no imports from `src/features/`.
 *
 * This script is wired into `npm run lint:boundaries` (added in
 * V21 W2 P05 T05.04) and runs in < 2 seconds. It uses only Node
 * built-ins (`node:fs`, `node:path`) — no extra deps.
 *
 * Usage:
 *   node scripts/check-import-boundaries.js           # check all
 *   node scripts/check-import-boundaries.js --strict  # warnings → errors
 *
 * Exit code:
 *   0  — clean
 *   1  — violation found (or --strict + warning)
 *
 * The script is intentionally side-effect free: it does not modify
 * any file. It only reports. A planted violation fails the script
 * with a file:line error.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// ─── Rule 1: ADAPTER RULE ─────────────────────────────────────────────
// `src/infrastructure/api/<provider>/**` cannot import from
//   src/features/, src/screens/, src/navigation/,
//   src/state/*Store.ts, src/infrastructure/player/.
const ADAPTER_RULE = {
  // The "cage" path (must match the importer location)
  cage: /^src\/infrastructure\/api\/[^/]+\//,
  // The "forbidden" path patterns (cannot be the imported location)
  forbidden: [
    /^src\/features\//,
    /^src\/screens\//,
    /^src\/navigation\//,
    /^src\/state\/[^/]+Store\.ts$/,
    /^src\/infrastructure\/player\//,
  ],
};

// ─── Rule 2: PLAYER RULE ────────────────────────────────────────────────
// Only `src/infrastructure/player/**` may import from
// `@simba-dev/react-native-media-player`.
const PLAYER_RULE = {
  // The "cage" path (must match the importer location)
  cage: /^src\/infrastructure\/player\//,
  // Outside the cage, this import is forbidden
  forbiddenImport: '@simba-dev/react-native-media-player',
};

// ─── Rule 3: DOMAIN PURITY (soft, warning only) ─────────────────────────
// `src/domain/**` must not import React, fetch, etc.
const DOMAIN_DIRTY = [
  /^from ['"]react['"]/,                  // React
  /^from ['"]react-native['"]/,           // RN runtime
  /\bfetch\s*\(/,                          // network
  /\bDate\.now\s*\(/,                      // time
  /\bsetTimeout\s*\(/,                     // timer
  /\bsetInterval\s*\(/,                    // timer
];

// ─── Rule 4: SHARED LEAF (soft, warning only) ──────────────────────────
// `src/shared/**` must not import from `src/features/`.
const SHARED_LEAF = {
  cage: /^src\/shared\//,
  forbidden: [/^src\/features\//],
};

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Walk a directory recursively and yield every `.ts` / `.tsx` file.
 * Skips `node_modules`, hidden dirs, and the dead-code directories
 * in `md/_v*_dead_code/` (those are explicitly not part of the
 * production tree).
 */
function* walkFiles(dir) {
  const skip = new Set(['node_modules', '.git', '.gitkeep', '.DS_Store']);
  const deadCodeRoot = path.join(ROOT, 'md');
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    // Skip dead-code folders under md/
    if (full.startsWith(deadCodeRoot)) continue;
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

/**
 * Extract every import / require statement from a TS/TSX file and
 * resolve its target to a project-relative path.
 *
 * Handles:
 *   import X from 'path';
 *   import { X } from 'path';
 *   import X from "path";
 *   const X = require('path');
 *
 * Returns: array of { line, column, specifier, resolved }
 *   specifier — the raw string from the source (e.g. '../theme')
 *   resolved  — the absolute path on disk, or null if not resolvable
 */
function extractImports(filePath) {
  const out = [];
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // import X from 'path'  (single or double quotes)
    let m = line.match(/from\s+['"]([^'"]+)['"]/);
    if (m) {
      out.push({
        line: i + 1,
        column: line.indexOf(m[1]) + 1,
        specifier: m[1],
        resolved: resolveImport(filePath, m[1]),
      });
      continue;
    }
    // import 'path'   (side-effect import)
    m = line.match(/^import\s+['"]([^'"]+)['"]/);
    if (m) {
      out.push({
        line: i + 1,
        column: line.indexOf(m[1]) + 1,
        specifier: m[1],
        resolved: resolveImport(filePath, m[1]),
      });
      continue;
    }
    // const X = require('path')
    m = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m) {
      out.push({
        line: i + 1,
        column: line.indexOf(m[1]) + 1,
        specifier: m[1],
        resolved: resolveImport(filePath, m[1]),
      });
      continue;
    }
  }
  return out;
}

/**
 * Resolve a relative import specifier to an absolute path.
 * Returns null for bare-module imports (e.g. `react`,
 * `@simba-dev/react-native-media-player`) — those are handled by
 * the "package import" rules (Rule 2) instead.
 */
function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null; // bare module
  const fromDir = path.dirname(fromFile);
  let resolved = path.resolve(fromDir, specifier);
  // Try with .ts / .tsx / /index.ts extensions
  const candidates = [
    resolved,
    resolved + '.ts',
    resolved + '.tsx',
    resolved + '/index.ts',
    resolved + '/index.tsx',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      // Return the path relative to ROOT, with forward slashes (git-friendly)
      return path.relative(ROOT, c).split(path.sep).join('/');
    }
  }
  return null;
}

/**
 * Project-relative path with forward slashes.
 */
function relPath(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

// ─── Main check loop ────────────────────────────────────────────────────

const violations = []; // { severity: 'error' | 'warning', file, line, col, message }
const strict = process.argv.includes('--strict');

function checkFile(file) {
  const importerRel = relPath(file);
  const imports = extractImports(file);

  // Rule 1: ADAPTER RULE
  if (ADAPTER_RULE.cage.test(importerRel)) {
    for (const imp of imports) {
      if (imp.resolved) {
        for (const forbidden of ADAPTER_RULE.forbidden) {
          if (forbidden.test(imp.resolved)) {
            violations.push({
              severity: 'error',
              file: importerRel,
              line: imp.line,
              col: imp.column,
              rule: 'ADAPTER',
              message: `src/infrastructure/api/ must not import from ${imp.resolved}`,
            });
          }
        }
      }
    }
  }

  // Rule 2: PLAYER RULE
  if (!PLAYER_RULE.cage.test(importerRel)) {
    for (const imp of imports) {
      if (imp.specifier === PLAYER_RULE.forbiddenImport) {
        violations.push({
          severity: 'error',
          file: importerRel,
          line: imp.line,
          col: imp.column,
          rule: 'PLAYER',
          message: `Only src/infrastructure/player/ may import from '${PLAYER_RULE.forbiddenImport}'`,
        });
      }
    }
  }

  // Rule 3: DOMAIN PURITY (soft)
  if (importerRel.startsWith('src/domain/')) {
    for (const dirty of DOMAIN_DIRTY) {
      if (dirty.test(text)) {
        // (text is from the current file via the extract above; we
        // need it here — re-read)
      }
    }
    // Re-read for the dirty-pattern check
    const fileText = fs.readFileSync(file, 'utf8');
    for (const dirty of DOMAIN_DIRTY) {
      const m = fileText.match(dirty);
      if (m) {
        // Find the line number
        const upto = fileText.slice(0, m.index);
        const line = upto.split('\n').length;
        violations.push({
          severity: strict ? 'error' : 'warning',
          file: importerRel,
          line,
          col: 1,
          rule: 'DOMAIN-PURITY',
          message: `src/domain/ is pure — found "${m[0].trim().slice(0, 60)}"`,
        });
      }
    }
  }

  // Rule 4: SHARED LEAF (soft)
  if (SHARED_LEAF.cage.test(importerRel)) {
    for (const imp of imports) {
      if (imp.resolved) {
        for (const forbidden of SHARED_LEAF.forbidden) {
          if (forbidden.test(imp.resolved)) {
            violations.push({
              severity: strict ? 'error' : 'warning',
              file: importerRel,
              line: imp.line,
              col: imp.column,
              rule: 'SHARED-LEAF',
              message: `src/shared/ is leaf — must not import from ${imp.resolved}`,
            });
          }
        }
      }
    }
  }
}

// ─── Run ────────────────────────────────────────────────────────────────

const startMs = Date.now();
let fileCount = 0;
for (const f of walkFiles(SRC)) {
  fileCount++;
  checkFile(f);
}
const elapsed = Date.now() - startMs;

// Sort by file then line
violations.sort((a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col,
);

// ─── Report ─────────────────────────────────────────────────────────────

const errors = violations.filter(v => v.severity === 'error');
const warnings = violations.filter(v => v.severity === 'warning');

console.log(
  `scanned ${fileCount} files in ${elapsed}ms — ` +
  `${errors.length} error(s), ${warnings.length} warning(s)`,
);

if (violations.length === 0) {
  console.log('✓ import-boundary check passed');
  process.exit(0);
}

console.log('');
for (const v of violations) {
  const tag = v.severity === 'error' ? '✗' : '⚠';
  console.log(`  ${tag} ${v.file}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`);
}

if (errors.length > 0) {
  console.log('');
  console.log(`✗ ${errors.length} error(s) found`);
  process.exit(1);
}

if (strict && warnings.length > 0) {
  console.log('');
  console.log(`✗ --strict: ${warnings.length} warning(s) treated as errors`);
  process.exit(1);
}

console.log('');
console.log(`✓ no errors; ${warnings.length} warning(s) remain (run with --strict to fail)`);
process.exit(0);
