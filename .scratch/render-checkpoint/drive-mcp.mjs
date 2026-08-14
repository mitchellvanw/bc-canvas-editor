// Leg 8 — the MCP surface after the diet, driven over real stdio against the
// committed bundle, the way mcp-hosts-checkpoint and the diet measured it.
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const CLIENT_PKG = join(REPO, 'mcp', 'node_modules', '@modelcontextprotocol', 'client');
const { Client } = await import(join(CLIENT_PKG, 'dist', 'index.mjs'));
const { StdioClientTransport } = await import(join(CLIENT_PKG, 'dist', 'stdio.mjs'));
const SERVER = join(REPO, 'mcp', 'dist', 'server.js');
const OUT = new URL('./evidence/', import.meta.url).pathname;

const root = mkdtempSync(join(tmpdir(), 'bcc-render-checkpoint-'));
mkdirSync(join(root, 'docs'), { recursive: true });
for (const name of [
	'order-fulfillment',
	'notifications',
	'appointment-scheduling',
	'royalty-distribution'
]) {
	cpSync(join(REPO, 'examples', `${name}.bcc.json`), join(root, 'docs', `${name}.bcc.json`));
}

const client = new Client({ name: 'render-checkpoint', version: '0.0.0' });
await client.connect(
	new StdioClientTransport({ command: 'node', args: [SERVER, '--root', root] })
);

const tools = await client.listTools();
const toolsJson = JSON.stringify(tools.tools);
const perTool = tools.tools.map((t) => ({
	name: t.name,
	chars: JSON.stringify(t).length,
	tokensApprox: Math.round(JSON.stringify(t).length / 4)
}));

const resources = await client.listResources();
const uris = resources.resources.map((r) => r.uri);

// The resource is reachable: read one and confirm it answers with content.
const read = await client.readResource({ uri: uris[0] });
const readOk = read.contents?.length > 0 && read.contents[0].text?.length > 0;

let prompts = [];
try {
	prompts = (await client.listPrompts()).prompts.map((p) => p.name);
} catch (e) {
	prompts = `listPrompts: ${e.message}`;
}

const facts = {
	tools: perTool,
	toolsListChars: toolsJson.length,
	toolsListTokensApprox: Math.round(toolsJson.length / 4),
	resourceUris: uris,
	resourceReadOk: readOk,
	resourceReadBytes: read.contents?.[0]?.text?.length,
	prompts
};
console.log(JSON.stringify(facts, null, 2));
writeFileSync(join(OUT, 'leg8-mcp-facts.json'), JSON.stringify(facts, null, 2));
await client.close();
