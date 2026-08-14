/**
 * The two tools.
 *
 * Registration order is `tools/list` order, and `tools/list` order is stable
 * on purpose: it sits at the front of every session's context, and a list that
 * reshuffles itself is a prompt cache that misses for no reason.
 *
 * The pairing is the point, and it is narrower than it was. `bcc_read_canvas`
 * says what one canvas contains, and `bcc_explain` is what it leans on rather
 * than carrying its own tutorial. Listing and writing are not here: a listing
 * is `bcc ls` and a write is the host's own file tools followed by `bcc fmt`,
 * both of which every filesystem-carrying host already has. What is left is
 * what no filesystem tool can produce — the digest, which is a rendering
 * rather than a read, and the method, which is not in the file at all.
 *
 * That makes this server read-only, deliberately: it is how a canvas gets into
 * a conversation, and `bcc` is how one changes on disk (ticket 059).
 */

import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { readCanvas } from '$lib/fs/read';
import type { CanvasRoot } from '$lib/fs/root';
import { canvasDigest } from '$lib/model/digest';
import { canvasUri } from './catalog';
import { readRefusal } from './errors';
import { explain, TOPICS } from './explain';

function readCanvasTool(server: McpServer, root: CanvasRoot): void {
	server.registerTool(
		'bcc_read_canvas',
		{
			title: 'Read a canvas',
			description:
				'One canvas as prose: the sheet in words, a third to a half shorter than the file. Read it to understand what a context is responsible for, or to model a new canvas on a neighbouring one. It reads a .bcc.json or the canvas embedded in a .bcc.html artifact, and a canvas written by an older version is brought up to date on the way through.',
			inputSchema: z.object({
				path: z
					.string()
					.describe(
						'Where the canvas is, relative to the project root — docs/contexts/shipping.bcc.json.'
					)
			}),
			annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
		},
		async ({ path }): Promise<CallToolResult> => {
			const result = readCanvas(root, path);
			if (!result.ok) return readRefusal(result);

			return {
				content: [
					{ type: 'text', text: canvasDigest(result.file) },
					{
						type: 'resource_link',
						uri: canvasUri(result.path),
						name: result.file.name === '' ? result.path : result.file.name,
						mimeType: 'text/markdown',
						description: `The ${result.path} canvas, so it can be kept in view.`
					}
				]
			};
		}
	);
}

function explainTool(server: McpServer): void {
	server.registerTool(
		'bcc_explain',
		{
			title: 'Explain the canvas',
			description:
				"What a Bounded Context Canvas section is for, in the ddd-crew's own questions, with the shape it takes in the file and an example row. Ask about the canvas as a whole first if you have not drafted one before.",
			inputSchema: z.object({
				topic: z
					.enum(TOPICS)
					.describe('canvas for the method and the eleven sections; any section key for that section.')
			}),
			annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
		},
		async ({ topic }): Promise<CallToolResult> => ({
			content: [{ type: 'text', text: explain(topic) }]
		})
	);
}

// No tool here declares an `outputSchema`, as a standing rule. Declaring one
// entitles a host to treat the text block as a duplicate serialization of the
// structured content and drop it — the spec says as much, both day-one hosts
// do it, and that is how these results' prose got thrown away (hosts
// checkpoint, finding 1). Every result speaks in prose, so the prose must be
// the only serialization there is.
export function registerTools(server: McpServer, root: CanvasRoot): void {
	readCanvasTool(server, root);
	explainTool(server);
}
