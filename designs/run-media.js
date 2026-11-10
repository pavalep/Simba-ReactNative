// Run the Penpot MEDIA calls — the uploads — and record what went up.
//
// The store (`designs/.build/penpot-media-ids.json`) is the ONE owner of the
// media ids. The numbered per-call result files were a second owner, and
// they clobbered each other: a later call wrote `penpot-media-result-1.json`
// and overwrote the ids a previous call had reported, so the build lost five
// media and then failed with "no media for ph.rail2". The files are still
// written (the build reads them as a fallback) but they may never override
// the store.
//
// The store also carries the FINGERPRINT of the picture that was uploaded —
// the sha1 of the exact bytes that went to Penpot. That is the only way the
// build can tell "this id is the picture on disk" from "this id is the
// picture that was on disk when it was uploaded". Without it a picture that
// changed on disk kept its old upload and the board never caught up.
//
// Usage:
//   node designs/run-media.js <path-to-the-mcp-probe.js>
//
// The probe is the transport that talks to the Penpot MCP endpoint; it is
// not part of this repository because the endpoint's URL and key live in the
// agent's own MCP settings. Its path may also come from $PENPOT_PROBE.

const crypto = require('crypto');
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const BUILD = path.join(__dirname, '.build');
const STORE = path.join(BUILD, 'penpot-media-ids.json');
const FINGERPRINTS = path.join(BUILD, 'media-fingerprints.json');

const probe = process.argv[2] || process.env.PENPOT_PROBE;
if (!probe) {
  console.error('usage: node designs/run-media.js <path-to-the-mcp-probe.js>');
  console.error('   (or set $PENPOT_PROBE)');
  process.exit(1);
}
if (!fs.existsSync(probe)) {
  console.error('no probe at ' + probe);
  process.exit(1);
}

/** The sha1 of the bytes that were uploaded — the same shape as the build's fingerprint. */
function fingerprintOfBytes(bytes) {
  return crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 16);
}

/**
 * The pictures a media payload carries, and the bytes of each.
 *
 * The payload is a plugin script with the plan JSON-encoded into it, so the
 * base64 is read back out of the text. Base64 is [A-Za-z0-9+/=] and never
 * contains a quote, so the match is unambiguous.
 */
function picturesIn(code) {
  const out = new Map();
  const re = /"([A-Za-z0-9._-]+)":\{"mime":"[^"]*","b64":"([A-Za-z0-9+/=]+)"/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    out.set(m[1], Buffer.from(m[2], 'base64'));
  }
  return out;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

const payloads = fs
  .readdirSync(BUILD)
  .filter(f => /^penpot-app-media-\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.match(/(\d+)\.json$/)[1], 10) - parseInt(b.match(/(\d+)\.json$/)[1], 10));

if (!payloads.length) {
  console.log('no media payload to upload — run `node designs/build-penpot-app.js` first');
  process.exit(0);
}

const store = readJson(STORE, {});
const fingerprints = readJson(FINGERPRINTS, {});

console.log('media: ' + payloads.length + ' call(s)');
for (const f of payloads) {
  const n = f.match(/-(\d+)\.json$/)[1];
  const out = path.join(BUILD, 'penpot-media-result-' + n + '.json');
  const started = Date.now();

  let stdout = '';
  try {
    stdout = execFileSync('node', [probe, 'callfile-out', 'execute_code', path.join(BUILD, f), out], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    console.error('FAILED ' + f + ' :: ' + String(e.message).slice(0, 400));
    if (e.stdout) console.error(String(e.stdout).slice(0, 2000));
    process.exit(1);
  }

  const parsed = readJson(out, null);
  if (!parsed) {
    console.error('  ' + f + ' -> unreadable result: ' + String(stdout || '').slice(0, 400));
    process.exit(1);
  }
  const result = parsed.result || parsed;

  // The bytes this batch carries — they are what Penpot is about to hold.
  const pictures = picturesIn(readJson(path.join(BUILD, f), {}).code || '');

  let uploaded = 0;
  for (const [key, value] of Object.entries(result)) {
    if (!value || !value.id) continue;
    const bytes = pictures.get(key);
    store[key] = {
      id: value.id,
      width: value.width,
      height: value.height,
      mtype: value.mtype,
      fingerprint: bytes ? fingerprintOfBytes(bytes) : null,
    };
    if (bytes) fingerprints[key] = store[key].fingerprint;
    uploaded++;
  }

  fs.writeFileSync(STORE, JSON.stringify(store, null, 2));
  fs.writeFileSync(FINGERPRINTS, JSON.stringify(fingerprints, null, 2));
  console.log(
    '  ' + f + '  ' + ((Date.now() - started) / 1000).toFixed(1) + 's  uploaded ' + uploaded +
      '   store now ' + Object.keys(store).length,
  );
}
console.log('done media — store holds ' + Object.keys(store).length + ' media');
