/**
 * The server instance, built fresh per connection.
 *
 * `serveStdio` takes a factory rather than a server because the opening
 * exchange decides which protocol era the connection speaks and pins one
 * instance to it. Everything a tool needs is closed over here: the root is
 * resolved once, at startup, and every handler resolves its paths through it.
 *
 * The tools themselves land in ticket 028; this registers none, and a
 * `tools/list` over an empty server is exactly what proves the plumbing.
 */

import { McpServer } from '@modelcontextprotocol/server';
import type { CanvasRoot } from './root';

export const SERVER_INFO = { name: 'bc-canvas', version: '0.0.1' } as const;

export function buildServer(root: CanvasRoot): McpServer {
	// Capabilities are declared rather than inferred from what is registered:
	// a host that connects to a server with no tools yet should still get a
	// well-formed empty list back instead of a method-not-found.
	return new McpServer(SERVER_INFO, { capabilities: { tools: {} } });
}
