// @vitest-environment jsdom
/**
 * SVG image export (SPEC §9.3, wayfinder ticket 062): the same `sheetSvg` the
 * CLI writes, at a height the editor gets for free from the offscreen mount —
 * which is the whole reason this entry exists here and the CLI needs a browser
 * for it. Downloads as <slug>.bcc.svg, one-way, and never touches Unexported
 * changes (SPEC §6.1).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvas } from '$lib/editor/document.svelte';
import { blankCanvas } from '$lib/model/canvas';
import { SHEET_WIDTH } from '$lib/render/metrics';
import { downloadBlob } from './download';
import { exportSvgArtifact } from './svg';

vi.mock('./download', () => ({ downloadBlob: vi.fn() }));

// Node's experimental localStorage global shadows jsdom's here; the editor
// singleton autosaves on commit, so give it a working slot.
const slot = new Map<string, string>();
vi.stubGlobal('localStorage', {
	getItem: (key: string) => slot.get(key) ?? null,
	setItem: (key: string, value: string) => slot.set(key, value),
	removeItem: (key: string) => slot.delete(key)
});

// jsdom lays nothing out, so every rect is zero. The measurement under test is
// that the mount's own box is what gets asked — not what a real browser answers.
const MEASURED = 1292;
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
	configurable: true,
	value: () => ({ width: SHEET_WIDTH, height: MEASURED })
});

async function downloadedText(): Promise<string> {
	const [blob] = vi.mocked(downloadBlob).mock.lastCall ?? [];
	if (!(blob instanceof Blob)) throw new Error('nothing was downloaded');
	return blob.text();
}

afterEach(() => {
	vi.clearAllMocks();
	canvas.replace(blankCanvas());
	document.body.innerHTML = '';
});

describe('exportSvgArtifact', () => {
	it('writes the renderer bytes at the height the mount measured', async () => {
		await exportSvgArtifact(canvas.doc);
		const svg = await downloadedText();
		expect(svg).toContain(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_WIDTH}"`);
		expect(svg).toContain(`height="${MEASURED}"`);
		expect(vi.mocked(downloadBlob).mock.lastCall?.[0].type).toBe('image/svg+xml');
	});

	it('downloads under the slug filename, with the unnamed fallback', async () => {
		canvas.commit((doc) => (doc.name = 'Order Fulfillment'));
		await exportSvgArtifact(canvas.doc);
		expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'order-fulfillment.bcc.svg');

		canvas.commit((doc) => (doc.name = ''));
		await exportSvgArtifact(canvas.doc);
		expect(downloadBlob).toHaveBeenLastCalledWith(
			expect.any(Blob),
			'bounded-context-canvas.bcc.svg'
		);
	});

	it('leaves Unexported changes standing — an image carries no Canvas file', async () => {
		canvas.commit((doc) => (doc.name = 'Dirty'));
		expect(canvas.unexported).toBe(true);
		await exportSvgArtifact(canvas.doc);
		expect(canvas.unexported).toBe(true);
	});

	it('removes the offscreen mount afterwards', async () => {
		await exportSvgArtifact(canvas.doc);
		expect(document.body.innerHTML).toBe('');
	});
});
