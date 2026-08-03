#!/usr/bin/env node
/**
 * Generates Trae MCP tool descriptor JSON files for codegraph and graphify.
 * Queries each MCP server's tools/list response and writes descriptor files
 * in the Trae MCP cache directory.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TRAE_BASE = 'C:\\Users\\paval\\.trae\\mcps\\s_SIMBA-eafba05e\\solo_agent';
const WORKSPACE = 'X:\\Development\\SIMBA\\MOBILE_APP_REACT_NATIVE';

async function queryMcpServer(command, args) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: { tools: {} },
        clientInfo: { name: 'descriptor-gen', version: '1.0' } },
    }) + '\n' + JSON.stringify({
      jsonrpc: '2.0', id: 2, method: 'tools/list',
    }) + '\n';

    const proc = spawn(command, args, { stdio: ['pipe','pipe','pipe'], shell: true });
    let stdout = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stdin.write(payload);
    proc.stdin.end();
    setTimeout(() => {
      proc.kill();
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2 && msg.result && msg.result.tools) {
            resolve(msg.result.tools);
            return;
          }
        } catch(e) {}
      }
      resolve([]);
    }, 5000);
    proc.on('error', reject);
  });
}

function convertToolSchema(tool) {
  const schema = (tool.inputSchema && tool.inputSchema.properties) || {};
  const required = (tool.inputSchema && tool.inputSchema.required) || [];
  const properties = {};
  for (const [key, val] of Object.entries(schema)) {
    const prop = {
      description: val.description || '',
      type: val.type || 'string',
    };
    if (val.enum) prop.enum = val.enum;
    if (val.items) prop.items = val.items;
    if (val.properties) prop.properties = val.properties;
    if (val.required) prop.required = val.required;
    if (val.default !== undefined) prop.default = val.default;
    if (val.description) prop.description = val.description;
    properties[key] = prop;
  }
  return {
    name: tool.name,
    description: tool.description || '',
    arguments: {
      additionalProperties: false,
      properties,
      required,
      type: 'object'
    }
  };
}

async function run() {
  const servers = [
    { name: 'codegraph',
      command: 'codegraph',
      args: ['serve', '--mcp', '--path', WORKSPACE] },
    { name: 'graphify',
      command: 'node',
      args: [WORKSPACE + '\\scripts\\graphify-mcp.mjs',
             '--graph', WORKSPACE + '\\graphify-out\\graph.json'] },
  ];

  for (const server of servers) {
    console.log(`\n=== ${server.name} ===`);
    try {
      const tools = await queryMcpServer(server.command, server.args);
      if (tools.length === 0) {
        console.log('  No tools returned, skipping');
        continue;
      }
      const serverDir = path.join(TRAE_BASE, server.name);
      const toolsDir = path.join(serverDir, 'tools');
      fs.mkdirSync(toolsDir, { recursive: true });
      fs.writeFileSync(path.join(serverDir, 'SERVER_METADATA.json'),
        JSON.stringify({ server_name: server.name }, null, 2) + '\n');

      for (const tool of tools) {
        fs.writeFileSync(path.join(toolsDir, `${tool.name}.json`),
          JSON.stringify(convertToolSchema(tool), null, 2) + '\n');
      }
      console.log(`  Created ${tools.length} descriptors in ${serverDir}`);
      tools.forEach(t => console.log(`    - ${t.name}`));
    } catch(e) {
      console.error(`  ERROR:`, e.message);
    }
  }
  console.log('\nDone!');
}
run();
