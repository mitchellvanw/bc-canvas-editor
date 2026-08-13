/**
 * The renderer's public face (wayfinder ticket 050): a core returning parts,
 * with thin named containers composed from it.
 *
 * ```
 * renderSheetParts(doc) → { markup, css }   the core
 * fontFaceCss()         → string            composable, never a flag
 * sheetDocument / sheetSvg                  file containers
 * ```
 *
 * The `.bcc.html` artifact is the fourth container and lives in
 * `$lib/artifact/html.ts`, where the View panels and print pass it also owns
 * already are.
 *
 * Everything here forwards to `dist/render.js`, which is committed rather than
 * imported from source because the sheet has to be compiled in server mode —
 * see `build.js`. This file is where that bundle's types are declared; it adds
 * no behaviour, deliberately, so that "the sheet `bcc` renders and the sheet
 * the editor exports are the same sheet" stays one function called twice.
 */

import type { CanvasDoc } from '$lib/model/canvas';
import * as built from './dist/render.js';

export interface SheetParts {
	/** The sheet inside its scoping wrapper — paste-ready beside `css`. */
	markup: string;
	/** Everything that markup needs except the fonts, which compose separately. */
	css: string;
}

export interface SvgSize {
	/** The viewport width in CSS pixels; the sheet lays out against it. */
	width: number;
	/** The viewport height. Nothing headless can measure it — the caller says. */
	height: number;
}

/**
 * The class the renderer's own CSS hangs off, and the only name a host page
 * has to avoid. Tokens land here rather than on `:root`, so a fence in a
 * markdown preview cannot repaint the document around it.
 */
export const SCOPE_CLASS: string = built.SCOPE_CLASS;

/** The ddd-crew's credit, on every file a container writes. */
export const CREDIT_COMMENT: string = built.CREDIT_COMMENT;

/** The sheet as markup plus the CSS it needs. Every container is built on it. */
export const renderSheetParts: (doc: CanvasDoc) => SheetParts = built.renderSheetParts;

/** The eight WOFF2 faces as base64 `@font-face` rules — hoistable, never a flag. */
export const fontFaceCss: () => string = built.fontFaceCss;

/** The sheet alone as a standalone HTML file. */
export const sheetDocument: (doc: CanvasDoc) => string = built.sheetDocument;

/** The sheet alone as an SVG file, at a size only the caller can know. */
export const sheetSvg: (doc: CanvasDoc, size: SvgSize) => string = built.sheetSvg;
