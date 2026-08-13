/**
 * Where a rendered file goes, and how a committed `.bcc.svg` is judged current.
 *
 * The name is the canvas's own stem with the family extension swapped
 * (`orders.bcc.json` → `orders.bcc.svg`), not `exportFileName`'s slug of the
 * canvas *name*. A committed image has to be findable from the path of the
 * canvas beside it — that is the whole of what makes the staleness check
 * possible (ticket 056 decision 6) — and a slug of the name is not, because
 * renaming the context inside the file would move the image.
 *
 * Staleness is a re-render and a byte-diff at the height the file itself
 * declares. The declared height is never trusted, only used to *reproduce* a
 * render that comparison then judges, which is why this needs no browser and no
 * measurement: clipping only ever arises from content growth, and content
 * growth fails the diff first.
 */

import { extname } from 'node:path';
import type { CanvasDoc } from '$lib/model/canvas';
import { sheetSvg } from '$lib/render';
import { SHEET_WIDTH } from '$lib/render/metrics';

export type RenderKind = 'html' | 'svg';

/** The file `bcc render` writes for this canvas, root-relative like its input. */
export function outputPath(canvasPath: string, kind: RenderKind): string {
	const stem = /\.bcc\.(json|html)$/.test(canvasPath)
		? canvasPath.slice(0, -'.bcc.json'.length)
		: canvasPath.slice(0, canvasPath.length - extname(canvasPath).length);
	return `${stem}.bcc.${kind}`;
}

/**
 * The height an existing `.bcc.svg` was written at, or null when the file is
 * not one this tool could have written. Null is its own answer rather than
 * "stale": a file that cannot be reproduced has not been shown to differ.
 */
export function declaredHeight(svg: string): number | null {
	const root = svg.match(/<svg\b[^>]*>/);
	const height = root?.[0].match(/\bheight="(\d+)"/);
	return height ? Number(height[1]) : null;
}

/** The bytes this canvas would have to produce for the image beside it to match. */
export function reproduce(doc: CanvasDoc, height: number): string {
	return sheetSvg(doc, { width: SHEET_WIDTH, height });
}
