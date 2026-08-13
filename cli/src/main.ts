/**
 * `bcc` — the canvases in a project, from the command line.
 *
 * Four subcommands, and the pairing is the point: `check` and `fmt` are what
 * make a canvas behave like source code rather than an attachment, `ls` says
 * what is there, and `render` writes the files a markdown file points at.
 *
 * Nothing here holds an opinion the app does not already hold. The parser is
 * the editor's, the canonical bytes are the export's, the walk is the MCP
 * server's, and the sheet is the one committed renderer module every surface
 * draws through. This file is the terminal's share of that: options, ordering,
 * sentences and an exit code.
 *
 * Three exits, kept apart because a script reads them: **0** nothing to report,
 * **1** something did not check out, **2** the command itself was not usable.
 * Results go to stdout one path per line so they pipe; refusals go to stderr.
 */

import { openRoot, whyUnservable, type CanvasRoot } from '$lib/fs/root';
import { parseOptions, UsageError } from './args';
import { check } from './check';
import { fmt } from './fmt';
import { ls } from './ls';
import { NoBrowser } from './measure';
import { render } from './render';
import { canvasFiles, targets, type Targets } from './targets';

const USAGE = `bcc — the Bounded Context Canvas files in a project.

usage: bcc <command> [options] [<canvas>...]

  render   draw a canvas as an HTML artifact, or as an SVG image
  check    read every canvas through the parser the editor imports with
  fmt      rewrite canvases in their canonical bytes
  ls       list the canvases under the root

Every command takes --root <directory>: where bcc looks, and the furthest it
goes. It defaults to the working directory.

bcc <command> --help says what one command takes.`;

const COMMAND_USAGE: Record<string, string> = {
	render: `usage: bcc render [--svg] [--height <pixels>] [--out <file>] [<canvas>...]

Writes <canvas>.bcc.html beside each canvas, or <canvas>.bcc.svg with --svg.
With no canvas named, every .bcc.json under the root.

  --svg               an SVG image instead of the HTML artifact
  --height <pixels>   the SVG's height, rather than measuring it in Chrome
  --out <file>        write here instead of beside the canvas; one canvas only
  --root <directory>  where canvases live (default: the working directory)`,

	check: `usage: bcc check [--root <directory>] [<canvas>...]

Reads each canvas through the parser the editor's Import… uses, so a canvas
that passes here opens there. Any .bcc.svg beside a canvas is redrawn at the
height it declares and compared byte for byte; a canvas with no image beside it
is not a finding. With no canvas named, everything under the root.

Exits 1 if anything does not check out.`,

	fmt: `usage: bcc fmt [--check] [--root <directory>] [<canvas>...]

Rewrites each .bcc.json in the bytes an export would have written — the same
key order, the same indent, the same trailing newline. With no canvas named,
every one under the root.

  --check   name what would change, write nothing, and exit 1`,

	ls: `usage: bcc ls [--root <directory>]

Every canvas under the root, with how many of its eleven sections say something
and which ones do not.`
};

function out(line: string): void {
	process.stdout.write(`${line}\n`);
}

function problem(line: string): void {
	process.stderr.write(`${line}\n`);
}

/** A command that cannot be run as typed. Never a retry; it takes different words. */
function unusable(message: string, usage: string): never {
	problem(message);
	problem('');
	problem(usage);
	process.exit(2);
}

function plural(count: number, one: string, many: string): string {
	return `${count} ${count === 1 ? one : many}`;
}

function openRequestedRoot(requested: string, usage: string): CanvasRoot {
	let root: CanvasRoot;
	try {
		root = openRoot(requested);
	} catch (error) {
		const why = error instanceof Error ? error.message : String(error);
		unusable(`--root ${requested}: ${why}`, usage);
	}
	const unservable = whyUnservable(root.path);
	if (unservable !== null) unusable(unservable, usage);
	return root;
}

function positiveInteger(value: string, option: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new UsageError(`${option} takes a whole number of pixels, not ${value}.`);
	}
	return parsed;
}

async function run(command: string, argv: readonly string[], usage: string): Promise<number> {
	const spec = {
		render: { booleans: ['svg', 'help'], values: ['height', 'out', 'root'] },
		check: { booleans: ['help'], values: ['root'] },
		fmt: { booleans: ['check', 'help'], values: ['root'] },
		ls: { booleans: ['help'], values: ['root'] }
	}[command];
	if (spec === undefined) {
		unusable(`no such command: ${command}. bcc takes render, check, fmt and ls.`, USAGE);
	}

	const options = parseOptions(argv, spec);
	if (options.booleans.has('help')) {
		out(usage);
		return 0;
	}

	const root = openRequestedRoot(options.values.get('root') ?? process.cwd(), usage);

	if (command === 'ls') {
		if (options.operands.length > 0) {
			throw new UsageError('ls takes no canvas — it lists them all. Did you mean bcc check?');
		}
		return ls(root, out);
	}

	const found = targets(root, options.operands);
	for (const directory of found.unreadable) {
		problem(`${directory}: could not be opened, so nothing under it was looked at.`);
	}

	if (command === 'check') {
		if (found.paths.length === 0) return nothingFound(root, found, 0);
		const report = check(root, found.paths);
		for (const line of report.problems) problem(line);
		if (report.canvases > 0) out(`${plural(report.canvases, 'canvas', 'canvases')} check out.`);
		if (report.images > 0) {
			const beside = report.images === 1 ? 'it' : 'them';
			out(`${plural(report.images, 'image matches', 'images match')} the canvas beside ${beside}.`);
		}
		return report.problems.length === 0 ? 0 : 1;
	}

	if (command === 'fmt') {
		const paths = found.walked ? canvasFiles(found.paths) : found.paths;
		if (paths.length === 0) return nothingFound(root, found, found.paths.length);
		const dryRun = options.booleans.has('check');
		const report = fmt(root, paths, { dryRun, walked: found.walked });
		for (const line of report.problems) problem(line);
		for (const path of report.changed) {
			if (dryRun) problem(`${path}: not the bytes an export would write.`);
			else out(path);
		}
		if (report.changed.length === 0 && report.problems.length === 0) {
			out(`${plural(report.unchanged, 'canvas is', 'canvases are')} in canonical form.`);
		} else if (dryRun && report.changed.length > 0) {
			problem(`Rewrite ${report.changed.length === 1 ? 'it' : 'them'} with bcc fmt.`);
		}
		return report.problems.length > 0 || (dryRun && report.changed.length > 0) ? 1 : 0;
	}

	// render
	const kind = options.booleans.has('svg') ? 'svg' : 'html';
	const height = options.values.has('height')
		? positiveInteger(options.values.get('height')!, '--height')
		: undefined;
	if (height !== undefined && kind === 'html') {
		throw new UsageError('--height sizes an SVG viewport, and the HTML artifact has none.');
	}

	const paths = found.walked ? canvasFiles(found.paths) : found.paths;
	if (paths.length === 0) return nothingFound(root, found, found.paths.length);
	if (paths.length > 1 && options.values.has('out')) {
		throw new UsageError(`--out names one file, and ${paths.length} canvases are in reach.`);
	}
	if (paths.length > 1 && height !== undefined) {
		throw new UsageError(
			`--height is one canvas's height, and ${paths.length} canvases are in reach. ` +
				'Render them one at a time, or leave it out and let Chrome measure each.'
		);
	}

	const report = await render(root, paths, { kind, height, out: options.values.get('out') });
	for (const line of report.problems) problem(line);
	for (const path of report.written) out(path);
	return report.problems.length === 0 ? 0 : 1;
}

/**
 * Nothing to work on, said in terms of what the command was looking for.
 * `artifacts` is what the walk did find and the command passed over, which is
 * the difference between "there is nothing here" and "nothing here is a file
 * this command writes".
 */
function nothingFound(root: CanvasRoot, found: Targets, artifacts: number): number {
	if (!found.walked) return 0;
	if (artifacts > 0) {
		out(`No .bcc.json canvases under ${root.path}.`);
		out(
			artifacts === 1
				? 'The one file here named like a canvas is an HTML artifact, ' +
					'which carries a canvas rather than being one.'
				: `The ${artifacts} files here named like canvases are HTML artifacts, ` +
					'which carry a canvas rather than being one.'
		);
		return 0;
	}
	out(`No canvases under ${root.path}.`);
	out(
		'bcc looks for .bcc.json and .bcc.html files, skipping hidden directories, ' +
			'node_modules, dist and build.'
	);
	return 0;
}

const [command = '', ...rest] = process.argv.slice(2);

if (command === '' || command === '--help' || command === 'help') {
	out(USAGE);
	process.exit(0);
}

const usage = COMMAND_USAGE[command] ?? USAGE;
try {
	process.exitCode = await run(command, rest, usage);
} catch (error) {
	if (error instanceof UsageError) unusable(error.message, usage);
	if (error instanceof NoBrowser) {
		problem(error.message);
		process.exit(1);
	}
	throw error;
}
