/**
 * Reading a canvas off disk, through the app's own parser.
 *
 * Both importable forms arrive here — a `.bcc.json` and a `.bcc.html` artifact
 * carrying one embedded — and `parseCanvasImport` is what tells them apart,
 * the same function and the same version gate the editor's Import… uses. The
 * server adds no second opinion about what a Canvas file is; it only adds the
 * two things a filesystem brings with it, a path that might sit outside the
 * root and a file that might not be there.
 *
 * The refusals are a closed set so every caller has to say what it does with
 * each one, and `errors.ts` turns them into the sentences a model reads.
 */

import { readFileSync } from 'node:fs';
import type { CanvasFile } from '$lib/model/canvas';
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
