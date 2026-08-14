/**
 * The headless renderer (wayfinder ticket 050): the sheet drawn in plain Node,
 * with no DOM, no jsdom and no browser, out of one committed module every
 * consumer imports.
 *
 * The identity check charting expected here does not exist, and its absence is
 * the decision. "The sheet `bcc` renders and the sheet the editor exports are
 * the same sheet" was to have been a normalized comparison on four examples;
 * measurement showed such a comparison could only ever permit comment noise,
 * entity noise and attribute reordering — a test that licenses drift. The
 * editor's Export HTML imports this module, so it is one function called
 * twice, and there is nothing left to compare.
 *
 * Three tests stand in its place, and each one guards a property the map's
 * gate rests on:
 *
 * - **staleness** — rebuild to a scratch path, diff the committed bytes, so
 *   `CanvasSheet.svelte` cannot move without the renderer following;
 * - **determinism** — one doc rendered twice, identical bytes, so the
 *   committed-SVG contract fails loudly the day an id reaches the markup;
 * - **token crossing** — every custom property the sheet reads is one the
 *   `@theme` extraction actually carried across.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stampIds } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import {
	CREDIT_COMMENT,
	fontFaceCss,
	renderSheetParts,
	SCOPE_CLASS,
	sheetDocument,
	sheetSvg
} from './index';
import { SHEET_WIDTH } from './metrics';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');

function referenceDoc() {
	const result = parseCanvasFile(REFERENCE_FILE);
	if (!result.ok) throw new Error('reference fixture must parse');
	return stampIds(result.file);
}

describe('the committed module', () => {
	it('is what build.js produces from the sheet as it stands today', () => {
		// The MCP bundle's guard, for the same reason: a dev editing the sheet
		// sees the live editor update immediately and an export only after a
		// rebuild. This is where that gets caught.
		const scratch = mkdtempSync(path.join(tmpdir(), 'bcc-render-'));
		try {
			const rebuilt = path.join(scratch, 'render.js');
			execFileSync('node', [path.join(here, 'build.js'), rebuilt], { cwd: repo });
			expect(readFileSync(rebuilt)).toEqual(readFileSync(path.join(here, 'dist/render.js')));
		} finally {
			rmSync(scratch, { recursive: true, force: true });
		}
	}, 120_000);

	it('runs with nothing beside it — no imports, no Node builtins', () => {
		// What an `npx`'d CLI, a plugin install and a webview all depend on, and
		// the reason the same file runs unchanged in a browser.
		const bundle = readFileSync(path.join(here, 'dist/render.js'), 'utf8');
		expect(bundle).not.toMatch(/^\s*import\s/m);
		expect(bundle).not.toMatch(/require\(['"]node:/);
	});
});

describe('renderSheetParts', () => {
	it('draws the canvas with no DOM anywhere in reach', () => {
		expect(globalThis.document).toBeUndefined();
		const { markup } = renderSheetParts(referenceDoc());
		expect(markup).toMatch(/<h1[^>]*>[\s\S]*?Order Fulfillment/);
		expect(markup).toContain('CC BY 4.0');
		// The read-only sheet, the same one the PNG mount draws: no affordances.
		expect(markup).not.toMatch(/contenteditable|data-placeholder|<button|<input/);
	});

	it('renders one doc to identical bytes twice', () => {
		// `stampIds` mints ids with crypto.randomUUID(), and none of them reach
		// the markup today. Nothing enforced that until now — and a committed
		// `.bcc.svg` that changed on every `bcc render` would be a diff nobody
		// could read.
		const doc = referenceDoc();
		expect(renderSheetParts(doc).markup).toBe(renderSheetParts(doc).markup);
		expect(sheetDocument(doc)).toBe(sheetDocument(doc));
		expect(renderSheetParts(doc).markup).not.toMatch(/\sid="/);
	});

	it('scopes its tokens and its ground to the wrapper, never to the host', () => {
		const { markup, css } = renderSheetParts(referenceDoc());
		expect(markup.startsWith(`<div class="${SCOPE_CLASS}">`)).toBe(true);
		expect(css).toContain(`.${SCOPE_CLASS} {`);
		// A fence lands in someone else's document. Pushing --font-sans onto its
		// :root would repaint the page around the canvas (ticket 050 decision 5).
		expect(css).not.toMatch(/(^|[^-\w]):root\b/);
		expect(css).not.toContain('@theme');
	});

	it('carries the sr-only rule the sheet stopped borrowing from Tailwind', () => {
		// The sheet's last dependency on something outside itself. It comes back
		// on SSR's head with the rest of the scoped CSS, so nothing has to
		// remember to copy it.
		const { css } = renderSheetParts(referenceDoc());
		expect(css).toContain('.sr-only');
		expect(css).toContain('clip:rect(0, 0, 0, 0)');
	});
});

describe('the tokens crossing out of app.css', () => {
	const appCss = readFileSync(path.join(repo, 'src/app.css'), 'utf8');
	const sheet = readFileSync(path.join(repo, 'src/lib/sheet/CanvasSheet.svelte'), 'utf8');

	/** Names declared inside the sheet's own rules — its private locals. */
	const local = new Set(
		[...sheet.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((match) => match[1])
	);
	const read = [...new Set([...sheet.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]))]
		.filter((name) => !local.has(name))
		.sort();

	it('carries every custom property the sheet reads', () => {
		// A token added to @theme and used by the sheet but never crossed would
		// render as an unset value — invisible text, or a missing fill — so it
		// fails here instead.
		const { css } = renderSheetParts(referenceDoc());
		const declared = new Set(
			[...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((match) => match[1])
		);
		expect(read.length).toBeGreaterThan(20);
		expect(read.filter((name) => !declared.has(name))).toEqual([]);
	});

	it('takes them from the one @theme block, at the values app.css states', () => {
		const { css } = renderSheetParts(referenceDoc());
		const theme = appCss.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
		for (const [, name, value] of theme.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)) {
			expect(css).toContain(`${name}: ${value};`);
		}
	});
});

describe('fontFaceCss', () => {
	it('inlines the eight faces app.css imports, and never a legacy .woff', () => {
		// The old exporter rewrote fontsource's compiled src: list, which names a
		// WOFF2 and a WOFF in one breath, and base64'd both — 202 KB of fallback
		// no WOFF2-capable browser will ever ask for. Authoring the rules from
		// the files on disk simply never writes one.
		const css = fontFaceCss();
		const imports = [...readFileSync(path.join(repo, 'src/app.css'), 'utf8').matchAll(
			/@import\s+'@fontsource\//g
		)];
		expect(css.match(/@font-face/g)).toHaveLength(imports.length);
		expect(css.match(/data:font\/woff2;base64,/g)).toHaveLength(imports.length);
		expect(css).not.toMatch(/\.woff\b/);
		expect(css).not.toContain('url(./files/');
	});

	it('composes rather than switching — the fragment consumers hoist it', () => {
		// Once per document rather than once per fence: a preview re-renders on
		// every keystroke, and three self-contained fences would be 600 KB of it.
		expect(renderSheetParts(referenceDoc()).css).not.toContain('@font-face');
		expect(sheetDocument(referenceDoc())).toContain('@font-face');
	});
});

describe('sheetDocument', () => {
	it('is a standalone English page titled like the app', () => {
		const html = sheetDocument(referenceDoc());
		expect(html.startsWith('<!doctype html>')).toBe(true);
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<title>Order Fulfillment — BC Canvas</title>');
		// Self-contained means self-contained: nothing to fetch, nothing to run.
		expect(html).not.toMatch(/<script/);
		expect(html).not.toMatch(/\ssrc=|<link/);
	});
});

describe('sheetSvg', () => {
	it('wraps the same HTML in a foreignObject at the size it is given', () => {
		const svg = sheetSvg(referenceDoc(), { width: 1440, height: 2400 });
		expect(svg.startsWith(`${CREDIT_COMMENT}\n<svg xmlns="http://www.w3.org/2000/svg"`)).toBe(true);
		// http:, not https: — on https: github.com's blob view re-serializes the
		// file (wayfinder ticket 049).
		expect(svg).not.toContain('https://www.w3.org/');
		expect(svg).toContain('viewBox="0 0 1440 2400"');
		expect(svg).toContain(`<div xmlns="http://www.w3.org/1999/xhtml" class="${SCOPE_CLASS}">`);
		expect(svg).toContain(renderSheetParts(referenceDoc()).markup);
	});

	it('draws the sheet in the page frame the measurement was taken against', () => {
		// The height comes from a browser laying out `sheetDocument`, so an SVG
		// laying the sheet out at a different width is measured slack — blank
		// paper at the foot of every committed image (ticket 062).
		const svg = sheetSvg(referenceDoc(), { width: SHEET_WIDTH, height: 2400 });
		expect(svg).toContain(sheetDocument(referenceDoc()).match(/^main \{.*$/m)?.[0]);
		expect(svg).toContain(`<main>${renderSheetParts(referenceDoc()).markup}</main>`);
		// Ground to the frame's edge, painted once: the root div carries it the
		// way the artifact's body does, and the wrapper inside stops painting so
		// the 32px drafting grid does not restart at the sheet's corner.
		expect(svg).toContain(`.${SCOPE_CLASS} .${SCOPE_CLASS} { background: none; }`);
	});

	it('is well-formed XML, which an SVG has to be to draw at all', () => {
		const svg = sheetSvg(referenceDoc(), { width: 1440, height: 2400 });
		// Svelte's SSR output is XHTML-shaped by luck rather than by promise —
		// one unclosed void element in the sheet and every committed image stops
		// rendering, silently, everywhere.
		expect(svg).not.toMatch(/<(br|hr|img|input|meta|link)(\s[^>]*[^/])?>/);
		expect(svg).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;|#)/);
		// The markup is serializer-escaped, but `<style>` is a raw-text element
		// the serializer never touches: a literal `<` inside it — a CSS comment
		// is all it takes — is legal HTML and fatal XML, so the artifact keeps
		// working while every committed image turns into a broken-image icon
		// (ticket 063, found the day it happened).
		const styles = [...svg.matchAll(/<style>(.*?)<\/style>/gs)];
		expect(styles.length).toBeGreaterThan(0);
		for (const [, css] of styles) expect(css).not.toContain('<');
	});

	it('declares the SVG namespace on every glyph the sheet draws', () => {
		// Inside the foreignObject this markup is XHTML, and an <svg> that does
		// not say otherwise inherits it — so the four collaborator-kind glyphs
		// and the footer legend keys draw as nothing at all. Nothing on screen
		// shows this: in the browser the HTML parser supplies the namespace, and
		// the attribute looks like one a tidy-up could drop (ticket 056).
		const { markup } = renderSheetParts(referenceDoc());
		const opens = markup.match(/<svg\b[^>]*>/g) ?? [];
		expect(opens.length).toBeGreaterThan(4);
		expect(opens.filter((tag) => !tag.includes('xmlns="http://www.w3.org/2000/svg"'))).toEqual(
			[]
		);
	});
});
