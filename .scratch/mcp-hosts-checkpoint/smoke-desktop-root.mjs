// Smoke the exact Claude Desktop invocation — `node mcp/dist/server.js --root
// ~/bc-canvas-desktop-check` — before a human edits a GUI config and restarts
// an app. Everything the protocol can prove about the Desktop steps, proved
// against the specific root the config snippet will name.
import { homedir } from 'node:os';
import { join } from 'node:path';

const REPO = '/Users/mitchell/Projects/bc-canvas-editor';
const CLIENT_PKG = join(REPO, 'mcp', 'node_modules', '@modelcontextprotocol', 'client');
const { Client } = await import(join(CLIENT_PKG, 'dist', 'index.mjs'));
const { StdioClientTransport } = await import(join(CLIENT_PKG, 'dist', 'stdio.mjs'));

const SERVER = join(REPO, 'mcp', 'dist', 'server.js');
const ROOT = join(homedir(), 'bc-canvas-desktop-check');

const client = new Client({ name: 'desktop-smoke', version: '0.0.0' });
await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER, '--root', ROOT] }));

const tools = await client.listTools();
console.log('tools:', tools.tools.map((t) => t.name).join(', '));

const prompts = await client.listPrompts();
console.log(
	'prompts:',
	prompts.prompts.map((p) => `${p.name} (${p.title ?? '-'}) args=${(p.arguments ?? []).map((a) => a.name + (a.required ? '*' : '')).join(',')}`).join(' | ')
);

const listed = await client.callTool({ name: 'bcc_list_canvases', arguments: {} });
console.log('list structured:', JSON.stringify(listed.structuredContent, null, 1));

const completion = await client.complete({
	ref: { type: 'ref/prompt', name: 'review-canvas' },
	argument: { name: 'path', value: '' }
});
console.log('completions:', JSON.stringify(completion.completion));

const got = await client.getPrompt({
	name: 'review-canvas',
	arguments: { path: 'contexts/royalty-distribution.bcc.json' }
});
console.log('prompt messages:', got.messages.length, 'content kinds:', got.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : [m.content]).map((c) => c.type)).join(','));

await client.close();
