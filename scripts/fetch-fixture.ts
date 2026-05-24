/**
 * Fetches the basegraph from the API and writes a JSON fixture to src/fixtures/basegraph.json.
 * The fixture shape matches AnyTypedNode[] and TypedCytoscapeEdge[] from node-factory.ts.
 *
 * Usage: pnpm fetch-fixture
 * Reads credentials from .env.local (VITE_BASE_URL, VITE_USERNAME, VITE_PASSWORD).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return Object.fromEntries(
      content
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#') && line.includes('='))
        .map(line => {
          const idx = line.indexOf('=');
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const env = parseEnvFile(resolve(projectRoot, '.env.local'));

const BASE_URL = env['VITE_BASE_URL'] ?? process.env['NETVIZ_BASE_URL'];
const USERNAME = env['VITE_USERNAME'] ?? process.env['NETVIZ_USERNAME'];
const PASSWORD = env['VITE_PASSWORD'] ?? process.env['NETVIZ_PASSWORD'];

if (!BASE_URL || !USERNAME || !PASSWORD) {
  throw new Error('Missing VITE_BASE_URL, VITE_USERNAME, or VITE_PASSWORD in .env.local');
}

// Authenticate
console.log('Authenticating...');
const loginRes = await fetch(`${BASE_URL}/api/system/auth/jwt/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ username: USERNAME, password: PASSWORD }),
});

const loginJson = (await loginRes.json()) as { access_token?: string };
if (!loginJson.access_token) throw new Error('Authentication failed');
const token = loginJson.access_token;

// Fetch basegraph
console.log('Fetching basegraph...');
const graphRes = await fetch(
  `${BASE_URL}/api/explorer/graph/basegraph?data_type=all&explorer_network_id=2&snapshot_id=1`,
  { headers: { Authorization: `Bearer ${token}` } },
);

const graphJson = (await graphRes.json()) as {
  data?: {
    graph?: {
      elements?: {
        nodes?: Array<{ data?: Record<string, unknown>; classes?: string }>;
        edges?: Array<{ data?: Record<string, unknown>; classes?: string }>;
      };
    };
  };
};

const elements = graphJson.data?.graph?.elements;
if (!elements) throw new Error('No elements in response');

// Transform nodes: ensure required local type fields are present
const nodes = (elements.nodes ?? []).map(node => {
  const data = node.data ?? {};
  // Normalize API field name (dev_type) to the name used by local types (device_type)
  const { dev_type, ...rest } = data as Record<string, unknown> & { dev_type?: unknown };
  return {
    data: {
      ...rest,
      ...(dev_type !== undefined ? { device_type: dev_type } : {}),
      title: (data['title'] ?? data['label'] ?? data['id']) as string,
    },
    ...(node.classes !== undefined ? { classes: node.classes } : {}),
  };
});

// Transform edges: pass through as-is (source/target/id already present from API)
const edges = (elements.edges ?? []).map(edge => ({
  data: { ...(edge.data ?? {}) },
  ...(edge.classes !== undefined ? { classes: edge.classes } : {}),
}));

// Write fixture
const outDir = resolve(projectRoot, 'src/fixtures');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'basegraph.json');
writeFileSync(outPath, JSON.stringify({ nodes, edges }, null, 2));

console.log(`Wrote ${nodes.length} nodes, ${edges.length} edges to src/fixtures/basegraph.json`);
