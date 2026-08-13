/**
 * HTML artifact export (SPEC §9.1): a single self-contained document — the
 * headless renderer's read-only sheet, its CSS and base64 WOFF2 fonts, the
 * ddd-crew credit comment, a byte-identical embedded Canvas file, a one-column
 * responsive stack and a print pass — downloaded as <slug>.bcc.html.
 *
 * No jsdom and no fetch mock since wayfinder ticket 050: the export reaches
 * neither the DOM nor the network, so the environment this ran in was the last
 * thing standing between the file and plain Node.
 */
import { describe, expect, it, vi } from 'vitest';
import { stampIds } from '$lib/model/canvas';
import { canvasDigest } from '$lib/model/digest';
import { extractEmbeddedCanvas } from '$lib/model/embed';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { fontFaceCss, renderSheetParts, SCOPE_CLASS } from '$lib/render';
import { serializeCanvas, toCanvasFile } from '$lib/model/serialize';
import { downloadBlob } from './download';
import { artifactDocument, exportHtmlArtifact, STACK_BREAKPOINT } from './html';

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

describe('artifactDocument', () => {
	it('is a standalone English document titled like the app, credited to the ddd-crew', () => {
		const html = artifactDocument(referenceDoc());
		expect(html.startsWith('<!doctype html>')).toBe(true);
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<title>Order Fulfillment — BC Canvas</title>');
		expect(html).toContain('name="viewport"');
		const comment = html.slice(0, html.indexOf('<html'));
		expect(comment).toContain('ddd-crew');
		expect(comment).toContain('https://github.com/ddd-crew/bounded-context-canvas');
		expect(comment).toContain('https://creativecommons.org/licenses/by/4.0/');
	});

	it('draws the sheet the renderer draws — the same one bcc render writes', () => {
		const doc = referenceDoc();
		const html = artifactDocument(doc);
		expect(html).toMatch(/<h1[^>]*>[\s\S]*?Order Fulfillment/);
		expect(html).toContain('CC BY 4.0');
		// Not "agrees with", which was the test this replaced: the same function,
		// called twice (wayfinder ticket 050 decision 1).
		expect(sheetPanel(html)).toContain(renderSheetParts(doc).markup);
		// Scoped to the Sheet panel: the artifact has buttons of its own — the
		// View tabs — and they are exactly the affordance the sheet must still
		// not grow (SPEC §9, the sheet is shared with the PNG mount).
		expect(sheetPanel(html)).not.toMatch(/contenteditable|data-placeholder|<button|<input/);
	});

	it('embeds the Canvas file byte-identically to the .bcc.json export (SPEC §9.1)', () => {
		const doc = referenceDoc();
		expect(extractEmbeddedCanvas(artifactDocument(doc))).toBe(serializeCanvas(doc));
	});

	it("carries the renderer's CSS and fonts, and nothing to fetch them with", () => {
		const doc = referenceDoc();
		const html = artifactDocument(doc);
		expect(html).toContain(renderSheetParts(doc).css);
		expect(html).toContain(fontFaceCss());
		// The whole compiled app stylesheet used to be in here — Tailwind's
		// preflight, every utility, and the scoped CSS of Chrome, EditableSheet,
		// Picker and JsonView, to draw a read-only sheet.
		expect(html).not.toContain('--tw-');
		expect(html).not.toMatch(/\.woff\b/);
	});

	it('paints the ground once, on the body the renderer scopes its tokens to', () => {
		const html = artifactDocument(referenceDoc());
		expect(html).toContain(`<body class="${SCOPE_CLASS}">`);
		// The wrapper carries its own ground so a fence is self-contained; a
		// second painting inside the document would restart the 32px drafting
		// grid at the wrapper's origin, seaming the Sheet panel's edges.
		expect(html).toContain(`.views__panel .${SCOPE_CLASS} { background: none; }`);
	});

	it('carries the one-column stack below the breakpoint and the print pass (SPEC §9.1)', () => {
		const html = artifactDocument(referenceDoc());
		expect(html).toContain(`@media (max-width: ${STACK_BREAKPOINT}px)`);
		expect(html).toContain('grid-template-columns: 1fr');
		expect(html).toContain('@media print');
		expect(html).toContain('break-inside: avoid');
	});

	it('carries two scripts and nothing else from anywhere', () => {
		// The export used to read the live document — every stylesheet and style
		// tag on the served page — which is how Cloudflare's serve-time analytics
		// beacon got a test of its own. Nothing is read from a page now; there is
		// no page. Two scripts, both inert: the embedded Canvas file, and the
		// artifact's own enhancement. An artifact that fetches is not
		// self-contained (SPEC §9.1).
		const html = artifactDocument(referenceDoc());
		const scripts = html.match(/<script\b[^>]*/g) ?? [];
		expect(scripts).toEqual(['<script type="application/json" data-canvas-file', '<script']);
		expect(html).not.toMatch(/<script[^>]*\ssrc=/);
		expect(html).not.toMatch(/<link\b/);
	});

	it('pre-renders all three Views, visible and unhidden (SPEC §9.1)', () => {
		const doc = referenceDoc();
		const html = artifactDocument(doc);

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

	it('ships the tab strip hidden and lets the script alone reveal it', () => {
		const html = artifactDocument(referenceDoc());
		// The strip is dead without script, so a script-less viewer must never
		// see it — and its bar goes with it, or an empty 14px band survives.
		expect(html).toMatch(/<div class="views__strip" role="tablist" aria-label="Views" hidden>/);
		expect(html).toContain('.views__strip[hidden] { display: none; }');
		expect(html).toContain("strip.removeAttribute('hidden')");
		// And it stands alone: a wrapper would keep its own gap once the strip
		// inside it went hidden, leaving an empty band above the sheet.
		expect(html).not.toContain('views__bar');
	});

	it('prints the Sheet alone, whichever View is on screen (SPEC §9.1)', () => {
		const html = artifactDocument(referenceDoc());
		const print = html.slice(html.indexOf('@media print'));
		expect(print).toContain('#view-panel-json, #view-panel-markdown { display: none; }');
		expect(print).toContain('.views__strip, .views__heading { display: none; }');
		expect(print).toContain('#view-panel-sheet { display: block; }');
		// And the reason that rule can win: the script hides panels with a class
		// of the artifact's own, which the print pass outranks on specificity
		// with no !important anywhere. That began as a workaround — the artifact
		// then inlined Tailwind's preflight, which hides [hidden] with an
		// !important inside @layer base, and layers reverse for important
		// declarations, so nothing unlayered could raise the Sheet back up.
		// Printing from a text tab produced a blank page until this changed. The
		// stylesheet left with the headless renderer; the class stays because it
		// is the simpler mechanism. The bytes are what a unit test can read; the
		// cascade is checked in a browser by ticket 048.
		expect(html).toContain('.views__panel--off { display: none; }');
		expect(html).toContain("panels[i].classList.add('views__panel--off')");
		expect(html).not.toContain('panels[i].hidden');
		expect(print).not.toContain('!important');
	});

	it('escapes panel text so a canvas can never break out of its pane', () => {
		const doc = referenceDoc();
		doc.purpose = 'Closes </pre><script>alert(1)</script> & opens <b>';
		const html = artifactDocument(doc);
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
		// The embedded Canvas file still round-trips out byte-identically: the
		// serializer escapes every `<`, so the block's own close tag stays the
		// first one after the marker (SPEC §9.1).
		expect(extractEmbeddedCanvas(html)).toBe(serializeCanvas(doc));
		const scripts = html.match(/<script\b[^>]*/g) ?? [];
		expect(scripts).toHaveLength(2);
	});

	it('titles an unnamed canvas Untitled and escapes markup in the name', () => {
		const doc = referenceDoc();
		doc.name = '';
		expect(artifactDocument(doc)).toContain('<title>Untitled — BC Canvas</title>');
		doc.name = 'A <b> & co';
		expect(artifactDocument(doc)).toContain('<title>A &lt;b&gt; &amp; co — BC Canvas</title>');
	});
});

describe('exportHtmlArtifact', () => {
	it('downloads under the slug filename as text/html', async () => {
		exportHtmlArtifact(referenceDoc());
		expect(downloadBlob).toHaveBeenCalledOnce();
		const [blob, name] = vi.mocked(downloadBlob).mock.calls[0];
		expect(name).toBe('order-fulfillment.bcc.html');
		expect(blob.type).toBe('text/html');
		expect(await blob.text()).toContain('<!doctype html>');
	});
});
