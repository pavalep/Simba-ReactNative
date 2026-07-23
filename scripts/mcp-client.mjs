/**
 * Direct MCP client for @getillustrations/mcp-server
 * Spawns the server, sends JSON-RPC requests, gets results.
 */
import { spawn } from 'child_process';

const API_KEY = 'gi_free_f94a299439f2a8acdc633abbbae60a22050aaf5332fd5e0af59057dca3be6b78';

let reqId = 0;
let pending = {};

function sendRequest(proc, method, params = {}) {
  return new Promise((resolve, reject) => {
    reqId++;
    const msg = JSON.stringify({ jsonrpc: '2.0', id: reqId, method, params }) + '\n';
    pending[reqId] = { resolve, reject, timeout: setTimeout(() => {
      delete pending[reqId];
      reject(new Error(`Request ${method} timed out`));
    }, 30000) };
    proc.stdin.write(msg);
  });
}

async function main() {
  console.log('=== Starting @getillustrations/mcp-server ===\n');
  
  const mcpServerPath = new URL('../node_modules/@getillustrations/mcp-server/dist/index.js', import.meta.url).pathname;
  const proc = spawn('node', [mcpServerPath], {
    env: {
      ...process.env,
      MEILISEARCH_URL: 'https://getillustrations.com/meili',
      MEILISEARCH_MASTER_KEY: API_KEY,
    },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  let buffer = '';
  proc.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        console.log(`< ${msg.method || 'response'} id=${msg.id || 'n/a'}`);
        if (msg.id && pending[msg.id]) {
          clearTimeout(pending[msg.id].timeout);
          if (msg.error) {
            pending[msg.id].reject(new Error(JSON.stringify(msg.error)));
          } else {
            pending[msg.id].resolve(msg.result);
          }
          delete pending[msg.id];
        }
      } catch (e) {}
    }
  });

  proc.on('error', (err) => console.error('Process error:', err));

  // Wait for server to be ready
  await new Promise(r => setTimeout(r, 2000));

  try {
    // 1. Initialize
    console.log('\n--- Sending initialize ---');
    const initResult = await sendRequest(proc, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'simba-player', version: '1.0.0' },
    });
    console.log('Server info:', JSON.stringify(initResult).slice(0, 300));

    // 2. Send initialized notification
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

    // 3. List tools
    console.log('\n--- Listing tools ---');
    const tools = await sendRequest(proc, 'tools/list');
    console.log('Available tools:');
    for (const tool of tools.tools) {
      console.log(`  - ${tool.name}(${tool.inputSchema?.properties ? Object.keys(tool.inputSchema.properties).join(', ') : 'no params'})`);
    }

    // 4. Search for icons
    const searches = [
      'home',
      'music note',
      'video film',
      'settings gear',
      'bell notification',
      'folder',
      'play button',
      'lion head',
    ];

    for (const q of searches) {
      console.log(`\n--- Search: "${q}" ---`);
      try {
        const result = await sendRequest(proc, 'tools/call', {
          name: 'search_icons',
          arguments: { query: q, limit: 3 },
        });
        console.log('Result:', JSON.stringify(result).slice(0, 1000));
      } catch (e) {
        // Try other tool names
        try {
          const result = await sendRequest(proc, 'tools/call', {
            name: 'search',
            arguments: { query: q, limit: 3, type: 'icon' },
          });
          console.log('Result:', JSON.stringify(result).slice(0, 1000));
        } catch (e2) {
          // Try generic search
          try {
            const result = await sendRequest(proc, 'resources/list', {});
            console.log('Resources:', JSON.stringify(result).slice(0, 500));
          } catch(e3) {
            console.log(`Failed all attempts for "${q}":`, e.message);
          }
        }
      }
    }

  } catch (e) {
    console.error('Error:', e.message);
  }

  // Cleanup
  proc.stdin.end();
  setTimeout(() => proc.kill(), 1000);
}

main().catch(console.error);
