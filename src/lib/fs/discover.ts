/**
 * Finding the canvases under the root — the server's tools start here, whether
 * they are listing them, offering completions, or checking that a path names
 * one of ours, and so does every `bcc` subcommand that takes no path. Both
 * importable forms count: `.bcc.json` files and the `.bcc.html` artifacts that
 * carry one embedded.
 *
 * Hidden directories — any name starting with a dot — and generated or
 * vendored trees are skipped outright: a canvas someone means to keep never
 * lives in one, and walking them puts every scratch fixture and cache file
 * into the tool whose description says to start there. Symlinks are skipped
 * too — discovery reports what is really under the root, and following a link
 * is how a walk leaves it or loops forever.
 *
 * A directory the process cannot open stops that branch and nothing else. The
 * walk covers a root the walker did not choose — an MCP host may hand the
 * server one far wider than a checkout, and a `bcc` invocation inherits
 * whatever directory it was run from — and somewhere under a wide enough root
 * there is always a directory the OS keeps to itself. Letting one of those
 * throw would lose every canvas the walk had already found, in the one step
 * everything else starts from. They are named rather than swallowed: a listing
 * that quietly covers less than it claims is worse than a short one.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CanvasRoot } from './root';

const SKIPPED = new Set(['node_modules', 'dist', 'build']);

/** The skip rule: dot-directories, plus the generated trees named above. */
function skipped(name: string): boolean {
	return name.startsWith('.') || SKIPPED.has(name);
}

const EXTENSIONS = ['.bcc.json', '.bcc.html'];

export function isCanvasPath(path: string): boolean {
	return EXTENSIONS.some((extension) => path.endsWith(extension));
}

export interface Discovery {
	/** Every canvas under the root, as root-relative paths, in a stable order. */
	paths: string[];
	/**
	 * Directories the walk could not open, root-relative and sorted; the root
	 * itself reads as `.`. Empty on any root the server can see all of.
	 */
	unreadable: string[];
}

export function findCanvases(root: CanvasRoot): Discovery {
	const paths: string[] = [];
	const unreadable: string[] = [];

	function walk(directory: string): void {
		let entries;
		try {
			entries = readdirSync(directory, { withFileTypes: true });
		} catch {
			// Whatever the reason — permissions, a stale mount, a race with a
			// delete — this branch has nothing to say and the rest of the walk is
			// unaffected.
			unreadable.push(root.relative(directory) || '.');
			return;
		}
		for (const entry of entries) {
			if (entry.isSymbolicLink()) continue;
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (!skipped(entry.name)) walk(path);
			} else if (entry.isFile() && isCanvasPath(entry.name)) {
				paths.push(root.relative(path));
			}
		}
	}

	walk(root.path);
	return { paths: paths.sort(), unreadable: unreadable.sort() };
}
