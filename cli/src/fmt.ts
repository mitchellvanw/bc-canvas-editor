/**
 * `bcc fmt` — a canvas rewritten in the bytes the editor would have written.
 *
 * It is `canvasBytes` and nothing else: SPEC §3.2's deterministic serialization
 * plus §3.5's trailing newline. A hand-edited canvas normalises to exactly what
 * an export produces, which is what keeps a committed canvas readable in a diff
 * and what makes the round-trip property testable at all.
 *
 * A read runs the file through the parser first, so `fmt` also migrates: a v1
 * canvas comes back canonical at the current version. That is the parser's own
 * behaviour and not a second opinion about the file.
 *
 * `.bcc.html` is not rewritten. The artifact is a rendering with a canvas
 * embedded in it, and canonical bytes are a fact about the `.bcc.json` form —
 * a walk passes them over, and naming one says so rather than doing something
 * surprising to a file the editor wrote.
 */

import { readCanvas, readProblem } from '$lib/fs/read';
import type { CanvasRoot } from '$lib/fs/root';
import { writeAtomic } from '$lib/fs/write';
import { canvasBytes } from '$lib/model/serialize';
import { isArtifact } from './targets';

export interface FmtReport {
	/** Canvases already in canonical form. */
	unchanged: number;
	/** Root-relative paths rewritten, or that `--check` found would be. */
	changed: string[];
	problems: string[];
}

export interface FmtOptions {
	/** Report what would change and write nothing. Non-zero exit for CI. */
	readonly dryRun: boolean;
	/** Whether the paths came off a walk, which passes artifacts over silently. */
	readonly walked: boolean;
}

export function fmt(
	root: CanvasRoot,
	paths: readonly string[],
	options: FmtOptions
): FmtReport {
	const report: FmtReport = { unchanged: 0, changed: [], problems: [] };

	for (const input of paths) {
		if (isArtifact(input)) {
			if (options.walked) continue;
			report.problems.push(
				`${input}: an HTML artifact carries a canvas rather than being one, and fmt writes ` +
					`Canvas files. Name the .bcc.json it was exported from.`
			);
			continue;
		}

		const result = readCanvas(root, input);
		if (!result.ok) {
			report.problems.push(readProblem(result));
			continue;
		}

		const canonical = canvasBytes(result.file);
		if (canonical === result.text) {
			report.unchanged++;
			continue;
		}

		report.changed.push(result.path);
		if (!options.dryRun) writeAtomic(root.resolve(result.path), canonical);
	}

	return report;
}
