#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawnSync } from 'child_process';

// ── Parse CLI args ──────────────────────────────────────────────────

const args = process.argv.slice(2);
let graphPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--graph' && i + 1 < args.length) {
    graphPath = args[i + 1];
    i++;
  }
}

if (!graphPath) {
  console.error('Usage: node graphify-mcp.mjs --graph <path-to-graph.json>');
  process.exit(1);
}

// ── Helper: run graphify CLI ────────────────────────────────────────

function runGraphify(cmdArgs) {
  const result = spawnSync('graphify', [...cmdArgs, '--graph', graphPath], {
    encoding: 'utf-8',
    windowsHide: true,
  });

  let output = '';
  if (result.stdout) output += result.stdout;
  if (result.stderr && result.stderr.trim()) {
    output += (output ? '\n\n--- stderr ---\n' : '') + result.stderr.trim();
  }
  if (result.status !== 0 && !output) {
    output = `graphify exited with code ${result.status}`;
  }
  return output || '(no output)';
}

// ── MCP Server Setup ────────────────────────────────────────────────

const server = new Server(
  {
    name: 'io.sentropic/graphify',
    version: '0.17.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'graphify_query',
      description: `BFS/DFS traversal of graph.json for a natural-language question about the codebase.`,
      inputSchema: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The question to ask about the codebase knowledge graph.',
          },
          use_dfs: {
            type: 'boolean',
            description: 'Use depth-first instead of breadth-first traversal.',
            default: false,
          },
          context: {
            type: 'array',
            description: 'Explicit edge-context filter (repeatable).',
            items: { type: 'string' },
          },
          budget: {
            type: 'number',
            description: 'Cap output at N tokens (default 2000).',
            default: 2000,
          },
        },
        required: ['question'],
      },
    },
    {
      name: 'graphify_path',
      description: `Find the shortest path between two nodes in graph.json.`,
      inputSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            description: 'Source node label or ID.',
          },
          target: {
            type: 'string',
            description: 'Target node label or ID.',
          },
        },
        required: ['source', 'target'],
      },
    },
    {
      name: 'graphify_explain',
      description: `Plain-language explanation of a node and its neighbors in graph.json.`,
      inputSchema: {
        type: 'object',
        properties: {
          node: {
            type: 'string',
            description: 'The node label or ID to explain.',
          },
        },
        required: ['node'],
      },
    },
    {
      name: 'graphify_affected',
      description: `Reverse traversal to find nodes impacted by a given node in graph.json.`,
      inputSchema: {
        type: 'object',
        properties: {
          node: {
            type: 'string',
            description: 'The node label or ID to trace impact from.',
          },
          relation: {
            type: 'array',
            description: 'Edge relation to traverse in reverse (repeatable).',
            items: { type: 'string' },
          },
          depth: {
            type: 'number',
            description: 'Reverse traversal depth (default 2).',
            default: 2,
          },
        },
        required: ['node'],
      },
    },
    {
      name: 'graphify_god_nodes',
      description: `List the most connected nodes (architectural hubs) in graph.json.`,
      inputSchema: {
        type: 'object',
        properties: {
          top: {
            type: 'number',
            description: 'How many to show (default 10).',
            default: 10,
          },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: callArgs } = request.params;

  if (name === 'graphify_query') {
    const cmd = ['query', callArgs.question];
    if (callArgs.use_dfs) cmd.push('--dfs');
    if (callArgs.context) {
      for (const c of callArgs.context) cmd.push('--context', c);
    }
    if (callArgs.budget != null) cmd.push('--budget', String(callArgs.budget));
    return {
      content: [{ type: 'text', text: runGraphify(cmd) }],
    };
  }

  if (name === 'graphify_path') {
    return {
      content: [{ type: 'text', text: runGraphify(['path', callArgs.source, callArgs.target]) }],
    };
  }

  if (name === 'graphify_explain') {
    return {
      content: [{ type: 'text', text: runGraphify(['explain', callArgs.node]) }],
    };
  }

  if (name === 'graphify_affected') {
    const cmd = ['affected', callArgs.node];
    if (callArgs.relation) {
      for (const r of callArgs.relation) cmd.push('--relation', r);
    }
    if (callArgs.depth != null) cmd.push('--depth', String(callArgs.depth));
    return {
      content: [{ type: 'text', text: runGraphify(cmd) }],
    };
  }

  if (name === 'graphify_god_nodes') {
    const cmd = ['god-nodes', '--json'];
    if (callArgs.top != null) cmd.push('--top', String(callArgs.top));
    return {
      content: [{ type: 'text', text: runGraphify(cmd) }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ── Start MCP server over stdio ─────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
