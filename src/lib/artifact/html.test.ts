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
import { canvasDigest } from '$lib/model/digest';
import { extractEmbeddedCanvas } from '$lib/model/embed';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { serializeCanvas, toCanvasFile } from '$lib/model/serialize';
import { downloadBlob } from './download';
import { buildHtmlArtifact, exportHtmlArtifact, STACK_BREAKPOINT } from './html';

vi.mock('./download', () => ({ downloadBlob: vi.fn() }));

function referenceDoc() {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

/** What a panel's text looks like once it is HTML rather than bytes. */
function escapeText(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** The Sheet View's own markup, without the two text panels or the tab strip. */
function sheetPanel(html: string): string {
	const start = html.indexOf('<section class="views__panel" id="view-panel-sheet"');
	const end = html.indexOf('<section class="views__panel" id="view-panel-json"');
	expect(start).toBeGreaterThan(-1);
	expect(end).toBeGreaterThan(start);
	return html.slice(start, end);
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
		// Scoped to the Sheet panel: the artifact now has buttons of its own —
		// the View tabs — and they are exactly the affordance the sheet must
		// still not grow (SPEC §9, the offscreen mount is shared with the PNG).
		expect(sheetPanel(html)).not.toMatch(/contenteditable|data-placeholder|<button|<input/);
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

	it('never carries the analytics beacon injected into the served page', async () => {
		// Cloudflare Web Analytics injects its beacon at serve time, so the
		// script exists in the live DOM the exporter runs in — never in the
		// repo. Plant it where the edge would and prove the artifact stays
		// script-free apart from the embedded Canvas file.
		const beacon = document.createElement('script');
		beacon.type = 'module';
		beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
		beacon.setAttribute('data-cf-beacon', '{"token": "site-token"}');
		document.head.append(beacon);
		document.body.append(beacon.cloneNode(true));

		const html = await buildHtmlArtifact(referenceDoc());
		expect(html).not.toContain('cloudflareinsights');
		expect(html).not.toContain('data-cf-beacon');
		// Two scripts and no others: the embedded Canvas file, and the artifact's
		// own inline enhancement. Neither one loads anything — an artifact that
		// fetches is not self-contained (SPEC §9.1).
		const scripts = html.match(/<script\b[^>]*/g) ?? [];
		expect(scripts).toEqual(['<script type="application/json" data-canvas-file', '<script']);
		expect(html).not.toMatch(/<script[^>]*\ssrc=/);
	});

	it('pre-renders all three Views, visible and unhidden (SPEC §9.1)', async () => {
		const doc = referenceDoc();
		const html = await buildHtmlArtifact(doc);

		for (const key of ['sheet', 'json', 'markdown']) {
			expect(html).toContain(`<section class="views__panel" id="view-panel-${key}"`);
			expect(html).toContain(`id="view-tab-${key}"`);
		}
		// The JSON panel is the export's own bytes, and the Markdown is the one
		// renderer's — the same function the Markdown View and `.bcc.md` use.
		expect(html).toContain(escapeText(serializeCanvas(doc)));
		expect(html).toContain(escapeText(canvasDigest(toCanvasFile(doc))));

		// Nothing about the panels waits on script: no panel ships hidden, and
		// each carries a heading naming it in the stack.
		expect(html).not.toMatch(/<section class="views__panel"[^>]*hidden/);
		for (const label of ['Sheet', 'JSON', 'Markdown']) {
			expect(html).toContain(`<p class="views__heading">${label}</p>`);
		}
	});

	it('ships the tab strip hidden and lets the script alone reveal it', async () => {
		const html = await buildHtmlArtifact(referenceDoc());
		// The strip is dead without script, so a script-less viewer must never
		// see it — and its bar goes with it, or an empty 14px band survives.
		expect(html).toMatch(/<div class="views__strip" role="tablist" aria-label="Views" hidden>/);
		expect(html).toContain('.views__strip[hidden] { display: none; }');
		expect(html).toContain("strip.removeAttribute('hidden')");
		// And it stands alone: a wrapper would keep its own gap once the strip
		// inside it went hidden, leaving an empty band above the sheet.
		expect(html).not.toContain('views__bar');
	});

	it('prints the Sheet alone, whichever View is on screen (SPEC §9.1)', async () => {
		const html = await buildHtmlArtifact(referenceDoc());
		const print = html.slice(html.indexOf('@media print'));
		expect(print).toContain('#view-panel-json, #view-panel-markdown { display: none; }');
		expect(print).toContain('.views__strip, .views__heading { display: none; }');
		expect(print).toContain('#view-panel-sheet { display: block; }');
		// And the reason that rule can win: the script hides panels with a class
		// of the artifact's own. The `hidden` attribute is unreachable from here
		// — Tailwind's preflight hides it with `!important` inside `@layer base`,
		// and layers reverse for important declarations, so no unlayered rule of
		// ours outranks it. Printing from a text tab produced a blank page until
		// this changed. The bytes are what a unit test can read; the cascade is
		// checked in a browser by `wayfinder/tickets/048-views-checkpoint.md`.
		expect(html).toContain('.views__panel--off { display: none; }');
		expect(html).toContain("panels[i].classList.add('views__panel--off')");
		expect(html).not.toContain('panels[i].hidden');
		expect(print).not.toContain('!important');
	});

	it('escapes panel text so a canvas can never break out of its pane', async () => {
		const doc = referenceDoc();
		doc.purpose = 'Closes </pre><script>alert(1)</script> & opens <b>';
		const html = await buildHtmlArtifact(doc);
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		// The embedded Canvas file still round-trips out byte-identically: the
		// serializer escapes every `<`, so the block's own close tag stays the
		// first one after the marker (SPEC §9.1).
		expect(extractEmbeddedCanvas(html)).toBe(serializeCanvas(doc));
		const scripts = html.match(/<script\b[^>]*/g) ?? [];
		expect(scripts).toHaveLength(2);
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
