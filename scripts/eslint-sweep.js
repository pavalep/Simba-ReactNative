/* eslint-sweep.js — full eslint sweep with per-file warning counts */
const {execFileSync} = require('child_process');
const path = require('path');

const root = process.cwd();
let raw = '';
try {
  raw = execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js'),
      'src/**/*.{ts,tsx}',
      '--format',
      'json',
    ],
    {cwd: root, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8'},
  ).toString();
} catch (e) {
  // eslint exits 1 when findings exist; JSON is on stdout
  raw = (e.stdout || '').toString();
}

const norm = p => p.toLowerCase().replace(/\//g, '\\');

let results = [];
try {
  results = JSON.parse(raw);
} catch {
  console.log('NO_JSON_OUTPUT');
  process.exit(2);
}

const perFile = new Map();
let errors = 0;
let warnings = 0;
for (const f of results) {
  const rel = norm(path.relative(root, f.filePath));
  const errs = (f.messages || []).filter(m => m.severity === 2);
  const warns = (f.messages || []).filter(m => m.severity === 1);
  if (errs.length || warns.length) {
    perFile.set(rel, {errors: errs.length, warnings: warns.length});
  }
  errors += errs.length;
  warnings += warns.length;
}

console.log(`TOTAL errors=${errors} warnings=${warnings}`);
const sorted = [...perFile.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [file, counts] of sorted) {
  console.log(`${counts.errors}E/${counts.warnings}W  ${file}`);
}

// Print all error messages for quick triage
if (errors > 0) {
  console.log('--- ERROR DETAILS ---');
  for (const f of results) {
    const rel = norm(path.relative(root, f.filePath));
    for (const m of f.messages || []) {
      if (m.severity === 2) {
        console.log(`${rel}:${m.line}:${m.column} ${m.ruleId} ${m.message}`);
      }
    }
  }
}
process.exit(errors > 0 ? 1 : 0);
