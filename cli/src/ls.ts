/**
 * `bcc ls` — the catalog, in a terminal.
 *
 * The same walk and the same skip list the MCP server lists from, and the same
 * count of how many of the eleven sections say something: a canvas that shows
 * up here shows up there, because neither has a listing of its own.
 *
 * It reports and never judges. A file named like a canvas that will not parse
 * is named at the end rather than dropped, and a directory the walk could not
 * open is named too — but the exit code stays 0, because `ls` answers "what is
 * here" and `check` answers "is it good". A listing that failed would be a
 * check with no way to see the rest of the listing.
 */

import { readCanvas, readProblem } from '$lib/fs/read';
import type { CanvasRoot } from '$lib/fs/root';
import { emptySections, filledCount, SECTIONS } from '$lib/model/sections';
import { findCanvases } from '$lib/fs/discover';

interface Row {
	path: string;
	name: string;
	/** The canvas's own purpose line — what it says it is for. */
	purpose: string;
	filled: number;
	empty: string[];
}

function plural(count: number, one: string, many: string): string {
	return `${count} ${count === 1 ? one : many}`;
}

export function ls(root: CanvasRoot, out: (line: string) => void): number {
	const found = findCanvases(root);
	const rows: Row[] = [];
	const problems: string[] = [];

	for (const path of found.paths) {
		const result = readCanvas(root, path);
		if (result.ok) {
			rows.push({
				path,
				name: result.file.name === '' ? 'Untitled' : result.file.name,
				purpose: result.file.purpose,
				filled: filledCount(result.file),
				empty: emptySections(result.file)
			});
		} else {
			problems.push(readProblem(result));
		}
	}

	if (rows.length === 0 && problems.length === 0) {
		out(`No canvases under ${root.path}.`);
		out(
			'bcc looks for .bcc.json and .bcc.html files, skipping hidden directories, ' +
				'node_modules, dist and build.'
		);
	}

	const width = Math.max(0, ...rows.map((row) => row.path.length));
	const total = SECTIONS.length;
	for (const row of rows) {
		const filled = `${row.filled}/${total}`.padStart(`${total}/${total}`.length);
		const indent = `${' '.repeat(width)}  ${' '.repeat(filled.length)}  `;
		out(`${row.path.padEnd(width)}  ${filled}  ${row.name}`);
		// A name says which canvas; the purpose says which one you want. Reading a
		// neighbouring context is how you learn what this one is not responsible
		// for, and choosing that neighbour off a list of names alone is guessing.
		if (row.purpose !== '') out(`${indent}${row.purpose}`);
		// The count says how full; this says where the holes are, which is what
		// anyone reading a listing of canvases is actually looking for.
		if (row.empty.length > 0) out(`${indent}empty: ${row.empty.join(', ')}`);
	}

	if (problems.length > 0) {
		out('');
		out(
			problems.length === 1
				? '1 file is named like a canvas and did not read as one:'
				: `${problems.length} files are named like canvases and did not read as one:`
		);
		for (const problem of problems) out(`  ${problem}`);
	}

	if (found.unreadable.length > 0) {
		out('');
		out(
			`${plural(found.unreadable.length, 'directory', 'directories')} could not be opened, ` +
				`so nothing under ${found.unreadable.length === 1 ? 'it is' : 'them is'} listed: ` +
				found.unreadable.join(', ')
		);
	}

	return 0;
}
