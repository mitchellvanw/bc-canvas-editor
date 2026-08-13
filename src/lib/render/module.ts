/**
 * The renderer's entry point — the file `build.js` compiles into the committed
 * `dist/render.js` every consumer imports (wayfinder ticket 050). It is never
 * imported from source: the sheet has to be compiled in server mode, and one
 * Vite build cannot emit both compiles, so the built module is the interface.
 *
 * A core that returns parts, with thin named containers composed from it. The
 * consumers want different *containers* — a `.bcc.html`, a `.bcc.svg`, and a
 * fragment injected into someone else's page — and a fragment is not a
 * document with options switched off, which is why there are no options here.
 *
 * The three `__BCC_*` constants are the payloads that come off disk at build
 * time: the `@theme` tokens and the paper ground lifted out of `src/app.css`,
 * and the WOFF2 faces base64'd out of `node_modules`. Baking them in is what
 * kills the old export's runtime `fetch` against a live same-origin server
 * (SPEC §13's noted risk) and what lets an installed `bcc` render with no
 * `@fontsource` package anywhere near it.
 */

import { render } from 'svelte/server';
import type { CanvasDoc } from '$lib/model/canvas';
import CanvasSheet from '$lib/sheet/CanvasSheet.svelte';
import { windowTitle } from '$lib/model/title';
import { SHEET_MARGIN, SHEET_WIDTH } from './metrics';

/** Declared, never defined: `build.js` substitutes these before they ship. */
declare const __BCC_TOKENS__: string;
declare const __BCC_GROUND__: string;
declare const __BCC_FONT_FACE__: string;

/**
 * The class the renderer's own CSS hangs off, and the only name a host page
 * has to avoid. Tokens land here rather than on `:root` (ticket 050 decision
 * 5): a fence in someone's markdown preview must not push `--font-sans` onto
 * the document around it.
 */
export const SCOPE_CLASS = 'bcc-canvas';

export interface SheetParts {
	/** The sheet inside its scoping wrapper — paste-ready beside `css`. */
	markup: string;
	/** Everything that markup needs except the fonts, which compose separately. */
	css: string;
}

/**
 * Svelte returns injected component CSS as `<style>` tags on `head`. The
 * containers want the declarations, and the throw is the point: if the sheet
 * ever grows a `<svelte:head>`, silently dropping it would be the failure.
 */
function styleText(head: string): string {
	const stripped = head.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, '');
	if (stripped.trim()) {
		throw new Error(`CanvasSheet emitted non-style head content: ${stripped.trim()}`);
	}
	const parts: string[] = [];
	for (const match of head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) parts.push(match[1]);
	if (!parts.length) {
		throw new Error('CanvasSheet emitted no scoped CSS — was it compiled with css: "injected"?');
	}
	return parts.join('\n').trim();
}

/**
 * What the sheet took from Tailwind's preflight and never restated: border-box
 * everywhere, and no UA margins on the elements it lays out itself. Scoped to
 * the wrapper and written at zero specificity with `:where`, so it reaches
 * nothing of a host page and loses to every rule the sheet has of its own.
 */
const RESET_CSS = `.${SCOPE_CLASS},
.${SCOPE_CLASS} *,
.${SCOPE_CLASS} *::before,
.${SCOPE_CLASS} *::after {
	box-sizing: border-box;
}
.${SCOPE_CLASS} :where(h1, h2, h3, h4, p, figure, blockquote, dl, dd, pre) {
	margin: 0;
}
.${SCOPE_CLASS} :where(ul, ol) {
	margin: 0;
	padding: 0;
	list-style: none;
}`;

/**
 * The core. Everything else on this module is a container around it, so the
 * `.bcc.html`, the `.bcc.svg` and a fence provably draw one sheet rather than
 * being asserted to.
 */
export function renderSheetParts(doc: CanvasDoc): SheetParts {
	const { body, head } = render(CanvasSheet, { props: { doc } });
	return {
		markup: `<div class="${SCOPE_CLASS}">${body}</div>`,
		css: `.${SCOPE_CLASS} {\n${__BCC_TOKENS__}\n${__BCC_GROUND__}\n}\n${RESET_CSS}\n${styleText(head)}`
	};
}

/**
 * The eight faces as base64 WOFF2, and never a flag. Every container that
 * writes a *file* inlines them — an SVG viewed through `<img>` on github.com
 * is a sandbox no external load survives — and the fragment consumers hoist
 * this where they want it, once per document rather than once per fence.
 */
export function fontFaceCss(): string {
	return __BCC_FONT_FACE__;
}

/** The page frame both file containers draw the sheet in (SPEC §9.2). */
const FRAME_CSS = `body { margin: 0; }
main { max-width: ${SHEET_WIDTH}px; margin: 0 auto; padding: ${SHEET_MARGIN}px; }`;

/**
 * The ddd-crew's credit, on every file this project hands to somebody. The
 * sheet carries it visibly in its own footer; this is the machine-readable
 * half, and it lives here because both file containers are written here and a
 * second copy of a licence sentence is how one of them ends up without it.
 */
export const CREDIT_COMMENT =
	'<!-- Based on the Bounded Context Canvas by the ddd-crew ' +
	'(https://github.com/ddd-crew/bounded-context-canvas), ' +
	'licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). -->';

function escapeHtml(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** The sheet alone as a standalone HTML file. */
export function sheetDocument(doc: CanvasDoc): string {
	const { markup, css } = renderSheetParts(doc);
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(windowTitle(doc.name))}</title>
<style>${fontFaceCss()}</style>
<style>
${FRAME_CSS}
${css}
</style>
</head>
<body>
<main>${markup}</main>
</body>
</html>
`;
}

export interface SvgSize {
	/** The viewport width in CSS pixels; the sheet lays out against it. */
	width: number;
	/** The viewport height. Nothing headless can measure it — the caller says. */
	height: number;
}

/**
 * The sheet as an SVG file: the same HTML, in the same page frame, wrapped in a
 * `foreignObject` so that no browser is needed to produce it and any web engine
 * can draw it.
 *
 * The size is the caller's because the renderer cannot know it — laying the
 * sheet out is exactly the work a headless renderer does not do. What the
 * committed image does with that is wayfinder ticket 056's.
 *
 * The frame is `FRAME_CSS`, the one `sheetDocument` draws in and the one
 * `measure.ts` measures against, so the height a browser reports for the page
 * is the height this file needs. Until ticket 062 that claim was false — the
 * sheet laid out edge to edge at the full viewport width where every other
 * surface gave it 1360 — and the slack showed up as blank paper at the bottom
 * of every measured image.
 *
 * The root `<div>` takes the scoping class, the way the artifact's `<body>`
 * does, so the paper ground reaches the frame's margin rather than stopping at
 * the sheet. That nests the wrapper inside a second one, and the ground is
 * neutralised on the inner of the two for the reason the artifact neutralises
 * it: a second painting restarts the 32px drafting grid at the wrapper's
 * origin, which is a visible seam.
 *
 * `xmlns` stays on `http:` deliberately: on `https:` github.com's blob view
 * re-serializes the file (ticket 049).
 */
export function sheetSvg(doc: CanvasDoc, size: SvgSize): string {
	const { markup, css } = renderSheetParts(doc);
	return `${CREDIT_COMMENT}
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
<foreignObject x="0" y="0" width="${size.width}" height="${size.height}">
<div xmlns="http://www.w3.org/1999/xhtml" class="${SCOPE_CLASS}">
<style>${fontFaceCss()}</style>
<style>
${FRAME_CSS}
${css}
.${SCOPE_CLASS} .${SCOPE_CLASS} { background: none; }
</style>
<main>${markup}</main>
</div>
</foreignObject>
</svg>
`;
}
