// The exact failure Cowork hit: a root wide enough to contain a directory the
// OS keeps to itself. Before the fix, one EPERM aborted the whole listing.
import { join } from 'node:path';
const REPO = '/Users/mitchell/Projects/bc-canvas-editor';
const CLIENT_PKG = join(REPO, 'mcp', 'node_modules', '@modelcontextprotocol', 'client');
const { Client } = await import(join(CLIENT_PKG, 'dist', 'index.mjs'));
const { StdioClientTransport } = await import(join(CLIENT_PKG, 'dist', 'stdio.mjs'));
const client = new Client({ name: 'unreadable', version: '0.0.0' });
await client.connect(new StdioClientTransport({
  command: 'node',
  args: [join(REPO, 'mcp', 'dist', 'server.js'), '--root', '/Library/Application Support/Apple']
}));
const r = await client.callTool({ name: 'bcc_list_canvases', arguments: {} });
console.log('isError:', r.isError ?? false);
console.log(r.content[0].text);
console.log('unreadable:', JSON.stringify(r.structuredContent?.unreadable));
await client.close();
