const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_PATH = path.resolve(__dirname, '..', '..', 'DESKTOP_APP_AVALONIA', 'src', 'App', 'Assets', 'simba-logo.svg');
const OUT_LIGHT_PATH = path.resolve(__dirname, '..', 'src', 'assets', 'images', 'common', 'simba-logo-light.png');
const OUT_DARK_PATH = path.resolve(__dirname, '..', 'src', 'assets', 'images', 'common', 'simba-logo-dark.png');
const ICON_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'images', 'icons');
const SIZE = 200;
const PADDING = Math.round(SIZE * 0.14);
const LOGO_SIZE = SIZE - PADDING * 2;
const HALF = SIZE / 2;

function makeLogoSvgGold() {
  let svg = fs.readFileSync(SVG_PATH, 'utf-8');
  const def = `<defs>
      <linearGradient id="lg" x1="0%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%"   style="stop-color:#FFF2C2"/>
        <stop offset="55%"  style="stop-color:#D4AF37"/>
        <stop offset="100%" style="stop-color:#8A6F0A"/>
      </linearGradient>
    </defs>`;
  svg = svg.replace(/currentColor/g, 'url(#lg)');
  svg = svg.replace('>', '>' + def);
  return svg;
}

function makeLogoSvgBlack() {
  let svg = fs.readFileSync(SVG_PATH, 'utf-8');
  svg = svg.replace(/currentColor/g, '#111111');
  return svg;
}

async function renderLogoPng(logoSvg, outPath) {
  const logoBuf = await sharp(Buffer.from(logoSvg))
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const canvas = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).png().toBuffer();

  const result = await sharp(canvas)
    .composite([{
      input: logoBuf,
      top: Math.round(HALF - LOGO_SIZE / 2),
      left: Math.round(HALF - LOGO_SIZE / 2),
    }])
    .png()
    .toFile(outPath);

  return result;
}

async function renderIconPng(svg, size, outPath) {
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}})
    .png()
    .toBuffer();
  await sharp(buf).toFile(outPath);
}

function iconSvgPlay() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 7.5V16.5L16.5 12L9 7.5Z" fill="#000"/>
  </svg>`;
}

function iconSvgFolder() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 7.5C3.5 6.395 4.395 5.5 5.5 5.5H10.2L12 7.5H18.5C19.605 7.5 20.5 8.395 20.5 9.5V16.5C20.5 17.605 19.605 18.5 18.5 18.5H5.5C4.395 18.5 3.5 17.605 3.5 16.5V7.5Z" fill="#000"/>
  </svg>`;
}

function iconSvgMusic() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 4V14.2C13.55 13.86 12.98 13.66 12.36 13.66C10.78 13.66 9.5 14.94 9.5 16.52C9.5 18.1 10.78 19.38 12.36 19.38C13.94 19.38 15.22 18.1 15.22 16.52V8.2L18.5 7.35V5.2L14 4Z" fill="#000"/>
  </svg>`;
}

function iconSvgMusicOutline(color) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 4V14.2" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M14 7.7L18.6 6.5V8.6L14 9.8" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M12.1 19.2C13.45 19.2 14.55 18.1 14.55 16.75C14.55 15.4 13.45 14.3 12.1 14.3C10.75 14.3 9.65 15.4 9.65 16.75C9.65 18.1 10.75 19.2 12.1 19.2Z" stroke="${color}" stroke-width="1.8" fill="none"/>
  </svg>`;
}

function iconSvgLion(color) {
  let svg = fs.readFileSync(SVG_PATH, 'utf-8');
  svg = svg.replace(/currentColor/g, color);
  return svg;
}

function iconSvgHome(color) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 11L12 4L20.5 11" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M6.5 10.5V20H17.5V10.5" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M10.2 20V14.6H13.8V20" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

function iconSvgVideo(color) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="4.5" y="6.5" width="15" height="11" rx="2.5" stroke="${color}" stroke-width="1.8" fill="none"/>
    <path d="M10.3 10.2V13.8L13.6 12L10.3 10.2Z" fill="${color}"/>
  </svg>`;
}

function iconSvgSettings(color) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15.3C13.822 15.3 15.3 13.822 15.3 12C15.3 10.178 13.822 8.7 12 8.7C10.178 8.7 8.7 10.178 8.7 12C8.7 13.822 10.178 15.3 12 15.3Z" stroke="${color}" stroke-width="1.8" fill="none"/>
    <path d="M19.2 12.9V11.1L17.6 10.8C17.45 10.3 17.25 9.85 17 9.43L17.9 8.1L16.6 6.8L15.27 7.7C14.85 7.45 14.4 7.25 13.9 7.1L13.6 5.5H10.4L10.1 7.1C9.6 7.25 9.15 7.45 8.73 7.7L7.4 6.8L6.1 8.1L7 9.43C6.75 9.85 6.55 10.3 6.4 10.8L4.8 11.1V12.9L6.4 13.2C6.55 13.7 6.75 14.15 7 14.57L6.1 15.9L7.4 17.2L8.73 16.3C9.15 16.55 9.6 16.75 10.1 16.9L10.4 18.5H13.6L13.9 16.9C14.4 16.75 14.85 16.55 15.27 16.3L16.6 17.2L17.9 15.9L17 14.57C17.25 14.15 17.45 13.7 17.6 13.2L19.2 12.9Z" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

function iconSvgBell(color) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 21C13.1 21 14 20.1 14 19H10C10 20.1 10.9 21 12 21Z" fill="${color}"/>
    <path d="M18 16.5H6C7.2 15.2 7.5 13.8 7.5 11.2C7.5 8.3 9.4 6.3 12 6.3C14.6 6.3 16.5 8.3 16.5 11.2C16.5 13.8 16.8 15.2 18 16.5Z" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

function iconSvgFolderOutline(color) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 7.7C4.5 6.6 5.4 5.7 6.5 5.7H10.2L12 7.7H17.5C18.6 7.7 19.5 8.6 19.5 9.7V16.3C19.5 17.4 18.6 18.3 17.5 18.3H6.5C5.4 18.3 4.5 17.4 4.5 16.3V7.7Z" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

async function main() {
  fs.mkdirSync(ICON_DIR, {recursive: true});

  const light = await renderLogoPng(makeLogoSvgBlack(), OUT_LIGHT_PATH);
  const dark = await renderLogoPng(makeLogoSvgGold(), OUT_DARK_PATH);

  await renderIconPng(iconSvgPlay(), 64, path.join(ICON_DIR, 'ic_play.png'));
  await renderIconPng(iconSvgFolder(), 64, path.join(ICON_DIR, 'ic_folder.png'));
  await renderIconPng(iconSvgMusic(), 64, path.join(ICON_DIR, 'ic_music.png'));

  const gold = '#E4A741';
  const gray = '#8B8B8B';
  const black = '#111111';

  await renderIconPng(iconSvgLion(gold), 24, path.join(ICON_DIR, 'ui_lion_gold.png'));
  await renderIconPng(iconSvgBell(gray), 24, path.join(ICON_DIR, 'ui_bell_gray.png'));
  await renderIconPng(iconSvgFolderOutline(black), 24, path.join(ICON_DIR, 'ui_folder_black.png'));

  await renderIconPng(iconSvgHome(gold), 24, path.join(ICON_DIR, 'ui_home_gold.png'));
  await renderIconPng(iconSvgHome(gray), 24, path.join(ICON_DIR, 'ui_home_gray.png'));

  await renderIconPng(iconSvgMusicOutline(gold), 24, path.join(ICON_DIR, 'ui_music_gold.png'));
  await renderIconPng(iconSvgMusicOutline(gray), 24, path.join(ICON_DIR, 'ui_music_gray.png'));

  await renderIconPng(iconSvgVideo(gold), 24, path.join(ICON_DIR, 'ui_videos_gold.png'));
  await renderIconPng(iconSvgVideo(gray), 24, path.join(ICON_DIR, 'ui_videos_gray.png'));

  await renderIconPng(iconSvgSettings(gold), 24, path.join(ICON_DIR, 'ui_settings_gold.png'));
  await renderIconPng(iconSvgSettings(gray), 24, path.join(ICON_DIR, 'ui_settings_gray.png'));

  console.log('simba-logo-light.png generated:', light.width + 'x' + light.height, light.size + ' bytes');
  console.log('simba-logo-dark.png generated:', dark.width + 'x' + dark.height, dark.size + ' bytes');
}

main().catch(e => { console.error(e); process.exit(1); });
