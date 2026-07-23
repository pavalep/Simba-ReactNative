/**
 * Explore GetIllustrations MeiliSearch API
 */
const MEILISEARCH_URL = 'https://getillustrations.com/meili';
const API_KEY = 'gi_free_f94a299439f2a8acdc633abbbae60a22050aaf5332fd5e0af59057dca3be6b78';

async function get(path) {
  const url = `${MEILISEARCH_URL}${path}`;
  console.log(`\nGET ${url}`);
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  console.log(`Status: ${res.status}`);
  const text = await res.text();
  console.log(`Response (${text.length} chars):`, text.slice(0, 2000));
  return text;
}

async function post(path, body) {
  const url = `${MEILISEARCH_URL}${path}`;
  console.log(`\nPOST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  console.log(`Status: ${res.status}`);
  const text = await res.text();
  console.log(`Response (${text.length} chars):`, text.slice(0, 2000));
  return text;
}

async function main() {
  // 1. Health check
  await get('/health');
  
  // 2. List indexes
  await get('/indexes');
  
  // 3. Try the 'icons' index - get one doc
  let indexes = [];
  try {
    const idxRes = await get('/indexes');
    indexes = JSON.parse(idxRes);
  } catch(e) {}
  
  for (const idx of indexes) {
    const uid = idx.uid;
    console.log(`\n--- Index: ${uid} ---`);
    
    // Try searching with different formats
    await post(`/indexes/${uid}/search`, { q: 'home', limit: 1 });
    
    // Also try GET search
    await get(`/indexes/${uid}/search?q=home&limit=1`);
    
    // Try getting documents
    await get(`/indexes/${uid}/documents?limit=1`);
    
    break; // just try the first one
  }
}

main().catch(console.error);
