/**
 * HTML artifact (SPEC §9.1): one self-contained `.bcc.html` that opens
 * anywhere — offline — as the pixel-identical quiet sheet, carrying all three
 * Views. It draws the sheet through the headless renderer (wayfinder ticket
 * 050) — the same function `bcc render` calls, so the two cannot drift —
 * renders the Markdown through the one digest renderer, and embeds the Canvas
 * file byte-identically for re-import. Clearing Unexported changes on success
 * is the caller's move: the flag must survive a failed build.
 *
 * The fourth container, in other words, and the reason it lives here rather
 * than in `$lib/render/`: the View panels, their CSS and the print pass that
 * governs them are already this file's, and none of them belong to a fence.
 * The sheet, the tokens and the fonts all come from the renderer, which is
 * what retired the export's same-origin `fetch` (SPEC §13's noted risk) along
 * with `collectAppCss`, `inlineFonts` and `fetchAsset`.
 *
 * The markup, the View CSS and the enhancement script live here together
 * rather than in an `artifact/views.ts`: one file already owns "what bytes the
 * artifact is", and splitting the panels from the print pass that governs them
 * would put two halves of one decision two files apart.
 */

import type { CanvasDoc } from '$lib/model/canvas';
// The labels only. The editor's tablist *behaviour* never crosses into an
// artifact (§9) — the script below is written fresh, in plain ES5, because it
// ships as text. What must not drift is what the three Views are called.
import { VIEWS } from '$lib/editor/views';
import { canvasDigest } from '$lib/model/digest';
import { embeddedCanvasBlock } from '$lib/model/embed';
import { exportFileName } from '$lib/model/filename';
import { serializeCanvas, toCanvasFile } from '$lib/model/serialize';
import { windowTitle } from '$lib/model/title';
import { fontFaceCss, renderSheetParts, SCOPE_CLASS } from '$lib/render';
import { SHEET_MARGIN, SHEET_WIDTH } from '$lib/render/metrics';
import { downloadBlob } from './download';

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
main { max-width: ${SHEET_WIDTH}px; margin: 0 auto; padding: ${SHEET_MARGIN}px; }

/* The renderer's wrapper paints the paper ground so that a fence carries its
   own; in a document the body already paints it, and a second painting would
   restart the 32px drafting grid at the wrapper's origin — a visible seam
   around the Sheet panel. */
.views__panel .${SCOPE_CLASS} { background: none; }

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

/* --- The three Views (SPEC §9.1) ---------------------------------------
   All three panels are in the document and visible; the script at the end of
   the body hides two of them and turns the strip into a tablist. Every rule
   here is written so that *doing nothing* leaves a readable file: the strip
   ships hidden, the panels ship shown, and each panel keeps a heading until
   the tab strip is live to carry that word instead. */
/* The strip is its own box with no wrapper, and it carries its own bottom gap:
   a bar around it would keep that gap when the strip inside went hidden and
   stand as an empty band above the sheet (the prototype's, exactly). Nothing
   to leak if there is nothing to leak from. The inline-flex is what the
   absent wrapper was for — the strip is as wide as its three tabs, not the
   page. */
/* Filled sheet at rest, which is where the artifact parts company with the
   editor (SPEC §5). The editor's strip rests *unfilled* to soften its
   resemblance to the chrome band above it; an artifact has no chrome band, so
   that softening buys nothing here and costs something real — on bare paper
   the 32px drafting grid runs straight through the control and its lines
   compete with the segment dividers. Filled, the strip is one object, the
   grid stops at its edge, and the ink segment reads as one of three peers. */
.views__strip[hidden] { display: none; }
.views__strip {
	display: inline-flex;
	margin-bottom: 14px;
	overflow: hidden;
	border: 1px solid var(--color-line);
	border-radius: 4px;
	background: var(--color-sheet);
}
.views__tab {
	padding: 0.35rem 0.95rem;
	border: 0;
	border-left: 1px solid var(--color-line);
	background: none;
	color: var(--color-ink-soft);
	font-family: var(--font-sans);
	font-size: 0.8rem;
	font-weight: 500;
	cursor: pointer;
}
.views__tab:first-child { border-left: 0; }
/* Resting on sheet, hover darkens to paper — the chrome button's own
   direction, which is only available here because there is no chrome. */
.views__tab:hover { background: var(--color-paper); color: var(--color-ink); }
.views__tab[aria-selected='true'] {
	background: var(--color-ink);
	color: var(--color-sheet);
	font-weight: 600;
}
/* Inset, and inverted on the filled segment: roving tabindex means the
   selected tab is the only one that can hold focus, so an ink ring on ink
   would be the only ring anyone ever saw (SPEC §5). */
.views__tab:focus-visible { outline: 2px solid var(--color-ink); outline-offset: -2px; }
.views__tab[aria-selected='true']:focus-visible { outline-color: var(--color-sheet); }

/* The script-less wayfinder: which of the three stacked panels this is. A
   paragraph and not a heading — §8.6 promises canvas name h1 / sections h2 /
   collaborators h3, and a real heading above the Sheet's own h1 would invert
   that. The stacked panels are regions instead, so they are still navigable. */
.views__heading {
	margin: 1.8rem 0 0.6rem;
	color: var(--color-ink-soft);
	font-family: var(--font-sans);
	font-size: 0.72rem;
	font-weight: 600;
	letter-spacing: 0.11em;
	text-transform: uppercase;
}
.views__panel:first-of-type .views__heading { margin-top: 0; }
/* The inactive panels are hidden by a class the artifact owns, and pointedly
   not by the hidden attribute. The app stylesheet inlined above is Tailwind's,
   whose preflight hides [hidden] with an !important inside @layer base — and
   cascade layers reverse for important declarations, so an unlayered
   !important of ours would lose to it however specific. The print pass has to
   raise the Sheet panel back up whichever tab is live; against a plain class
   it simply outranks it by specificity, and nothing in the file needs
   !important at all. Found by printing from the JSON tab, which produced a
   blank page — wayfinder/tickets/048-views-checkpoint.md. */
.views__panel--off { display: none; }
.views--enhanced .views__heading { display: none; }

/* The two text Views: the same sheet panel the canvas is drawn on, grown to
   hold text. No height cap — the editor capped its panes so Copy and Apply
   stayed reachable, and an artifact has no buttons to keep in reach. Wrapped
   rather than scrolled, including the JSON: nothing here is edited, so a long
   line is something to read, and a pane that scrolls sideways at 200% zoom is
   the horizontal scroll §8.6 rules out. */
.views__source {
	margin: 0;
	padding: 1.35rem 1.5rem;
	border: 1px solid var(--color-line);
	border-radius: 5px;
	background: var(--color-sheet);
	box-shadow: 0 1px 2px rgb(26 30 32 / 0.04);
	color: var(--color-ink);
	font-family: var(--font-mono);
	font-size: 0.8rem;
	line-height: 1.65;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

/* Minimal print pass: clean section breaks — printing is the PDF answer.
   Sections keep together whether they sit in the grid or inside the centre
   box; the box itself prefers to keep its pair on one page. */
@media print {
	main { max-width: none; padding: 0; }
	/* Print is the Sheet, whichever View the viewer happens to be looking at —
	   a printed JSON dump is nobody's PDF (SPEC §9.1). The id outranks the
	   off-class the script writes, which is the whole reason that class exists
	   rather than the hidden attribute: see .views__panel--off above. */
	.views__strip, .views__heading { display: none; }
	#view-panel-sheet { display: block; }
	#view-panel-json, #view-panel-markdown { display: none; }
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
 * The artifact's one piece of behavioural JavaScript, and progressive
 * enhancement in the strict sense: it runs on markup that is already complete
 * and already readable, and everything it does is subtractive — hide two
 * panels, hide the headings that named them, and put the tablist semantics
 * (SPEC §8.3's roving tabindex, arrows select) on a strip that until now was
 * inert. With script off nothing here runs and the file falls back to all
 * three Views stacked in reading order.
 *
 * Written as ES5 in a string, deliberately unshared with the editor's
 * `tablistKeydown`: an artifact must run from a `file://` URL in whatever
 * browser it lands in, forever, with no build step behind it.
 */
const VIEWS_SCRIPT = `<script>
(function () {
	var root = document.querySelector('[data-canvas-views]');
	if (!root) return;
	var strip = root.querySelector('[role="tablist"]');
	var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
	var panels = [].slice.call(root.querySelectorAll('.views__panel'));
	if (!strip || !tabs.length || tabs.length !== panels.length) return;

	for (var i = 0; i < panels.length; i++) {
		// Tab semantics are the script's to add: a tabpanel with no live
		// tablist above it would be a promise the script-less file can't keep.
		panels[i].setAttribute('role', 'tabpanel');
		panels[i].setAttribute('aria-labelledby', tabs[i].id);
		panels[i].removeAttribute('aria-label');
		panels[i].tabIndex = 0;
	}

	function select(index) {
		for (var i = 0; i < tabs.length; i++) {
			tabs[i].setAttribute('aria-selected', i === index ? 'true' : 'false');
			tabs[i].tabIndex = i === index ? 0 : -1;
			// A class, not the hidden attribute — the print pass has to raise
			// the Sheet back up from here, and preflight's layered important
			// [hidden] rule cannot be outranked from an unlayered sheet.
			if (i === index) panels[i].classList.remove('views__panel--off');
			else panels[i].classList.add('views__panel--off');
		}
	}

	function move(index) {
		select(index);
		tabs[index].focus();
	}

	for (var t = 0; t < tabs.length; t++) {
		(function (index) {
			tabs[index].addEventListener('click', function () { select(index); });
			tabs[index].addEventListener('keydown', function (event) {
				var next = -1;
				if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
				if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
				if (event.key === 'Home') next = 0;
				if (event.key === 'End') next = tabs.length - 1;
				if (next < 0) return;
				event.preventDefault();
				move(next);
			});
		})(t);
	}

	root.className += ' views--enhanced';
	select(0);
	// Last, not first: the strip is only allowed to look live once it is. If
	// anything above threw, the file is still the honest stack.
	strip.removeAttribute('hidden');
})();
</script>`;

/**
 * The three Views as static markup (SPEC §9.1). Every panel is present and
 * visible; none of them is a fallback that was tested once. The strip ships
 * `hidden` — and its wrapper is inside the hidden element's own bar, so a
 * script-less file grows no empty band where a control isn't.
 */
function viewPanels(sheet: string, json: string, markdown: string): string {
	const tabs = VIEWS.map(
		(view, index) =>
			`<button type="button" class="views__tab" role="tab" id="view-tab-${view.key}"` +
			` aria-controls="view-panel-${view.key}" aria-selected="${index === 0}"` +
			` tabindex="${index === 0 ? 0 : -1}">${view.label}</button>`
	).join('');
	const [sheetLabel, jsonLabel, markdownLabel] = VIEWS.map((view) => view.label);

	// `aria-label` on a plain section is a region landmark, so the script-less
	// stack is navigable; the script trades it for `aria-labelledby` on the tab.
	const panel = (key: string, label: string, body: string) =>
		`<section class="views__panel" id="view-panel-${key}" aria-label="${label}">
<p class="views__heading">${label}</p>
${body}
</section>`;

	return `<div class="views__strip" role="tablist" aria-label="Views" hidden>${tabs}</div>
${panel('sheet', sheetLabel, sheet)}
${panel('json', jsonLabel, `<pre class="views__source">${escapeHtml(json)}</pre>`)}
${panel('markdown', markdownLabel, `<pre class="views__source">${escapeHtml(markdown)}</pre>`)}`;
}

function escapeHtml(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * The `.bcc.html` container: the renderer's sheet, its two text panels, and
 * everything the file needs to open with nothing else on the machine. Nothing
 * here reaches the network or the DOM, which is why it is no longer async.
 */
export function artifactDocument(doc: CanvasDoc): string {
	const json = serializeCanvas(doc);
	const { markup, css } = renderSheetParts(doc);
	const title = windowTitle(doc.name);
	// The JSON panel is the embedded block's own bytes, and the Markdown is the
	// one renderer's — the same function the Markdown View shows, the `.bcc.md`
	// export writes and `bcc_read_canvas` returns. No renderer ships into the
	// file; both panels are rendered here, once, at export time.
	const markdown = canvasDigest(toCanvasFile(doc));

	return `<!doctype html>
<!-- Based on the Bounded Context Canvas by the ddd-crew (${REPO_URL}), licensed CC BY 4.0 (${LICENSE_URL}). -->
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${fontFaceCss()}</style>
<style>
${css}
</style>
<style>${ARTIFACT_CSS}</style>
</head>
<body class="${SCOPE_CLASS}">
<main data-canvas-views>
${viewPanels(markup, json, markdown)}
</main>
${embeddedCanvasBlock(json)}
${VIEWS_SCRIPT}
</body>
</html>
`;
}

export function exportHtmlArtifact(doc: CanvasDoc): void {
	const blob = new Blob([artifactDocument(doc)], { type: 'text/html' });
	downloadBlob(blob, exportFileName(doc.name, 'html'));
}
