/**
 * Which canvases a command acts on.
 *
 * Named paths win; with none, the command covers everything under the root.
 * That is the same rule for `check`, `fmt` and the SVG leg, so it lives in one
 * place — and it is why a root exists at all outside the server (ticket 051
 * decision 8): `findCanvases` has to know where to stop walking.
 *
 * Named paths are passed through untouched rather than resolved here.
 * `readCanvas` is where a path meets the filesystem, and it already answers
 * every way that can go wrong — outside the root, absent, not a canvas — in one
 * closed set. Resolving twice would mean two opinions about the same path.
 */

import { findCanvases, isCanvasPath } from '$lib/fs/discover';
import type { CanvasRoot } from '$lib/fs/root';

export interface Targets {
	/** Root-relative when walked, exactly as typed when named. */
	readonly paths: readonly string[];
	/** Directories the walk could not open. Empty whenever paths were named. */
	readonly unreadable: readonly string[];
	/** Whether these came off a walk rather than off the command line. */
	readonly walked: boolean;
}

export function targets(root: CanvasRoot, operands: readonly string[]): Targets {
	if (operands.length > 0) return { paths: operands, unreadable: [], walked: false };
	const found = findCanvases(root);
	return { paths: found.paths, unreadable: found.unreadable, walked: true };
}

/** The `.bcc.json` half of a set of targets — `fmt` writes canonical bytes only. */
export function canvasFiles(paths: readonly string[]): string[] {
	return paths.filter((path) => path.endsWith('.bcc.json'));
}

/** True for the artifact form, which several commands have to treat separately. */
export function isArtifact(path: string): boolean {
	return isCanvasPath(path) && !path.endsWith('.bcc.json');
}
