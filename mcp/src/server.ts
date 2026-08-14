/**
 * The server instance, built fresh per connection.
 *
 * `serveStdio` takes a factory rather than a server because the opening
 * exchange decides which protocol era the connection speaks and pins one
 * instance to it. Everything a tool needs is closed over here: the root is
 * resolved once, at startup, and every handler resolves its paths through it.
 *
 * Nothing here holds state between calls. The filesystem is the state and git
 * is the history; a server that cached a canvas would only be a second opinion
 * about what is on disk.
 */

import { McpServer } from '@modelcontextprotocol/server';
import { registerCanvasResource } from './resource';
import type { CanvasRoot } from '$lib/fs/root';
import { registerTools } from './tools';

export const SERVER_INFO = { name: 'bc-canvas', version: '0.0.1' } as const;

export function buildServer(root: CanvasRoot): McpServer {
	// Capabilities are declared rather than inferred from what is registered,
	// so what the server claims to be does not drift with its contents. No
	// `prompts`: `review-canvas` was fourteen lines of facilitation procedure
	// living in the server, and procedure is the plugin's half of the seam
	// (ticket 059) — `canvas-reviewer` is the same stance in the right place.
	const server = new McpServer(SERVER_INFO, {
		capabilities: { tools: {}, resources: {}, completions: {} }
	});

	registerTools(server, root);
	registerCanvasResource(server, root);

	return server;
}
