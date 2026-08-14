/**
 * What is under the root, summarized — and the `bcc://` URIs that name it.
 *
 * This is what makes a canvas attachable. The template is registered with a
 * `list` callback, so `resources/list` answers with concrete URIs — one per
 * canvas — rather than the template alone, which is the difference between a
 * host that can offer canvases in an `@` picker and one that cannot (ticket
 * 059, measured against the committed bundle). The same summaries drive the
 * template's path completion.
 *
 * The scheme is `bcc://` rather than `file://` because what a host attaches is
 * a derived view — a digest, or the Canvas file pulled out of an artifact —
 * not the bytes at that path.
 */

import { UriTemplate } from '@modelcontextprotocol/server';
import { findCanvases } from '$lib/fs/discover';
import { readCanvas } from '$lib/fs/read';
import type { CanvasRoot } from '$lib/fs/root';

/**
 * Reserved expansion (`{+path}`) rather than plain `{path}`: canvases live in
 * directories — `docs/contexts/shipping.bcc.json` — and simple expansion would
 * percent-encode every separator, leaving URIs no human can read and no host
 * can match back.
 */
export const CANVAS_URI_TEMPLATE = 'bcc://canvas/{+path}';

const TEMPLATE = new UriTemplate(CANVAS_URI_TEMPLATE);

export function canvasUri(path: string): string {
	return TEMPLATE.expand({ path });
}

/** The root-relative path a `bcc://canvas/…` URI names, or null if it isn't one. */
export function pathFromUri(uri: string): string | null {
	const matched = TEMPLATE.match(uri);
	const path = matched?.path;
	if (typeof path !== 'string' || path === '') return null;
	try {
		return decodeURIComponent(path);
	} catch {
		// A stray `%` in a filename is legal on disk and illegal in a percent
		// escape; the path is then already what it says it is.
		return path;
	}
}

export interface CanvasSummary {
	/** Root-relative, `/`-separated. */
	path: string;
	uri: string;
	name: string;
	/** The canvas's own purpose line — the summary's one sentence of content. */
	purpose: string;
}

/**
 * Every canvas under the root that can be attached, in the stable order
 * discovery gives.
 *
 * A file named like a canvas that will not parse is left out rather than
 * listed. That is a change of job, not a regression: this used to feed a tool
 * whose whole point was reporting what is here, and it now feeds a picker
 * whose entries are things a person is about to attach — an entry that errors
 * on attach is worse than an absence. Naming the unreadable ones is `bcc ls`'s
 * work now, and it does it (ticket 059).
 */
export function catalog(root: CanvasRoot): { canvases: CanvasSummary[] } {
	const canvases: CanvasSummary[] = [];

	for (const path of findCanvases(root).paths) {
		const result = readCanvas(root, path);
		if (!result.ok) continue;
		canvases.push({
			path,
			uri: canvasUri(path),
			name: result.file.name,
			purpose: result.file.purpose
		});
	}

	return { canvases };
}
