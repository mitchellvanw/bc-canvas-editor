/**
 * `bcc check` — every canvas read through the app's own parser, and every
 * committed image compared against the canvas beside it.
 *
 * The parser is `parseCanvasFile`, the same function and the same version gate
 * the editor's Import… uses, so a canvas that passes here opens there. That is
 * the whole value of the subcommand: not a schema restated for a terminal, but
 * the one the app already holds. SPEC §3.3's path-carrying `detail` is what
 * makes the output worth reading, and a terminal is the surface that rule was
 * written for.
 *
 * The image leg (ticket 056 decisions 6 and 8) re-renders at the height the
 * `.bcc.svg` itself declares and diffs the bytes. Four outcomes, and they are
 * deliberately not two: an **absent** image is silent, because most checkouts
 * never asked for one and a check that fails on those is a check people turn
 * off; an image that **differs** is stale; an image whose height cannot be read
 * is a refusal in its own right, since nothing was reproduced and so nothing
 * was shown to differ; and an image whose path resolves out of the root — a
 * symlink committed where an image was — refuses too, rather than reading as
 * absent (ticket 065's third face).
 */

import { readFileSync } from 'node:fs';
import { readCanvas, readProblem } from '$lib/fs/read';
import { OutsideRoot, type CanvasRoot } from '$lib/fs/root';
import { stampIds } from '$lib/model/canvas';
import { declaredHeight, outputPath, reproduce } from './image';

export interface CheckReport {
	/** Canvases that read as canvases. */
	canvases: number;
	/** Images found beside one and reproduced byte for byte. */
	images: number;
	/** Sentences naming what did not check out, in the order met. */
	problems: string[];
}

export function check(root: CanvasRoot, paths: readonly string[]): CheckReport {
	const report: CheckReport = { canvases: 0, images: 0, problems: [] };
	// A `.bcc.json` and the `.bcc.html` exported from it name the same image, so
	// a root holding both would compare it twice and count it twice.
	const compared = new Set<string>();

	for (const input of paths) {
		const result = readCanvas(root, input);
		if (!result.ok) {
			report.problems.push(readProblem(result));
			continue;
		}
		report.canvases++;

		const imagePath = outputPath(result.path, 'svg');
		if (compared.has(imagePath)) continue;

		// Resolved before the read so its refusal stays loud: a committed image
		// swapped for a symlink pointing out of the root is a finding, not the
		// absent-image case the catch below stands for (ticket 065's third face).
		let resolved: string;
		try {
			resolved = root.resolve(imagePath);
		} catch (error) {
			if (!(error instanceof OutsideRoot)) throw error;
			report.problems.push(error.message);
			continue;
		}
		let committed: string;
		try {
			committed = readFileSync(resolved, 'utf8');
		} catch {
			// No image beside this canvas, which is the ordinary case.
			continue;
		}
		compared.add(imagePath);

		const height = declaredHeight(committed);
		if (height === null) {
			report.problems.push(
				`${imagePath}: no height on its <svg> element, so it cannot be redrawn and compared. ` +
					`Write it again with bcc render --svg ${result.path}.`
			);
			continue;
		}

		if (reproduce(stampIds(result.file), height) === committed) {
			report.images++;
			continue;
		}
		report.problems.push(
			`${imagePath}: does not match ${result.path} as it stands. ` +
				`Redraw it with bcc render --svg ${result.path}.`
		);
	}

	return report;
}
