import { join } from 'node:path';
const REPO = '/Users/mitchell/Projects/bc-canvas-editor';
const CLIENT_PKG = join(REPO, 'mcp', 'node_modules', '@modelcontextprotocol', 'client');
const { Client } = await import(join(CLIENT_PKG, 'dist', 'index.mjs'));
const { StdioClientTransport } = await import(join(CLIENT_PKG, 'dist', 'stdio.mjs'));
const client = new Client({ name: 'probe', version: '0.0.0' });
// No --root: the server takes its working directory, whatever the host gave it.
await client.connect(new StdioClientTransport({ command: 'node', args: [join(REPO, 'mcp', 'dist', 'server.js')], cwd: '/Users/mitchell/Projects/focal' }));
const r = await client.callTool({ name: 'bcc_read_canvas', arguments: { path: '/tmp/nope.bcc.json' } });
console.log(JSON.stringify(r.content, null, 1));
await client.close();
