/**
 * PNG artifact (SPEC §9.2): SnapDOM capture of the offscreen artifact mount at
 * 2x. SnapDOM clones the sheet into an SVG foreignObject and lets the browser
 * rasterize it, so Tailwind v4's modern CSS is a non-issue by construction;
 * Safari/iOS behavior is the build's first checkpoint (SPEC §13). PNG export
 * is pixels-only — it never clears Unexported changes (SPEC §6.1).
 */

import { snapdom } from '@zumer/snapdom';
import type { CanvasDoc } from '$lib/model/canvas';
import { exportFileName } from '$lib/model/filename';
import { downloadBlob } from './download';
import { mountArtifactSheet } from './offscreen';

export const PNG_SCALE = 2;

/**
 * iOS Safari refuses to allocate canvases past its pixel budget — 4096²
 * on the most constrained devices. The 2x sheet (~2880×3000 for a full
 * canvas) fits comfortably; only an extremely long canvas clamps, and only
 * on iOS — desktop browsers take far larger canvases and stay 2x (SPEC §9.2).
 */
export const MAX_CAPTURE_PIXELS = 4096 * 4096;

/** iPadOS reports itself as a Mac; the touch-point check catches it. */
function onIos(): boolean {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}

export function captureScale(width: number, height: number, ios = onIos()): number {
	if (!ios) return PNG_SCALE;
	const pixels = width * height;
	if (pixels * PNG_SCALE * PNG_SCALE <= MAX_CAPTURE_PIXELS) return PNG_SCALE;
	return Math.sqrt(MAX_CAPTURE_PIXELS / pixels);
}

export async function exportPngArtifact(doc: CanvasDoc): Promise<void> {
	const { element, dispose } = mountArtifactSheet(doc);
	try {
		// The capture must rasterize the real fonts, not a fallback mid-swap.
		await document.fonts?.ready;
		const { width, height } = element.getBoundingClientRect();
		const capture = await snapdom(element, {
			scale: captureScale(width, height),
			embedFonts: true
		});
		const blob = await capture.toBlob({ type: 'png' });
		downloadBlob(blob, exportFileName(doc.name, 'png'));
	} finally {
		dispose();
	}
}
