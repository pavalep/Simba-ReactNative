/**
 * Quick test script to search GetIllustrations MeiliSearch API
 * Usage: node scripts/search-icons.mjs <search-term>
 */
const { env } = process;

const MEILISEARCH_URL = env.MEILISEARCH_URL || 'https://getillustrations.com/meili';
const API_KEY = env.MEILISEARCH_MASTER_KEY || 'gi_free_f94a299439f2a8acdc633abbbae60a22050aaf5332fd5e0af59057dca3be6b78';

const searchTerm = process.argv[2] || 'home icon';
const limit = parseInt(process.argv[3] || '5');

async function search(index, query) {
  const url = `${MEILISEARCH_URL}/indexes/${index}/search`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, limit }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

async function main() {
  console.log(`\n=== Searching "${searchTerm}" in icons index ===\n`);
  
  try {
    // First, let's discover what indexes are available
    const indexesRes = await fetch(`${MEILISEARCH_URL}/indexes`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    if (indexesRes.ok) {
      const indexes = await indexesRes.json();
      console.log('Available indexes:', indexes.map(i => i.uid).join(', '));
    }
  } catch (e) {
    console.log('Could not list indexes:', e.message);
  }
  
  // Search icons
  try {
    const result = await search('icons', searchTerm);
    console.log(`Found ${result.hits?.length || 0} results\n`);
    
    if (result.hits && result.hits.length > 0) {
      // Show all keys for the first hit
      const first = result.hits[0];
      console.log('--- All fields of first result ---');
      for (const [key, val] of Object.entries(first)) {
        const display = typeof val === 'string' ? val.slice(0, 200) : JSON.stringify(val).slice(0, 200);
        console.log(`  ${key}: ${display}`);
      }
      
      console.log('\n--- All results ---');
      result.hits.forEach((hit, i) => {
        const name = hit.name || hit.title || hit.id || hit.icon_name || 'unnamed';
        const lib = hit.library || hit.pack || hit.icon_pack || '';
        console.log(`\n  [${i+1}] ${name} ${lib ? `(${lib})` : ''}`);
        // Show all URL-like fields
        for (const [key, val] of Object.entries(hit)) {
          if (typeof val === 'string' && (val.startsWith('http') || val.endsWith('.png') || val.endsWith('.svg'))) {
            console.log(`       ${key}: ${val.slice(0, 150)}`);
          }
        }
      });
    }
  } catch (e) {
    console.error('Search failed:', e.message);
  }
}

main().catch(console.error);
