/**
 * The canvas resource: `bcc://canvas/{+path}`.
 *
 * Resources are application-driven — the host decides what gets attached, and
 * a self-directed agent cannot count on one being there. That is why canvases
 * are reachable both ways: this template is how a person pins a canvas into a
 * conversation from the host's own UI, and `bcc_read_canvas` is how the model
 * reaches the same canvas when nobody has. Both read through `readCanvas`, so
 * neither can show something the other doesn't.
 *
 * One URI, two contents: the digest and the exact file. A host that renders
 * only the first shows a person something legible; a model handed both gets
 * the bytes it would need to write the canvas back.
 *
 * No subscriptions and no `listChanged`. Files change under this server all the
 * time — a git checkout rewrites half of them — and a notification stream about
 * that would be a second, worse way of knowing what `bcc_list_canvases` says on
 * demand.
 */

import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/server';
import { readCanvas, readProblem } from '$lib/fs/read';
import type { CanvasRoot } from '$lib/fs/root';
import { canvasDigest } from '$lib/model/digest';
import { canvasUri, catalog, CANVAS_URI_TEMPLATE, pathFromUri } from './catalog';

export function registerCanvasResource(server: McpServer, root: CanvasRoot): void {
	server.registerResource(
		'canvas',
		new ResourceTemplate(CANVAS_URI_TEMPLATE, {
			list: () => ({
				resources: catalog(root).canvases.map((summary) => ({
					uri: summary.uri,
					name: summary.path,
					title: summary.name === '' ? summary.path : summary.name,
					description: summary.purpose,
					mimeType: 'text/markdown'
				}))
			}),
			// Completion is offered on the path because this is the one place the
			// protocol's completion applies to a resource at all, and a person
			// typing a path into a host's picker is exactly who benefits.
			complete: {
				path: (value) =>
					catalog(root)
						.canvases.map((summary) => summary.path)
						.filter((path) => path.startsWith(value))
			}
		}),
		{
			title: 'Bounded Context Canvas',
			description:
				'A canvas from this project, as prose and as its Canvas file. Attach one to give the conversation a context to work against.',
			mimeType: 'text/markdown'
		},
		async (uri) => {
			const path = pathFromUri(uri.href);
			if (path === null) throw new Error(`${uri.href}: not a canvas URI`);

			const result = readCanvas(root, path);
			if (!result.ok) throw new Error(readProblem(result));

			const href = canvasUri(result.path);
			return {
				contents: [
					{ uri: href, mimeType: 'text/markdown', text: canvasDigest(result.file) },
					{ uri: href, mimeType: 'application/json', text: result.text }
				]
			};
		}
	);
}
