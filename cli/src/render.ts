/**
 * `bcc render` — the sheet, as a file, beside the canvas it was drawn from.
 *
 * Two forms, one renderer. `.bcc.html` is the self-contained artifact SPEC §9.1
 * describes — all three Views, the Canvas file embedded byte-identically, and
 * so re-importable — written by `artifactDocument`, the very function the
 * editor's Export HTML calls. Not `sheetDocument`: that is the sheet alone, a
 * different container, and writing it under the family's extension would mean
 * `.bcc.html` named one file in the app and another in the CLI — which `bcc
 * check`, reading the artifact form, would contradict one command later.
 *
 * `.bcc.svg` is the committed image a markdown file can point an `<img>` at
 * (ticket 056) — the same sheet again, wrapped in a `foreignObject`.
 *
 * The SVG needs one thing Node cannot supply: a height. `measure.ts` gets it
 * from an installed Chrome, or `--height` supplies it directly. Nothing else
 * here touches a browser, and neither does `bcc check`, which is what keeps a
 * committed image honest in a checkout that has none.
 *
 * A walk covers `.bcc.json` files only. An artifact already *is* a rendering,
 * and rendering one back to HTML beside itself would overwrite the file it was
 * read from — so naming one is refused rather than silently redirected.
 */

import { readCanvas, readProblem } from '$lib/fs/read';
import type { CanvasRoot } from '$lib/fs/root';
import { writeAtomic } from '$lib/fs/write';
import { stampIds } from '$lib/model/canvas';
import { artifactDocument } from '$lib/artifact/html';
import { outputPath, reproduce, type RenderKind } from './image';
import { openMeasurer, type Measurer } from './measure';

export interface RenderOptions {
	readonly kind: RenderKind;
	/** The SVG viewport height, when the caller would rather not launch Chrome. */
	readonly height?: number;
	/** Where to write, instead of beside the canvas. One canvas only. */
	readonly out?: string;
}

export interface RenderReport {
	/** Root-relative paths written, in the order written. */
	written: string[];
	problems: string[];
}

export async function render(
	root: CanvasRoot,
	paths: readonly string[],
	options: RenderOptions
): Promise<RenderReport> {
	const report: RenderReport = { written: [], problems: [] };
	// Opened on the first canvas that needs it, so a run that never gets past a
	// read never launches a browser.
	let measurer: Measurer | null = null;

	try {
		for (const input of paths) {
			const result = readCanvas(root, input);
			if (!result.ok) {
				report.problems.push(readProblem(result));
				continue;
			}

			const target = options.out ?? outputPath(result.path, options.kind);
			const absolute = root.resolve(target);
			if (absolute === root.resolve(result.path)) {
				report.problems.push(
					`${result.path}: rendering it as ${options.kind.toUpperCase()} would overwrite the file ` +
						`it was read from. Name --out <file>, or render the .bcc.json it was exported from.`
				);
				continue;
			}

			const doc = stampIds(result.file);
			let text: string;
			if (options.kind === 'svg') {
				let height = options.height;
				if (height === undefined) {
					measurer ??= await openMeasurer();
					height = await measurer.height(doc);
				}
				text = reproduce(doc, height);
			} else {
				text = artifactDocument(doc);
			}

			writeAtomic(absolute, text);
			report.written.push(root.relative(absolute));
		}
	} finally {
		await measurer?.close();
	}

	return report;
}
