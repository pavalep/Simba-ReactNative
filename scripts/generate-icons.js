/**
 * Generate app icons with dark/light mode support.
 *
 * Design:
 *   - Lion logo: warm gold gradient fill (#FFF5E6 → #F5E6C8)
 *   - Dark theme: gold logo on black background
 *   - Light theme: gold logo on white background
 *   - NO enclosing shapes — just logo on background
 *   - System masking provides device-appropriate shape
 *
 * Android (API 26+): Uses adaptive icons with night-mode qualifier for
 *   automatic dark/light switching via ic_launcher_foreground.png +
 *   ic_launcher_background color drawable.
 * Android (API < 26): Falls back to combined PNGs (light mode only).
 * iOS: Combined PNGs (light mode — Apple doesn't support auto-switch).
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_PATH = path.resolve(__dirname, '..', '..',
  'DESKTOP_APP_AVALONIA', 'src', 'App', 'Assets', 'simba-logo.svg');
const RES_DIR = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const IOS_DIR = path.resolve(__dirname, '..', 'ios', 'CinePlayer', 'Images.xcassets', 'AppIcon.appiconset');

// ── Gold gradient for the lion logo ────────────────────────────────────
const GOLD_STOPS = [
  { offset: 0,   color: '#FFF5E6' },
  { offset: 100, color: '#F5E6C8' },
];

// ── Android density buckets ──────────────────────────────────────────
const ANDROID_SIZES = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const PLAYSTORE_SIZE = 512;

// ── iOS sizes ─────────────────────────────────────────────────────────
const IOS_SIZES = [
  { filename: 'icon-40.png',      size: 40   },
  { filename: 'icon-60.png',      size: 60   },
  { filename: 'icon-58.png',      size: 58   },
  { filename: 'icon-87.png',      size: 87   },
  { filename: 'icon-80.png',      size: 80   },
  { filename: 'icon-120.png',     size: 120  },
  { filename: 'icon-120-60.png',  size: 120  },
  { filename: 'icon-180.png',     size: 180  },
  { filename: 'icon-1024.png',    size: 1024 },
];

// ── Adaptive icon foreground resolution (xxxhdpi: 108dp × 4 = 432px) ─
const FOREGROUND_SIZE = 432;

// ── Helper: inject gold gradient into SVG ─────────────────────────────
function makeLogoSvg() {
  let svg = fs.readFileSync(SVG_PATH, 'utf-8');
  const defs = `<defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="80%" y2="100%">
        <stop offset="${GOLD_STOPS[0].offset}%" style="stop-color:${GOLD_STOPS[0].color}"/>
        <stop offset="${GOLD_STOPS[1].offset}%" style="stop-color:${GOLD_STOPS[1].color}"/>
      </linearGradient>
    </defs>`;
  svg = svg.replace(/currentColor/g, 'url(#logoGrad)');
  svg = svg.replace('>', '>' + defs);
  return svg;
}

// ── Render the lion to a transparent PNG buffer ───────────────────────
async function renderLionBuffer(targetSize) {
  const logoSvg = makeLogoSvg();
  return await sharp(Buffer.from(logoSvg))
    .resize(targetSize, targetSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

// ── Generate foreground-only PNG (lion on transparent) ────────────────
// Google spec: 108×108 dp viewport, 66×66 dp max logo (61.1%).
// At xxxhdpi (4x): 432×432 px → logo max 264×264 → 20% padding.
async function generateForeground(size, outputPath) {
  const padding = Math.round(size * 0.20);
  const logoSize = size - padding * 2;
  const half = size / 2;

  const logoBuf = await renderLionBuffer(logoSize);

  const canvas = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png().toBuffer();

  const composited = await sharp(canvas)
    .composite([{ input: logoBuf, top: half - logoSize / 2, left: half - logoSize / 2 }])
    .png()
    .toBuffer();

  await sharp(composited).toFile(outputPath);
}

// ── Generate combined icon (lion on a solid-color background) ────────
async function generateCombined(size, outputPath, bgColor) {
  // For fallback PNGs use 22% padding for balanced appearance
  const padding = Math.round(size * 0.22);
  const logoSize = size - padding * 2;
  const half = size / 2;

  // Solid background rectangle
  const bgSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${bgColor}"/>
  </svg>`;

  const logoBuf = await renderLionBuffer(logoSize);
  const bgBuf = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  const composited = await sharp(bgBuf)
    .composite([{ input: logoBuf, top: half - logoSize / 2, left: half - logoSize / 2 }])
    .png()
    .toBuffer();

  await sharp(composited).toFile(outputPath);
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  // ── 1. Foreground-only PNG for adaptive icons ────────────────────
  console.log('Adaptive-icon foreground PNG...');
  const drawableNodpi = path.join(RES_DIR, 'drawable-nodpi');
  if (!fs.existsSync(drawableNodpi)) fs.mkdirSync(drawableNodpi, { recursive: true });
  await generateForeground(FOREGROUND_SIZE, path.join(drawableNodpi, 'ic_launcher_foreground.png'));
  console.log(`  ✓ ic_launcher_foreground.png  ${FOREGROUND_SIZE}x${FOREGROUND_SIZE}`);

  // Also generate splash-sized foreground (larger, ~576px = 144dp at xxhdpi)
  await generateForeground(576, path.join(drawableNodpi, 'ic_splash_logo.png'));
  console.log('  ✓ ic_splash_logo.png  576x576');

  // ── 2. Android combined PNGs (fallback for API < 26) — light mode ─
  console.log('\nAndroid fallback icons (light mode — white bg)...');
  for (const { dir, size } of ANDROID_SIZES) {
    const outDir = path.join(RES_DIR, dir);
    await generateCombined(size, path.join(outDir, 'ic_launcher.png'), '#FFFFFF');
    fs.copyFileSync(
      path.join(outDir, 'ic_launcher.png'),
      path.join(outDir, 'ic_launcher_round.png'),
    );
    console.log(`  ✓ ${dir}  ${size}x${size}`);
  }

  // ── 3. Play Store icon (light mode) ──────────────────────────────
  const playstorePath = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'playstore-icon.png');
  await generateCombined(PLAYSTORE_SIZE, playstorePath, '#FFFFFF');
  console.log(`  ✓ playstore-icon.png  ${PLAYSTORE_SIZE}x${PLAYSTORE_SIZE}`);

  // ── 4. iOS icons (always light mode — no auto-switch) ────────────
  console.log('\niOS icons (light mode)...');
  for (const { filename, size } of IOS_SIZES) {
    await generateCombined(size, path.join(IOS_DIR, filename), '#FFFFFF');
    console.log(`  ✓ ${filename}  ${size}x${size}`);
  }

  console.log('\n✓ All icons generated!');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
