/**
 * Reading a canvas off disk, through the app's own parser.
 *
 * Both importable forms arrive here — a `.bcc.json` and a `.bcc.html` artifact
 * carrying one embedded — and `parseCanvasImport` is what tells them apart,
 * the same function and the same version gate the editor's Import… uses.
 * Nothing here holds a second opinion about what a Canvas file is; this module
 * only adds the two things a filesystem brings with it, a path that might sit
 * outside the root and a file that might not be there.
 *
 * That is the whole of what a caller with a path does: the MCP tools, the
 * resource, the prompt, `bcc`, and both fence adapters call `readCanvas` and
 * write no resolution logic of their own.
 *
 * The refusals are a closed set so every caller has to say what it does with
 * each one. `readProblem` below turns one into the sentence to show — the same
 * sentence on every surface, because the reader is looking at the same missing
 * file whether they are a model, a developer at a terminal, or an author with
 * a broken fence in a preview. What differs is what each surface does *with*
 * it: `mcp/src/errors.ts` wraps it in an error result that names the tool to
 * call next; a fence puts it in a placeholder and the same sentence, one level
 * of disclosure down, on the developer's warning channel.
 */

import { readFileSync } from 'node:fs';
import { CANVAS_VERSION, type CanvasFile } from '$lib/model/canvas';
import { extractEmbeddedCanvas } from '$lib/model/embed';
import { parseCanvasFile, parseCanvasImport } from '$lib/model/parse';
import { OutsideRoot, type CanvasRoot } from './root';

export type CanvasRead =
	| {
			ok: true;
			/** Root-relative, `/`-separated — the path a tool names. */
			path: string;
			file: CanvasFile;
			/**
			 * The exact Canvas-file text this path carries: the whole file for a
			 * `.bcc.json`, the embedded block for a `.bcc.html` artifact.
			 */
			text: string;
	  }
	| { ok: false; reason: 'outside-root'; path: string; detail: string }
	| { ok: false; reason: 'unreadable'; path: string; detail: string }
	| { ok: false; reason: 'newer-version'; path: string; version: number }
	| { ok: false; reason: 'not-canvas'; path: string; detail?: string };

/**
 * Read and parse one canvas. `input` is whatever the model named; the returned
 * `path` is the root-relative form, so results talk back in the same terms
 * `bcc_list_canvases` uses.
 */
export function readCanvas(root: CanvasRoot, input: string): CanvasRead {
	let absolute: string;
	try {
		absolute = root.resolve(input);
	} catch (error) {
		if (error instanceof OutsideRoot) {
			return { ok: false, reason: 'outside-root', path: input, detail: error.message };
		}
		throw error;
	}

	const path = root.relative(absolute);

	let raw: string;
	try {
		raw = readFileSync(absolute, 'utf8');
	} catch (error) {
		return {
			ok: false,
			reason: 'unreadable',
			path,
			detail: error instanceof Error ? error.message : String(error)
		};
	}

	const parsed = parseCanvasImport(raw);
	if (!parsed.ok) {
		return parsed.reason === 'newer-version'
			? { ok: false, reason: 'newer-version', path, version: parsed.version }
			: { ok: false, reason: 'not-canvas', path, detail: parsed.detail };
	}

	// The text that was parsed, not the file that held it: an artifact's bytes
	// are HTML, and only the block inside it is the Canvas file. The order is
	// `parseCanvasImport`'s own — a `.bcc.json` whose prose happens to contain
	// the embed marker is still itself, not whatever that marker precedes.
	const text = parseCanvasFile(raw).ok ? raw : (extractEmbeddedCanvas(raw) ?? raw);
	return { ok: true, path, file: parsed.file, text };
}

/**
 * Why a read came back empty, in one sentence.
 *
 * Every surface needs this sentence somewhere it cannot put a tool result: a
 * `resources/read` miss and a `prompts/get` miss are JSON-RPC errors rather
 * than conversation, and a fence has only a placeholder to write into. It is
 * one sentence rather than four call sites' worth because the four reasons are
 * a closed set and the reader is looking at the same file either way.
 *
 * Path first, always — it is the one thing that identifies which file failed
 * when several are on screen, and on the fence surfaces it is the only thing
 * the reader can act on.
 *
 * **Two levels of disclosure**, which is SPEC §3.3's rule rather than a second
 * one: the detail is shown where the offending bytes are on screen. A terminal
 * and a tool result are that; a rendered markdown page is the case §3.3 was not
 * written for, because the bytes are in a *different file* and the page may be
 * a built site read by strangers. So a fence's placeholder asks for
 * `{ detail: false }` — which also keeps this machine's absolute paths, which
 * both the filesystem's message and the root's name carry, out of a published
 * page — and puts the full sentence on the developer's warning channel.
 */
export function readProblem(
	result: Extract<CanvasRead, { ok: false }>,
	disclosure: { detail?: boolean } = {}
): string {
	const detail = disclosure.detail ?? true;
	switch (result.reason) {
		case 'outside-root':
			// `OutsideRoot` already names the path and the root it left — which is
			// the part a page cannot have.
			return detail
				? result.detail
				: `${result.path}: outside the canvas root, and a path out of it is not followed.`;
		case 'unreadable':
			return detail
				? `${result.path}: could not be read (${result.detail}).`
				: `${result.path}: could not be read.`;
		case 'newer-version':
			return `${result.path}: written by a newer version of BC Canvas (format version ${result.version}); version ${CANVAS_VERSION} is the newest that can be read here.`;
		case 'not-canvas':
			return `${result.path}: ${(detail ? result.detail : undefined) ?? 'not a Canvas file.'}`;
	}
}
