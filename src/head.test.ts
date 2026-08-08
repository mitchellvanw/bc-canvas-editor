/**
 * Public-URL polish (wayfinder ticket 018): what a shared bc-canvas.pages.dev
 * link presents before any JavaScript runs. Reads the shipped `src/app.html`
 * and `static/` icons — the served head is prerendered from exactly these — so
 * the check can never drift from what an unfurler or browser tab actually sees.
 *
 * Decisions under test, for the record:
 * - The favicon is BC Canvas's own mark (the miniature quiet sheet), drawn
 *   only in quiet-sheet tokens — never again SvelteKit's template logo.
 * - WebKit does not render SVG favicons, so PNG fallbacks ship beside the
 *   SVG: 48×48 favicon.png and 180×180 apple-touch-icon.png.
 * - Unfurlers read og:title, so a pasted link leads with "BC Canvas" — the
 *   tab title alone stays live-derived per SPEC §10 (`Untitled — BC Canvas`).
 * - theme-color is the paper ground, kept in lockstep with app.css.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('./app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const faviconSvg = readFileSync(new URL('../static/favicon.svg', import.meta.url), 'utf8');

function token(name: string): string {
	const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
	if (!match) throw new Error(`token --color-${name} missing from src/app.css @theme`);
	return match[1].toLowerCase();
}

/** Width and height from a PNG's IHDR chunk. */
function pngHeader(path: URL): { width: number; height: number } {
	const bytes = readFileSync(path);
	expect(bytes.subarray(1, 4).toString('latin1'), `${path.pathname} is a PNG`).toBe('PNG');
	return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const APP_DESCRIPTION =
	'An editor for the ddd-crew Bounded Context Canvas. Runs in the browser; the canvas stays on your machine until you export it.';

describe('the shared-link head (wayfinder ticket 018)', () => {
	it('describes the app in one documentary sentence, for search and unfurls alike', () => {
		expect(html).toContain(`<meta name="description" content="${APP_DESCRIPTION}" />`);
		expect(html).toContain(`<meta property="og:description" content="${APP_DESCRIPTION}" />`);
	});

	it('unfurls lead with the app name, not the live tab title', () => {
		expect(html).toContain('<meta property="og:title" content="BC Canvas" />');
	});

	it('stays quiet: no social-card image, no twitter tags, no hardcoded origin', () => {
		expect(html).not.toContain('og:image');
		expect(html).not.toContain('twitter:');
		expect(html).not.toContain('pages.dev');
	});

	it('theme-color is the paper ground, in lockstep with the app.css token', () => {
		expect(html).toContain(`<meta name="theme-color" content="${token('paper')}" />`);
	});

	it('links the SVG mark with PNG fallbacks (WebKit renders no SVG favicons)', () => {
		expect(html).toContain('<link rel="icon" href="/favicon.png" sizes="48x48" />');
		expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />');
		expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
	});
});

describe('the favicon mark (wayfinder ticket 018)', () => {
	it('is drawn only in quiet-sheet tokens — the template logo colors are gone', () => {
		expect(faviconSvg).not.toContain('#ff3e00'); // Svelte orange
		expect(faviconSvg.toLowerCase()).not.toContain('svelte');
		const fills = [...faviconSvg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)].map((m) =>
			m[1].toLowerCase()
		);
		expect(fills.length).toBeGreaterThan(0);
		const palette = [
			'paper',
			'sheet',
			'line',
			'ink',
			'ink-faint',
			'command',
			'query',
			'event'
		].map(token);
		for (const fill of fills) expect(palette, `favicon color ${fill}`).toContain(fill);
	});

	it('ships raster fallbacks at the sizes the head declares', () => {
		expect(pngHeader(new URL('../static/favicon.png', import.meta.url))).toEqual({
			width: 48,
			height: 48
		});
		expect(pngHeader(new URL('../static/apple-touch-icon.png', import.meta.url))).toEqual({
			width: 180,
			height: 180
		});
	});

	it('the SvelteKit template favicon no longer exists in the source tree', () => {
		expect(() => readFileSync(new URL('./lib/assets/favicon.svg', import.meta.url))).toThrow();
	});
});
