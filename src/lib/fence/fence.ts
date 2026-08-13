/**
 * The `bcc` fence, once, for every adapter that hosts one.
 *
 * ```
 * ```bcc
 * examples/order-fulfillment.bcc.json
 * ```
 * ```
 *
 * Wayfinder ticket 052 fixed the contract and its reason for existing in one
 * line: every rule a fence invents on top of `readCanvas` is a rule that has to
 * be implemented identically in two adapters and eventually will not be. So the
 * grammar, the resolution, the placeholder and the preamble live here, and an
 * adapter is left with only what is genuinely its own — which node type to
 * emit, and where its warnings go.
 *
 * Nothing here knows about remark, markdown-it, VFiles or output channels.
 * `renderFence` takes strings and gives back strings: the HTML that replaces
 * the fence, the CSS the adapter hoists, and the sentence for whatever warning
 * channel it has. Failure is never silence and never an exception — a fence
 * that cannot draw returns a placeholder that says why, because a reader who
 * finds a gap where a diagram should be learns nothing from it.
 */

import { relative, resolve } from 'node:path';
import { readCanvas, readProblem } from '$lib/fs/read';
import type { CanvasRoot } from '$lib/fs/root';
import { stampIds } from '$lib/model/canvas';
import { fontFaceCss, renderSheetParts } from '$lib/render';

/** The info string, exactly. Claimed by neither Linguist nor highlight.js. */
export const FENCE_LANG = 'bcc';

/**
 * Where a fence is: the document it sits in, and the root the pointer it holds
 * may not leave. The two travel together because neither is any use alone — a
 * root with no document has nothing to resolve, and a document with no root has
 * nowhere to stop — and pairing them is what keeps an adapter from having to
 * invent one to satisfy the other.
 */
export interface FenceLocation {
	/** Where the walk stops, and what paths are named against in messages. */
	root: CanvasRoot;
	/** The absolute path of the markdown file holding this fence. */
	document: string;
}

export interface FenceRequest {
	/**
	 * Where this fence is, or null when the adapter is rendering a string with
	 * no location — VS Code's `markdown.api.render`, an untitled buffer, a
	 * unified pipeline handed a bare string. A pointer has nothing to resolve
	 * against then, which is a refusal rather than a guess at the working
	 * directory.
	 */
	location: FenceLocation | null;
	/** The whole info string — `bcc` and any tail the author typed after it. */
	info: string;
	/** The fence body, as written. */
	body: string;
}

export interface FenceResult {
	/** What replaces the fence: the sheet, or a placeholder. Never empty. */
	html: string;
	/**
	 * The sheet's scoped CSS, for the adapter to emit once per document. Null
	 * when nothing drew, because a placeholder needs no preamble.
	 */
	css: string | null;
	/** The sentence for the adapter's warning channel. Null when it drew. */
	problem: string | null;
	/**
	 * The Canvas file this fence points at, absolute — reported whether or not
	 * it could be read, and null only when the pointer never got that far
	 * (a grammar refusal, a fence with no location).
	 *
	 * An adapter that re-renders needs to know what a fence depends on, and it
	 * cannot work that out without re-implementing the grammar this module
	 * exists to hold. The failing case is reported for the same reason: a fence
	 * naming a file that is not there yet should heal when it appears.
	 */
	path: string | null;
}

/**
 * The fonts and the sheet's CSS, for the adapter to place once per document
 * ahead of the first fence (ticket 052 decision 9).
 *
 * The fonts are ~200 KB of base64 and must be inline — an SVG drawn through
 * `<img>` and a VS Code webview both refuse an external load — so three
 * self-contained fences in one document would be 600 KB. The scoped CSS is
 * hoisted with them because it is byte-identical whatever canvas is drawn,
 * which `fence.test.ts` pins rather than assumes. What stays on each fence is
 * the token block on its own wrapper, which is what keeps a fence from
 * repainting the page around it (ticket 050 decision 5).
 */
export function fencePreamble(css: string): string {
	return `<style>${fontFaceCss()}</style>\n<style>\n${css}\n</style>`;
}

function escapeHtml(text: string): string {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * The one output that renders when everything else has failed — so it depends
 * on nothing, least of all the preamble that may be exactly what failed. Plain
 * markup, styles inline, no class names, no fonts. It is the paper the sheet
 * would have been drawn on, which is as much of the register as survives
 * without a stylesheet.
 *
 * The lead is this project's; the sentence below it is the one every surface
 * shows. `detail` is not here — it names bytes in another file, and on a built
 * site it would publish the author's absolute paths to strangers.
 *
 * Exported because an adapter occasionally has a problem of its own to show —
 * VS Code's, a workspace folder that will not open as a root — and a second
 * shape of failure invented at a call site is the drift this module exists to
 * prevent.
 */
export function fencePlaceholder(problem: string): string {
	return (
		`<div style="border: 1px solid #d8d2c4; border-radius: 6px; padding: 0.75rem 1rem; ` +
		`background: #faf7f0; color: #33312c; font-family: ui-sans-serif, system-ui, sans-serif; ` +
		`font-size: 0.9375rem; line-height: 1.5;">` +
		`<strong>This bcc fence didn&#39;t render.</strong><br />` +
		// Everything a host might paint a bare `<code>` with is turned off rather
		// than inherited: VS Code's webview gives one a dark chip and a grey
		// foreground, which on this cream card reads as a second, broken thing
		// rather than as the path. Measured in the preview, and the same defence
		// as the rest of this element — it depends on nothing.
		`<code style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875em; ` +
		`background: none; color: inherit; padding: 0; border-radius: 0;">` +
		`${escapeHtml(problem)}</code></div>`
	);
}

function refuse(problem: string): FenceResult {
	return { html: fencePlaceholder(problem), css: null, problem, path: null };
}

/**
 * The pointer a fence holds, or why it holds nothing usable.
 *
 * Two refusals with no `CanvasRead` behind them, both of them grammar. A tail
 * after `bcc` is refused rather than ignored so the grammar stays genuinely
 * open later — nothing will have been accepted with the wrong meaning in the
 * meantime — and a body that is not one line is the same rule from the other
 * side: one fence, one path, no JSON.
 */
function pointerIn(info: string, body: string): { ok: true; pointer: string } | FenceResult {
	const written = info.trim();
	if (written !== FENCE_LANG) {
		return refuse(`bcc takes no options; this fence's info string reads "${written}".`);
	}

	const lines = body
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (lines.length !== 1) {
		return refuse('A bcc fence holds one path to a Canvas file and nothing else.');
	}

	const pointer = lines[0];
	// Refused as syntax rather than left to containment: a leading `/` reads as
	// repo-root-relative to anyone who has used a static site generator and as a
	// filesystem absolute to `readFileSync`, and one syntax carrying two
	// meanings is how two adapters come to disagree unnoticed for a year.
	if (pointer.startsWith('/')) {
		return refuse(
			`${pointer}: a bcc fence path is relative to the markdown file that holds it, ` +
				`and a leading "/" is not read here as the repo root.`
		);
	}

	return { ok: true, pointer };
}

/**
 * One fence, drawn or refused.
 *
 * The resolution step writes no logic of its own: `readCanvas` is already
 * containment-then-read-then-parse over a closed set of refusals, and
 * `readProblem` is already the path-first sentence in the register a fence
 * wants. The pointer is turned root-relative before it goes in, so every
 * sentence that comes back names the path the way the repo does rather than
 * the way this machine does.
 */
export function renderFence(request: FenceRequest): FenceResult {
	const parsed = pointerIn(request.info, request.body);
	if (!('ok' in parsed)) return parsed;
	const { pointer } = parsed;

	if (request.location === null) {
		return refuse(
			`${pointer}: no document to resolve against; ` +
				`a bcc fence needs the location of the file that holds it.`
		);
	}

	const { root, document } = request.location;
	const absolute = resolve(document, '..', pointer);
	const result = readCanvas(root, relative(root.path, absolute));
	if (!result.ok) {
		return {
			html: fencePlaceholder(readProblem(result, { detail: false })),
			css: null,
			// The warning channel is a developer's, and the whole sentence is for
			// them: which field the parser tripped on, what the filesystem said.
			problem: readProblem(result),
			path: absolute
		};
	}

	const { markup, css } = renderSheetParts(stampIds(result.file));
	return { html: markup, css, problem: null, path: absolute };
}
