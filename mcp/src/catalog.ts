/**
 * What is under the root, summarized — and the `bcc://` URIs that name it.
 *
 * Canvases get both doors (decision 10): a templated resource the host can
 * attach, and tools the model can call unprompted. Both need the same answer
 * to "what canvases are there, and what is in them", so both get it from here
 * — a listing built twice would be a listing that disagrees with itself.
 *
 * The scheme is `bcc://` rather than `file://` because what a host attaches is
 * a derived view — a digest, or the Canvas file pulled out of an artifact —
 * not the bytes at that path.
 */

import { UriTemplate } from '@modelcontextprotocol/server';
import { findCanvases } from './discover';
import { readCanvas } from './read';
import type { CanvasRoot } from './root';
import { emptySections, filledCount, SECTIONS } from './sections';

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
	/** How many of the eleven sections say something. */
	filled: number;
	/** The labels of the ones that don't. */
	empty: string[];
}

export interface CanvasProblem {
	path: string;
	uri: string;
	/** Why this file could not be summarized, in one sentence. */
	problem: string;
}

export interface Catalog {
	canvases: CanvasSummary[];
	/** Files that look like canvases and aren't — reported, never dropped. */
	problems: CanvasProblem[];
	/** Directories the walk could not open, so the listing says where it stopped. */
	unreadable: string[];
	/** The eleven section labels, so a caller can read `empty` without guessing. */
	sections: string[];
}

/** Every canvas under the root, summarized, in the stable order discovery gives. */
export function catalog(root: CanvasRoot): Catalog {
	const canvases: CanvasSummary[] = [];
	const problems: CanvasProblem[] = [];
	const found = findCanvases(root);

	for (const path of found.paths) {
		const result = readCanvas(root, path);
		const uri = canvasUri(path);
		if (result.ok) {
			canvases.push({
				path,
				uri,
				name: result.file.name,
				purpose: result.file.purpose,
				filled: filledCount(result.file),
				empty: emptySections(result.file)
			});
		} else if (result.reason === 'newer-version') {
			problems.push({
				path,
				uri,
				problem: `written by a newer version of BC Canvas (format version ${result.version})`
			});
		} else {
			problems.push({ path, uri, problem: result.detail ?? 'not a Canvas file' });
		}
	}

	return {
		canvases,
		problems,
		unreadable: found.unreadable,
		sections: SECTIONS.map((section) => section.label)
	};
}
