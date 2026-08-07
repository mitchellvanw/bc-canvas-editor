// @vitest-environment jsdom
/**
 * HTML artifact export (SPEC §9.1): a single self-contained document —
 * offscreen-mount serialization of the read-only sheet, app CSS fetched
 * same-origin and inlined with base64 WOFF2 fonts, ddd-crew credit comment,
 * byte-identical embedded Canvas file, one-column responsive stack, print
 * pass — downloaded as <slug>.bcc.html.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stampIds } from '$lib/model/canvas';
import { extractEmbeddedCanvas } from '$lib/model/embed';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { serializeCanvas } from '$lib/model/serialize';
import { downloadBlob } from './download';
import { buildHtmlArtifact, exportHtmlArtifact, STACK_BREAKPOINT } from './html';

vi.mock('./download', () => ({ downloadBlob: vi.fn() }));

function referenceDoc() {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

const APP_CSS = '.quiet-sheet{color:#1a1e20}';
const LINKED_CSS =
	"@font-face{font-family:'Archivo';src:url(./files/archivo-latin-500-normal.woff2) format('woff2')}";
const WOFF2_BYTES = new Uint8Array([0x77, 0x4f, 0x46, 0x32]);

const fetchMock = vi.fn(async (url: string) => {
	if (url.endsWith('.css')) return { ok: true, text: async () => LINKED_CSS };
	if (url.endsWith('.woff2')) {
		return { ok: true, arrayBuffer: async () => WOFF2_BYTES.buffer.slice(0) };
	}
	throw new Error(`unexpected fetch ${url}`);
});

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
	const style = document.createElement('style');
	style.textContent = APP_CSS;
	document.head.append(style);
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = '/assets/app.css';
	document.head.append(link);
	const foreign = document.createElement('link');
	foreign.rel = 'stylesheet';
	foreign.href = 'https://fonts.example/foreign.css';
	document.head.append(foreign);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
	document.head.innerHTML = '';
	document.body.innerHTML = '';
});

describe('buildHtmlArtifact', () => {
	it('is a standalone English document titled like the app, credited to the ddd-crew', async () => {
		const html = await buildHtmlArtifact(referenceDoc());
		expect(html.startsWith('<!doctype html>')).toBe(true);
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<title>Order Fulfillment — BC Canvas</title>');
		expect(html).toContain('name="viewport"');
		const comment = html.slice(0, html.indexOf('<html'));
		expect(comment).toContain('ddd-crew');
		expect(comment).toContain('https://github.com/ddd-crew/bounded-context-canvas');
		expect(comment).toContain('https://creativecommons.org/licenses/by/4.0/');
	});

	it('serializes the offscreen read-only sheet and tears the mount down', async () => {
		const html = await buildHtmlArtifact(referenceDoc());
		expect(html).toMatch(/<h1[^>]*>[\s\S]*?Order Fulfillment/);
		expect(html).toContain('CC BY 4.0');
		expect(html).not.toMatch(/contenteditable|data-placeholder|<button|<input/);
		expect(document.querySelector('.paper-ground')).toBeNull();
	});

	it('embeds the Canvas file byte-identically to the .bcc.json export (SPEC §9.1)', async () => {
		const doc = referenceDoc();
		const html = await buildHtmlArtifact(doc);
		expect(extractEmbeddedCanvas(html)).toBe(serializeCanvas(doc));
	});

	it('inlines every same-origin stylesheet, fonts as base64 WOFF2 data URIs', async () => {
		const html = await buildHtmlArtifact(referenceDoc());
		expect(html).toContain(APP_CSS);
		expect(html).toContain("font-family:'Archivo'");
		expect(html).toContain(`url(data:font/woff2;base64,${btoa('wOF2')})`);
		expect(html).not.toContain('archivo-latin-500-normal.woff2');
		const fetched = fetchMock.mock.calls.map(([url]) => url);
		expect(fetched).toContain('http://localhost:3000/assets/app.css');
		// Relative font URLs resolve against the stylesheet that referenced them.
		expect(fetched).toContain('http://localhost:3000/assets/files/archivo-latin-500-normal.woff2');
		expect(fetched.some((url) => url.includes('fonts.example'))).toBe(false);
	});

	it('carries the one-column stack below the breakpoint and the print pass (SPEC §9.1)', async () => {
		const html = await buildHtmlArtifact(referenceDoc());
		expect(html).toContain(`@media (max-width: ${STACK_BREAKPOINT}px)`);
		expect(html).toContain('grid-template-columns: 1fr');
		expect(html).toContain('@media print');
		expect(html).toContain('break-inside: avoid');
	});

	it('titles an unnamed canvas Untitled and escapes markup in the name', async () => {
		const doc = referenceDoc();
		doc.name = '';
		expect(await buildHtmlArtifact(doc)).toContain('<title>Untitled — BC Canvas</title>');
		doc.name = 'A <b> & co';
		expect(await buildHtmlArtifact(doc)).toContain('<title>A &lt;b&gt; &amp; co — BC Canvas</title>');
	});
});

describe('exportHtmlArtifact', () => {
	it('downloads under the slug filename as text/html', async () => {
		await exportHtmlArtifact(referenceDoc());
		expect(downloadBlob).toHaveBeenCalledOnce();
		const [blob, name] = vi.mocked(downloadBlob).mock.calls[0];
		expect(name).toBe('order-fulfillment.bcc.html');
		expect(blob.type).toBe('text/html');
		expect(await blob.text()).toContain('<!doctype html>');
	});
});
