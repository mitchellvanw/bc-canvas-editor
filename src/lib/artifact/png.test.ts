// @vitest-environment jsdom
/**
 * PNG artifact export (SPEC §9.2): captures the offscreen mount — not the live
 * editor DOM — at scale 2, clamped only if iOS canvas pixel limits force it,
 * downloads as <slug>.bcc.png, and never touches Unexported changes (SPEC §6.1).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvas } from '$lib/editor/document.svelte';
import { blankCanvas } from '$lib/model/canvas';
import { downloadBlob } from './download';
import { captureScale, exportPngArtifact, MAX_CAPTURE_PIXELS, PNG_SCALE } from './png';

const capturedInDocument = vi.hoisted(() => ({ value: false }));
const toBlob = vi.hoisted(() => vi.fn(async () => new Blob(['png'], { type: 'image/png' })));
const snapdom = vi.hoisted(() =>
	vi.fn(async (element: Element, _options?: object) => {
		capturedInDocument.value = document.body.contains(element);
		return { toBlob };
	})
);
vi.mock('@zumer/snapdom', () => ({ snapdom }));
vi.mock('./download', () => ({ downloadBlob: vi.fn() }));

// Node's experimental localStorage global shadows jsdom's here; the editor
// singleton autosaves on commit, so give it a working slot.
const slot = new Map<string, string>();
vi.stubGlobal('localStorage', {
	getItem: (key: string) => slot.get(key) ?? null,
	setItem: (key: string, value: string) => slot.set(key, value),
	removeItem: (key: string) => slot.delete(key)
});

afterEach(() => {
	vi.clearAllMocks();
	canvas.replace(blankCanvas());
	document.body.innerHTML = '';
});

describe('captureScale', () => {
	it('is 2x on iOS whenever the sheet fits the canvas pixel budget', () => {
		expect(captureScale(1440, 1400, true)).toBe(PNG_SCALE);
	});

	it('clamps below 2x only when the 2x bitmap would exceed the iOS budget', () => {
		const scale = captureScale(1440, 10000, true);
		expect(scale).toBeLessThan(PNG_SCALE);
		expect(1440 * 10000 * scale * scale).toBeLessThanOrEqual(MAX_CAPTURE_PIXELS);
	});

	it('never clamps off iOS — desktop stays 2x however long the sheet (SPEC §9.2)', () => {
		expect(captureScale(1440, 10000, false)).toBe(PNG_SCALE);
	});
});

describe('exportPngArtifact', () => {
	it('captures a live offscreen mount at 2x with fonts embedded', async () => {
		await exportPngArtifact(canvas.doc);
		expect(snapdom).toHaveBeenCalledOnce();
		expect(capturedInDocument.value).toBe(true);
		expect(snapdom.mock.calls[0][1]).toMatchObject({ scale: PNG_SCALE, embedFonts: true });
		expect(toBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'png' }));
	});

	it('downloads under the slug filename, with the unnamed fallback', async () => {
		canvas.commit((doc) => (doc.name = 'Order Fulfillment'));
		await exportPngArtifact(canvas.doc);
		expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'order-fulfillment.bcc.png');

		canvas.commit((doc) => (doc.name = ''));
		await exportPngArtifact(canvas.doc);
		expect(downloadBlob).toHaveBeenLastCalledWith(expect.any(Blob), 'bounded-context-canvas.bcc.png');
	});

	it('leaves Unexported changes untouched (SPEC §6.1)', async () => {
		canvas.commit((doc) => (doc.name = 'Dirty'));
		expect(canvas.unexported).toBe(true);
		await exportPngArtifact(canvas.doc);
		expect(canvas.unexported).toBe(true);
	});

	it('removes the offscreen mount afterwards, even when capture fails', async () => {
		await exportPngArtifact(canvas.doc);
		expect(document.body.innerHTML).toBe('');

		snapdom.mockRejectedValueOnce(new Error('capture failed'));
		await expect(exportPngArtifact(canvas.doc)).rejects.toThrow('capture failed');
		expect(document.body.innerHTML).toBe('');
	});
});
