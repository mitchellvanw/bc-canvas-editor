/**
 * The four tools.
 *
 * Registration order is `tools/list` order, and `tools/list` order is stable
 * on purpose: it sits at the front of every session's context, and a list that
 * reshuffles itself is a prompt cache that misses for no reason.
 *
 * The pairing across the four is the point. `bcc_list_canvases` says what is
 * here, `bcc_read_canvas` says what one of them contains, `bcc_write_canvas`
 * puts one back, and `bcc_explain` is what the other three lean on rather than
 * each carrying their own tutorial. There is deliberately no edit tool: a whole
 * document costs about eight hundred tokens, which is cheaper than a row-
 * addressing scheme is to get right, and it means every write goes through the
 * same parser the editor's Import… uses.
 */

import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { CANVAS_VERSION } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { canvasUri, catalog, type CanvasSummary } from './catalog';
import { customValueNotes } from './custom';
import { canvasDigest } from './digest';
import { readRefusal, refuse } from './errors';
import { explain, TOPICS } from './explain';
import { readCanvas } from './read';
import { OutsideRoot, type CanvasRoot } from './root';
import { WRITE_INPUT } from './schema';
import { emptySections, SECTIONS } from './sections';
import { canvasBytes, writeAtomic } from './write';

const CANVAS_EXTENSION = '.bcc.json';

/** One canvas in the listing: what it is, how far along, and where to read it. */
function summaryLines(summary: CanvasSummary): string[] {
	const lines = [`${summary.path} — ${summary.name === '' ? 'Untitled' : summary.name}`];
	if (summary.description !== '') lines.push(`  ${summary.description}`);
	lines.push(`  ${summary.filled} of ${SECTIONS.length} sections filled.`);
	if (summary.empty.length > 0) lines.push(`  Nothing yet under: ${summary.empty.join(', ')}.`);
	lines.push(`  ${summary.uri}`);
	return lines;
}

function listCanvases(server: McpServer, root: CanvasRoot): void {
	server.registerTool(
		'bcc_list_canvases',
		{
			title: 'List canvases',
			description:
				'Every Bounded Context Canvas under this project, with how far along each one is. Start here: a canvas from this codebase calibrates a new one better than any example, and reading a neighbouring context is usually how you learn what this one is not responsible for.',
			annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
		},
		async (): Promise<CallToolResult> => {
			const found = catalog(root);
			const lines: string[] = [];

			if (found.canvases.length === 0) {
				lines.push(
					`No canvases under ${root.path} yet. Hidden and generated directories were not searched — any name starting with a dot, plus node_modules, dist and build. A canvas is a ${CANVAS_EXTENSION} file, or a .bcc.html artifact carrying one; bcc_write_canvas creates the first.`
				);
			} else {
				lines.push(
					`${found.canvases.length} ${found.canvases.length === 1 ? 'canvas' : 'canvases'} under ${root.path}:`,
					''
				);
				for (const summary of found.canvases) lines.push(...summaryLines(summary), '');
			}

			if (found.problems.length > 0) {
				lines.push('Files that look like canvases and could not be read:', '');
				for (const problem of found.problems) lines.push(`${problem.path} — ${problem.problem}`);
				lines.push('');
			}

			if (found.unreadable.length > 0) {
				lines.push(
					`${found.unreadable.length === 1 ? 'One directory' : `${found.unreadable.length} directories`} could not be opened, so a canvas under ${found.unreadable.length === 1 ? 'it' : 'them'} would not appear above: ${found.unreadable.join(', ')}.`
				);
			}

			return { content: [{ type: 'text', text: lines.join('\n').trimEnd() }] };
		}
	);
}

function readCanvasTool(server: McpServer, root: CanvasRoot): void {
	server.registerTool(
		'bcc_read_canvas',
		{
			title: 'Read a canvas',
			description:
				'One canvas, either as prose or as its exact file bytes. Read it as a digest to understand the context or to model a new canvas on it; read it as json when you are about to rewrite it, since bcc_write_canvas takes the whole document back.',
			inputSchema: z.object({
				path: z.string().describe('Root-relative path, as bcc_list_canvases reports it.'),
				view: z
					.enum(['digest', 'json'])
					.default('digest')
					.describe(
						'digest is the sheet in words, a third to a half shorter than the file — least on a canvas with everything filled in. json is the Canvas file itself, byte for byte — take this one when you intend to write it back.'
					)
			}),
			annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
		},
		async ({ path, view }): Promise<CallToolResult> => {
			const result = readCanvas(root, path);
			if (!result.ok) return readRefusal(result);

			const uri = canvasUri(result.path);
			return {
				content: [
					{
						type: 'text',
						text: view === 'json' ? result.text : canvasDigest(result.file)
					},
					{
						type: 'resource_link',
						uri,
						name: result.file.name === '' ? result.path : result.file.name,
						mimeType: view === 'json' ? 'application/json' : 'text/markdown',
						description: `The ${result.path} canvas, so it can be kept in view.`
					}
				]
			};
		}
	);
}

function writeCanvasTool(server: McpServer, root: CanvasRoot): void {
	server.registerTool(
		'bcc_write_canvas',
		{
			title: 'Write a canvas',
			description:
				'Write a whole canvas to a .bcc.json file, in the exact form the BC Canvas editor reads. Whole document every time — send every section, including the ones with nothing in them, and the result names which came out empty so a section is never dropped by accident. Call bcc_explain first if you are unsure what belongs in one.',
			inputSchema: WRITE_INPUT,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ path, version, canvas }): Promise<CallToolResult> => {
			if (!path.endsWith(CANVAS_EXTENSION)) {
				return refuse(
					`${path}: a canvas file has to end in ${CANVAS_EXTENSION}.`,
					"That extension is what bcc_list_canvases looks for and what the editor's Import… accepts,",
					'so a canvas under any other name is invisible to both.',
					`Try ${path.replace(/(\.[^./]*)?$/, CANVAS_EXTENSION)}.`
				);
			}

			if (version !== undefined && version !== CANVAS_VERSION) {
				return refuse(
					`version ${version}: this server writes Canvas file format version ${CANVAS_VERSION}, and only that.`,
					'Leave version out — it is stamped for you. Nothing was written.'
				);
			}

			let absolute: string;
			try {
				absolute = root.resolve(path);
			} catch (error) {
				if (error instanceof OutsideRoot) return refuse(error.message, 'Nothing was written.');
				throw error;
			}

			// The one authority on what a Canvas file is, reached the same way the
			// editor reaches it: through the bytes. The input schema above only
			// describes the shape; this is what decides it.
			const parsed = parseCanvasFile(JSON.stringify({ version: CANVAS_VERSION, ...canvas }));
			if (!parsed.ok) {
				return refuse(
					`${path}: this is not yet a Canvas file, so nothing was written.`,
					parsed.reason === 'newer-version' ? '' : (parsed.detail ?? ''),
					'Paths are into the canvas object; call bcc_explain for what a section holds.'
				);
			}

			if (existsSync(absolute) && statSync(absolute).isDirectory()) {
				return refuse(`${path}: that is a directory. Nothing was written.`);
			}

			const created = !existsSync(absolute);
			try {
				// The directory is made rather than demanded: a host with no
				// filesystem of its own has no other way to put a canvas in
				// `docs/contexts/`, and refusing would leave it nowhere to go.
				mkdirSync(dirname(absolute), { recursive: true });
				writeAtomic(absolute, canvasBytes(parsed.file));
			} catch (error) {
				// A filesystem that says no is the model's problem to route around
				// — a different path, or a word with the human — so it comes back
				// as something readable rather than a fault in the call.
				return refuse(
					`${path}: could not be written (${error instanceof Error ? error.message : String(error)}).`
				);
			}

			const written = root.relative(absolute);
			const empty = emptySections(parsed.file);
			const warnings = customValueNotes(parsed.file);

			const lines = [
				`${created ? 'Wrote' : 'Replaced'} ${written} — ${parsed.file.name === '' ? 'Untitled' : parsed.file.name}.`
			];
			lines.push(
				empty.length === 0
					? 'All eleven sections have something in them.'
					: `Nothing came out under: ${empty.join(', ')}.`
			);
			if (warnings.length > 0) lines.push(...warnings);

			return { content: [{ type: 'text', text: lines.join(' ') }] };
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
	listCanvases(server, root);
	readCanvasTool(server, root);
	writeCanvasTool(server, root);
	explainTool(server);
}
