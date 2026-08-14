/**
 * SVG image export (SPEC §9.3): the sheet as one `.bcc.svg` — the same file
 * `bcc render --svg` writes, from the same renderer, for the same purpose. It
 * exists in the editor because the one thing the CLI has to launch a browser
 * for is free here: the sheet is already laid out, so its height is a
 * `getBoundingClientRect` away (wayfinder ticket 056 decision 9).
 *
 * Membership in the family is one-way. Import… takes `.bcc.json` and
 * `.bcc.html` and never this: an image carries no Canvas file, and like PNG it
 * leaves Unexported changes exactly where it found them (SPEC §6.1).
 *
 * The mount is PNG's, and it is what makes the measurement honest — the same
 * fixed desktop width and the same margin the renderer's page frame draws in,
 * so the number handed to `sheetSvg` is the height of the thing it is about to
 * write.
 */

import type { CanvasDoc } from '$lib/model/canvas';
import { exportFileName } from '$lib/model/filename';
import { sheetSvg } from '$lib/render';
import { SHEET_WIDTH } from '$lib/render/metrics';
import { downloadBlob } from './download';
import { mountArtifactSheet } from './offscreen';

export async function exportSvgArtifact(doc: CanvasDoc): Promise<void> {
	const { element, dispose } = mountArtifactSheet(doc);
	try {
		// A height measured against fallback faces is the wrong height, and the
		// file is written at whatever this says.
		await document.fonts?.ready;
		const { height } = element.getBoundingClientRect();
		const svg = sheetSvg(doc, { width: SHEET_WIDTH, height: Math.ceil(height) });
		downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), exportFileName(doc.name, 'svg'));
	} finally {
		dispose();
	}
}
