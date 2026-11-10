// Run the Penpot MCP calls of one pass, in order, and report each one.
//
// The passes are the pipeline, and their order is the pipeline:
//
//   build  — draw the boards (a board build removes and recreates the boards
//            it owns, so it destroys the flow)
//   links  — draw the connectors (they refer to the boards by id)
//   flow   — create the app flow (every pass before it removes the flows)
//
// Usage:
//   node designs/run-mcp.js <build|links|flow> <path-to-the-mcp-probe.js>
//
// The probe is the transport that talks to the Penpot MCP endpoint; it is
// not part of this repository because the endpoint's URL and key live in the
// agent's own MCP settings. Its path may also come from $PENPOT_PROBE.

const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD = path.join(__dirname, '.build');

const mode = process.argv[2] || 'build';
const probe = process.argv[3] || process.env.PENPOT_PROBE;
if (!probe) {
  console.error('usage: node designs/run-mcp.js <build|links|flow> <path-to-the-mcp-probe.js>');
  console.error('   (or set $PENPOT_PROBE)');
  process.exit(1);
}
if (!fs.existsSync(probe)) {
  console.error('no probe at ' + probe);
  process.exit(1);
}

const files = fs
  .readdirSync(BUILD)
  .filter(f => f.startsWith('penpot-app-' + mode + '-') && f.endsWith('.json'))
  .sort((a, b) => {
    const na = parseInt(a.match(/-(\d+)\.json$/)[1], 10);
    const nb = parseInt(b.match(/-(\d+)\.json$/)[1], 10);
    return na - nb;
  });

if (!files.length) {
  console.log(mode + ': nothing to do — run `node designs/build-penpot-app.js` first');
  process.exit(0);
}

console.log(mode + ': ' + files.length + ' calls');

for (const f of files) {
  const out = path.join(BUILD, 'result-' + mode + '-' + f.replace(/^penpot-app-/, ''));
  const started = Date.now();
  let stdout = '';
  let failed = null;
  // One retry. A call can fail for a reason that passes — the plugin answers
  // "the tab appears to be suspended" until it is woken, and a call that
  // times out on the 120-second ceiling leaves the renderer in a state where
  // the next call can hang too (measured 2026-11-10: one call of the build
  // pass timed out and every call after it failed).
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      stdout = execFileSync('node', [probe, 'callfile-out', 'execute_code', path.join(BUILD, f), out], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
      failed = null;
      break;
    } catch (e) {
      failed = e;
      if (attempt === 1) console.log('  ' + f + ' failed — retrying in 5 s');
    }
  }
  if (failed) {
    console.log('FAILED ' + f + ' :: ' + String(failed.message).slice(0, 300));
    if (failed.stdout) console.log(String(failed.stdout).slice(0, 1500));
    process.exit(1);
  }
  let parsed = null;
  try {
    parsed = JSON.parse(fs.readFileSync(out, 'utf8'));
  } catch (e) {
    console.log('  ' + f + ' -> unreadable result: ' + String(stdout || e.message).slice(0, 300));
    continue;
  }
  const r = parsed.result || parsed;
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const bits = [];
  if (r.links) bits.push('links+' + r.links.length);
  if (r.skipped) bits.push('skipped+' + r.skipped.length);
  if (r.errors && r.errors.length) bits.push('ERRORS ' + r.errors.length);
  if (r.boards) bits.push('boards+' + r.boards.length);
  if (r.flow) bits.push('flow:' + r.flow.name);
  console.log('  ' + f + '  ' + secs + 's  ' + bits.join('  '));
  if (r.errors && r.errors.length) {
    for (const e of r.errors.slice(0, 8)) console.log('      ! ' + e);
  }
}
console.log('done ' + mode);
