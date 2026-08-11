/**
 * HTML artifact (SPEC §9.1): one self-contained `.bcc.html` that opens
 * anywhere — offline — as the pixel-identical quiet sheet. It serializes the
 * offscreen artifact mount (never the live editor DOM), inlines the app's
 * compiled stylesheet fetched same-origin at export time (runtime fetch by
 * design — Vite `?inline` is the unverified path, SPEC §13) with fonts as
 * base64 WOFF2 data URIs, and embeds the Canvas file byte-identically for
 * re-import. Clearing Unexported changes on success is the caller's move —
 * the flag must survive a failed build.
 */

import type { CanvasDoc } from '$lib/model/canvas';
import { embeddedCanvasBlock } from '$lib/model/embed';
import { exportFileName } from '$lib/model/filename';
import { serializeCanvas } from '$lib/model/serialize';
import { windowTitle } from '$lib/model/title';
import { downloadBlob } from './download';
import { ARTIFACT_MARGIN, ARTIFACT_WIDTH, mountArtifactSheet } from './offscreen';

const REPO_URL = 'https://github.com/ddd-crew/bounded-context-canvas';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

/**
 * Below this the grid stacks to one column in reading order (SPEC §9.1); it
 * also carries the AA 200%-zoom reflow, since zoom halves the CSS viewport.
 */
export const STACK_BREAKPOINT = 760;

/**
 * Artifact-only page CSS, layered after the app stylesheet. The selectors out-
 * rank the sheet's Svelte-scoped `.grid` (one extra class) so the responsive
 * and print passes win regardless of how the compiled CSS was concatenated.
 */
const ARTIFACT_CSS = `
/* The sheet at the editor's fixed desktop metrics, centered on the paper ground. */
body { margin: 0; }
main { max-width: ${ARTIFACT_WIDTH}px; margin: 0 auto; padding: ${ARTIFACT_MARGIN}px; }

/* One-column stack in reading order below the single breakpoint (SPEC §9.1).
   The centre box is one stacked cell holding its two sections in order. */
@media (max-width: ${STACK_BREAKPOINT}px) {
	main { padding: 16px; }
	article.quiet-sheet .grid {
		grid-template-columns: 1fr;
		grid-template-areas:
			'purpose' 'classification' 'roles' 'inbound' 'centre'
			'outbound' 'assumptions' 'metrics' 'questions';
	}
}

/* Minimal print pass: clean section breaks — printing is the PDF answer.
   Sections keep together whether they sit in the grid or inside the centre
   box; the box itself prefers to keep its pair on one page. */
@media print {
	main { max-width: none; padding: 0; }
	article.quiet-sheet .grid { display: block; }
	article.quiet-sheet .grid section,
	article.quiet-sheet .centre { break-inside: avoid; }
	article.quiet-sheet .grid > * + * { margin-top: 18px; }
	/* The centre plate is a background wash (SPEC §5); ask print engines to
	   keep it, since browsers drop backgrounds by default. */
	article.quiet-sheet .centre { display: block; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
	article.quiet-sheet .centre > section + section { margin-top: 18px; }
	article.quiet-sheet .tb,
	article.quiet-sheet .foot { break-inside: avoid; }
}
`;

/**
 * A failed asset must fail the whole export — inlining a 404 body as CSS
 * would "succeed" into a broken artifact and wrongly clear Unexported changes.
 */
async function fetchAsset(url: string): Promise<Response> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Artifact asset ${url} fetched ${response.status}`);
	return response;
}

function escapeHtml(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function toBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	// Chunked: String.fromCharCode(...allBytes) blows the argument limit on
	// real font files.
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

/**
 * Rewrite a stylesheet's font references to data URIs. Only WOFF2 ever
 * appears (the fontsource latin-subset imports in app.css are the used
 * weights, nothing else), but match .woff too rather than silently keeping a
 * dead relative URL.
 */
async function inlineFonts(css: string, base: string): Promise<string> {
	// Keyed by the whole url(...) token — replacing bare paths would let one
	// font's path corrupt another's that contains it as a prefix.
	const refs = new Map<string, string>();
	for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]+))\s*\)/g)) {
		const raw = (match[1] ?? match[2] ?? match[3])?.trim();
		if (!raw || !/\.woff2?$/.test(raw) || refs.has(match[0])) continue;
		const url = new URL(raw, base);
		if (url.origin !== location.origin) continue;
		const data = await (await fetchAsset(url.href)).arrayBuffer();
		refs.set(match[0], `url(data:font/woff2;base64,${toBase64(data)})`);
	}
	let inlined = css;
	for (const [token, dataUri] of refs) {
		inlined = inlined.replaceAll(token, dataUri);
	}
	return inlined;
}

/**
 * The app's entire stylesheet as one inline block: every same-origin
 * stylesheet link fetched at export time, plus any injected style tags (the
 * dev server's form of the same CSS), fonts inlined along the way.
 */
async function collectAppCss(): Promise<string> {
	const parts: string[] = [];
	for (const node of document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
		'link[rel="stylesheet"], style'
	)) {
		if (node instanceof HTMLLinkElement) {
			if (new URL(node.href).origin !== location.origin) continue;
			const css = await (await fetchAsset(node.href)).text();
			parts.push(await inlineFonts(css, node.href));
		} else {
			parts.push(await inlineFonts(node.textContent ?? '', document.baseURI));
		}
	}
	return parts.join('\n');
}

export async function buildHtmlArtifact(doc: CanvasDoc): Promise<string> {
	const json = serializeCanvas(doc);
	const mount = mountArtifactSheet(doc);
	let sheet: string;
	try {
		sheet = mount.element.innerHTML;
	} finally {
		mount.dispose();
	}
	const css = await collectAppCss();
	const title = windowTitle(doc.name);

	return `<!doctype html>
<!-- Based on the Bounded Context Canvas by the ddd-crew (${REPO_URL}), licensed CC BY 4.0 (${LICENSE_URL}). -->
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
<style>${ARTIFACT_CSS}</style>
</head>
<body class="paper-ground">
<main>
${sheet}
</main>
${embeddedCanvasBlock(json)}
</body>
</html>
`;
}

export async function exportHtmlArtifact(doc: CanvasDoc): Promise<void> {
	const html = await buildHtmlArtifact(doc);
	downloadBlob(new Blob([html], { type: 'text/html' }), exportFileName(doc.name, 'html'));
}
