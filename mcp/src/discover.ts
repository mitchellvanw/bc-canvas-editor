/**
 * Finding the canvases under the root — every tool starts here, whether it is
 * listing them, offering completions, or checking that a path names one of
 * ours. Both importable forms count: `.bcc.json` files and the `.bcc.html`
 * artifacts that carry one embedded.
 *
 * Directories that hold generated or vendored trees are skipped outright: a
 * canvas committed to the repo never lives in one, and walking them turns a
 * listing into a crawl. Symlinks are skipped too — discovery reports what is
 * really under the root, and following a link is how a walk leaves it or loops
 * forever.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { CanvasRoot } from './root';

const SKIPPED = new Set(['node_modules', '.git', 'dist', 'build', '.svelte-kit']);

const EXTENSIONS = ['.bcc.json', '.bcc.html'];

export function isCanvasPath(path: string): boolean {
	return EXTENSIONS.some((extension) => path.endsWith(extension));
}

/** Every canvas under the root, as root-relative paths, in a stable order. */
export function findCanvases(root: CanvasRoot): string[] {
	const found: string[] = [];

	function walk(directory: string): void {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (entry.isSymbolicLink()) continue;
			const path = join(directory, entry.name);
			if (entry.isDirectory()) {
				if (!SKIPPED.has(entry.name)) walk(path);
			} else if (entry.isFile() && isCanvasPath(entry.name)) {
				found.push(root.relative(path));
			}
		}
	}

	walk(root.path);
	return found.sort();
}
