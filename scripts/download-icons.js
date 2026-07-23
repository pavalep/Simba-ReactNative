/**
 * Download icon PNGs from GetIllustrations via MeiliSearch API
 * 
 * Usage: node scripts/download-icons.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MEILISEARCH_URL = process.env.MEILISEARCH_URL || 'https://getillustrations.com/meili';
const API_KEY = process.env.MEILISEARCH_MASTER_KEY || 'gi_free_f94a299439f2a8acdc633abbbae60a22050aaf5332fd5e0af59057dca3be6b78';
const ASSETS_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'images', 'icons');

// Ensure output directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

/**
 * Make a JSON request to MeiliSearch
 */
function searchMeili(index, query, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${MEILISEARCH_URL}/indexes/${index}/search`);
    const body = JSON.stringify({ q: query, limit: options.limit || 20, ...options });
    
    const u = new URL(MEILISEARCH_URL);
    const client = u.protocol === 'https:' ? https : http;
    
    const req = client.request(
      url.toString(),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Download a file from URL
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, { headers: { 'Authorization': `Bearer ${API_KEY}` } }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(destPath);
        if (stats.size === 0) {
          fs.unlinkSync(destPath);
          reject(new Error(`Empty file: ${destPath}`));
        } else {
          console.log(`  ✓ Downloaded (${(stats.size / 1024).toFixed(1)} KB): ${path.basename(destPath)}`);
          resolve(destPath);
        }
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/**
 * Search for an icon and download the first good match as PNG
 */
async function findAndDownloadIcon(searchQuery, outputName, options = {}) {
  console.log(`\n🔍 Searching "${searchQuery}" for → ${outputName}.png`);
  
  try {
    const result = await searchMeili('icons', searchQuery, { limit: 15 });
    
    if (!result.hits || result.hits.length === 0) {
      console.log(`  ✗ No results for "${searchQuery}"`);
      return null;
    }
    
    // Try to find the best match
    for (const hit of result.hits) {
      // Look for PNG or SVG download URLs
      const pngUrl = hit.png_url || hit.png || hit.image_url || hit.image;
      const svgUrl = hit.svg_url || hit.svg;
      const downloadUrl = hit.download_url || hit.url;
      
      const iconUrl = pngUrl || svgUrl || downloadUrl;
      if (!iconUrl) continue;
      
      const destPath = path.join(ASSETS_DIR, outputName);
      
      try {
        await downloadFile(iconUrl, destPath);
        return destPath;
      } catch (dlErr) {
        console.log(`  ✗ Failed to download from ${iconUrl}: ${dlErr.message}`);
        continue;
      }
    }
    
    console.log(`  ✗ No downloadable URL found for "${searchQuery}"`);
    return null;
  } catch (err) {
    console.log(`  ✗ Error searching "${searchQuery}": ${err.message}`);
    return null;
  }
}

/**
 * Search for icon packs and get icons from them
 */
async function findIconsFromPack(packQuery, iconNames, outputMap) {
  console.log(`\n📦 Searching pack "${packQuery}"...`);
  
  try {
    const result = await searchMeili('icon_packs', packQuery, { limit: 5 });
    
    if (!result.hits || result.hits.length === 0) {
      console.log(`  ✗ No packs found for "${packQuery}"`);
      return {};
    }
    
    console.log(`  Found pack: ${result.hits[0].name || result.hits[0].title || result.hits[0].id}`);
    return result.hits[0];
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== Downloading replacement icons from GetIllustrations ===\n');
  console.log(`Output directory: ${ASSETS_DIR}`);
  
  // First, let's explore what icon formats are available
  console.log('\n--- Exploring available icon data format ---');
  try {
    const testSearch = await searchMeili('icons', 'home', { limit: 3 });
    if (testSearch.hits && testSearch.hits.length > 0) {
      console.log('Sample icon data keys:', Object.keys(testSearch.hits[0]).join(', '));
      console.log('Sample icon data (abbreviated):', JSON.stringify(testSearch.hits[0]).slice(0, 500));
    }
  } catch (e) {
    console.log('Sample search failed:', e.message);
  }
  
  // Icon search queries - we'll search for each icon type
  const iconMap = [
    // Tab bar icons - need gold (active) and gray (inactive) variants
    { query: 'home icon bold', output: 'ui_home_gold.png' },
    { query: 'home icon outline', output: 'ui_home_gray.png' },
    { query: 'music note icon bold', output: 'ui_music_gold.png' },
    { query: 'music note icon outline', output: 'ui_music_gray.png' },
    { query: 'film video icon bold', output: 'ui_videos_gold.png' },
    { query: 'film video icon outline', output: 'ui_videos_gray.png' },
    { query: 'settings gear icon bold', output: 'ui_settings_gold.png' },
    { query: 'settings gear icon outline', output: 'ui_settings_gray.png' },
    
    // Top bar icons
    { query: 'lion head icon', output: 'ui_lion_gold.png' },
    { query: 'bell notification icon', output: 'ui_bell_gray.png' },
    { query: 'folder icon outline', output: 'ui_folder_black.png' },
    
    // Other icons
    { query: 'play button icon', output: 'ic_play.png' },
    { query: 'folder icon', output: 'ic_folder.png' },
    { query: 'music note icon', output: 'ic_music.png' },
  ];
  
  const results = [];
  for (const item of iconMap) {
    const destPath = await findAndDownloadIcon(item.query, item.output);
    results.push({ ...item, success: !!destPath, path: destPath });
  }
  
  console.log('\n\n=== Summary ===');
  let success = 0;
  let failed = 0;
  for (const r of results) {
    if (r.success) {
      console.log(`  ✓ ${r.output} ← "${r.query}"`);
      success++;
    } else {
      console.log(`  ✗ ${r.output} ← "${r.query}" (FAILED)`);
      failed++;
    }
  }
  console.log(`\n${success} downloaded, ${failed} failed`);
}

main().catch(console.error);
