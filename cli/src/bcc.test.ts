/**
 * `bcc`, driven the way anyone else drives it: the committed bundle, spawned in
 * a scratch directory, judged by its stdout, its stderr and its exit code.
 *
 * The bundle rather than the source, for two reasons. It is what a `npx` install
 * runs, so it is the thing that can be broken by a build; and running it in plain
 * Node is what replaces the type-level "this touches no DOM" the CLI's tsconfig
 * gives up in order to reach `$lib/artifact/html.ts` — a stray `document` here
 * throws rather than passing a compile.
 *
 * The pure helpers are unit-tested from source below, where a failure can name
 * the rule it broke instead of an exit code.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { artifactDocument } from '$lib/artifact/html';
import { blankCanvas, CANVAS_VERSION, stampIds } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE, V1_REFERENCE_FILE } from '$lib/model/reference.fixture';
import { canvasBytes, toCanvasFile } from '$lib/model/serialize';
import { parseOptions, UsageError } from './args';
import { declaredHeight, outputPath, reproduce } from './image';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, '..');
const repo = path.resolve(cli, '..');
const BCC = path.join(cli, 'dist/bcc.js');

interface Run {
	stdout: string;
	stderr: string;
	status: number;
}

let root: string;

function bcc(...args: string[]): Run {
	const result = spawnSync(process.execPath, [BCC, ...args], { cwd: root, encoding: 'utf8' });
	return { stdout: result.stdout, stderr: result.stderr, status: result.status ?? -1 };
}

function put(relative: string, text: string): string {
	const target = path.join(root, relative);
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, text);
	return target;
}

function read(relative: string): string {
	return readFileSync(path.join(root, relative), 'utf8');
}

/** The canonical bytes of the reference example — what `fmt` must produce. */
function canonicalReference(): string {
	const parsed = parseCanvasFile(REFERENCE_FILE);
	if (!parsed.ok) throw new Error('reference fixture must parse');
	return canvasBytes(parsed.file);
}

function referenceDoc() {
	const parsed = parseCanvasFile(REFERENCE_FILE);
	if (!parsed.ok) throw new Error('reference fixture must parse');
	return stampIds(parsed.file);
}

beforeEach(() => {
	root = realpathSync(mkdtempSync(path.join(tmpdir(), 'bcc-cli-')));
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('the committed bundle', () => {
	it(
		'is what build.js produces from the CLI and the renderer as they stand today',
		() => {
			// The rebuild order is `render` then `cli`: this bundle inlines the
			// committed renderer module, so a sheet change that stops at
			// `build:render` leaves this stale and a sheet change that skips it
			// leaves `src/lib/render/dist/render.js` stale. Both are caught, each
			// by its own suite, and `npm run build:bundles` runs them in order.
			const scratch = mkdtempSync(path.join(tmpdir(), 'bcc-build-'));
			try {
				const rebuilt = path.join(scratch, 'bcc.js');
				execFileSync(process.execPath, [path.join(cli, 'build.js'), rebuilt], { cwd: repo });
				expect(
					readFileSync(rebuilt).equals(readFileSync(BCC)),
					'cli/dist/bcc.js is stale — run `npm run build:bundles` and commit the result'
				).toBe(true);
			} finally {
				rmSync(scratch, { recursive: true, force: true });
			}
		},
		120_000
	);

	it('runs with nothing beside it but Node, and one optional import', () => {
		// What a foreign `npx --yes github:…` install gets: `cli/dist` and no
		// dependencies at all. playwright-core is the single exception and it is
		// dynamic, so everything except `render --svg`'s measurement works without
		// it — which is why `bcc check` can keep a committed image honest anywhere.
		const bundle = readFileSync(BCC, 'utf8');
		const imports = [...bundle.matchAll(/^import\s.*?from\s*"([^"]+)"/gm)].map((m) => m[1]);
		expect(imports.filter((name) => !name.startsWith('node:'))).toEqual([]);
		const dynamic = [...bundle.matchAll(/\bimport\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);
		expect(dynamic.filter((name) => !name.startsWith('node:'))).toEqual(['playwright-core']);
	});
});

describe('bcc ls', () => {
	it('counts the eleven sections and names the empty ones', () => {
		put('docs/orders.bcc.json', REFERENCE_FILE);
		put('docs/thin.bcc.json', canvasBytes(toCanvasFile({ ...blankCanvas(), name: 'Thin' })));

		const run = bcc('ls');
		expect(run.status).toBe(0);
		expect(run.stdout).toContain('docs/orders.bcc.json');
		expect(run.stdout).toMatch(/docs\/thin\.bcc\.json\s+1\/11\s+Thin/);
		expect(run.stdout).toContain('empty: Purpose,');
	});

	it('reports what it could not read and still exits 0 — ls answers what is here', () => {
		put('broken.bcc.json', '{ not json');
		const run = bcc('ls');
		expect(run.status).toBe(0);
		expect(run.stdout).toContain('1 file is named like a canvas and did not read as one:');
		expect(run.stdout).toContain('broken.bcc.json:');
	});

	it('says where it looked when there is nothing to list', () => {
		const run = bcc('ls');
		expect(run.status).toBe(0);
		expect(run.stdout).toContain(`No canvases under ${root}`);
		expect(run.stdout).toContain('skipping hidden directories, node_modules, dist and build');
	});
});

describe('bcc check', () => {
	it('accepts every committed example and every image beside one', () => {
		// This is the repo's staleness guard for `examples/*.bcc.svg` (ticket
		// 062), and deliberately not a second implementation of one: an image
		// that no longer reproduces from the canvas beside it fails the suite
		// here, through the same comparison anyone else's `bcc check` runs.
		const run = spawnSync(process.execPath, [BCC, 'check', '--root', path.join(repo, 'examples')], {
			cwd: repo,
			encoding: 'utf8'
		});
		expect(run.stderr).toBe('');
		expect(run.status).toBe(0);
		expect(run.stdout).toContain('4 canvases check out.');
		expect(run.stdout).toContain('4 images match the canvas beside them.');
	});

	it('migrates a version-1 file rather than refusing it', () => {
		// The gate is one-sided by design: older is read forward through the
		// ordered migrations, newer is refused before anything looks at it.
		put('old.bcc.json', V1_REFERENCE_FILE);
		expect(bcc('check').status).toBe(0);
		// And `fmt` carries the migration to disk: the canvas comes back at the
		// current version, in the bytes an export would have written.
		expect(bcc('fmt').status).toBe(0);
		expect(read('old.bcc.json')).toContain(`"version": ${CANVAS_VERSION},`);
	});

	it('refuses a newer format version, naming the version it can read', () => {
		put('future.bcc.json', JSON.stringify({ version: CANVAS_VERSION + 1, name: 'Later' }));
		const run = bcc('check');
		expect(run.status).toBe(1);
		expect(run.stderr).toContain('future.bcc.json: written by a newer version of BC Canvas');
		expect(run.stderr).toContain(`version ${CANVAS_VERSION} is the newest that can be read here`);
	});

	it("carries the parser's own detail for a file that is not a canvas", () => {
		put('wrong.bcc.json', JSON.stringify({ ...JSON.parse(REFERENCE_FILE), domainRoles: 7 }));
		const run = bcc('check');
		expect(run.status).toBe(1);
		// SPEC §3.3's path-first sentence with the offending field named — the
		// rule was written for a reader who has to fix the file.
		expect(run.stderr).toMatch(/^wrong\.bcc\.json: .*domainRoles/m);
	});

	it('refuses a path that resolves outside the root', () => {
		const run = bcc('check', '../elsewhere.bcc.json');
		expect(run.status).toBe(1);
		expect(run.stderr).toContain('outside the canvas root');
	});
});

describe("bcc check's image leg", () => {
	beforeEach(() => {
		put('orders.bcc.json', REFERENCE_FILE);
	});

	it('says nothing about a canvas with no image beside it', () => {
		const run = bcc('check');
		expect(run.status).toBe(0);
		expect(run.stdout).not.toContain('image');
	});

	it('reproduces an image at the height it declares and finds it current', () => {
		put('orders.bcc.svg', reproduce(referenceDoc(), 1234));
		const run = bcc('check');
		expect(run.status).toBe(0);
		expect(run.stdout).toContain('1 image matches the canvas beside it.');
	});

	it('compares one image once, whichever forms of the canvas name it', () => {
		// `orders.bcc.json` and the `orders.bcc.html` exported from it point at
		// the same `orders.bcc.svg`, and a count that said two would be wrong
		// about how many images this root has.
		put('orders.bcc.html', artifactDocument(referenceDoc()));
		put('orders.bcc.svg', reproduce(referenceDoc(), 1234));
		const run = bcc('check');
		expect(run.status).toBe(0);
		expect(run.stdout).toContain('2 canvases check out.');
		expect(run.stdout).toContain('1 image matches the canvas beside it.');
	});

	it('finds an image stale when the canvas beside it has moved on', () => {
		put('orders.bcc.svg', reproduce(referenceDoc(), 1234).replace('Order Fulfillment', 'Renamed'));
		const run = bcc('check');
		expect(run.status).toBe(1);
		expect(run.stderr).toContain('orders.bcc.svg: does not match orders.bcc.json as it stands.');
		expect(run.stderr).toContain('bcc render --svg orders.bcc.json');
	});

	it('refuses an image it cannot redraw, rather than calling it stale', () => {
		// Nothing was reproduced, so nothing was shown to differ. Two outcomes
		// wearing one word would tell the reader to redraw a file that may be fine.
		put('orders.bcc.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="1440"></svg>');
		const run = bcc('check');
		expect(run.status).toBe(1);
		expect(run.stderr).toContain('no height on its <svg> element');
		expect(run.stderr).not.toContain('does not match');
	});
});

describe('bcc fmt', () => {
	it('reproduces every committed example byte for byte', () => {
		// The property the editor's round-trip, the artifact embed and the
		// examples pinning test all rest on, asserted from outside the app.
		const run = spawnSync(
			process.execPath,
			[BCC, 'fmt', '--check', '--root', path.join(repo, 'examples')],
			{ cwd: repo, encoding: 'utf8' }
		);
		expect(run.stderr).toBe('');
		expect(run.status).toBe(0);
		expect(run.stdout).toContain('4 canvases are in canonical form.');
	});

	it('rewrites a hand-edited canvas into the bytes an export would write', () => {
		const untidy = JSON.stringify(JSON.parse(REFERENCE_FILE), null, 4);
		put('orders.bcc.json', untidy);

		const run = bcc('fmt');
		expect(run.status).toBe(0);
		expect(run.stdout.trim()).toBe('orders.bcc.json');
		expect(read('orders.bcc.json')).toBe(canonicalReference());
	});

	it('names what would change under --check and writes nothing', () => {
		put('orders.bcc.json', JSON.stringify(JSON.parse(REFERENCE_FILE)));
		const run = bcc('fmt', '--check');
		expect(run.status).toBe(1);
		expect(run.stderr).toContain('orders.bcc.json: not the bytes an export would write.');
		expect(read('orders.bcc.json')).not.toBe(canonicalReference());
	});

	it('says what it passed over when a root holds artifacts and no Canvas files', () => {
		// "Nothing here" and "nothing here is a file this command writes" are
		// different answers, and only one of them is true.
		put('orders.bcc.html', artifactDocument(referenceDoc()));
		const run = bcc('fmt');
		expect(run.status).toBe(0);
		expect(run.stdout).toContain(`No .bcc.json canvases under ${root}`);
		expect(run.stdout).toContain('carries a canvas rather than being one');
	});

	it('leaves an artifact alone on a walk, and says why when one is named', () => {
		put('orders.bcc.json', REFERENCE_FILE);
		put('orders.bcc.html', artifactDocument(referenceDoc()));

		expect(bcc('fmt').status).toBe(0);

		const named = bcc('fmt', 'orders.bcc.html');
		expect(named.status).toBe(1);
		expect(named.stderr).toContain('carries a canvas rather than being one');
	});
});

describe('bcc render', () => {
	it('writes the artifact the editor exports, byte for byte', () => {
		// The map's gate, from the CLI's side: one function called twice, not two
		// outputs a test compares. `artifactDocument` is what the Export menu
		// calls and what this spawns a process to produce.
		put('orders.bcc.json', REFERENCE_FILE);
		const run = bcc('render', 'orders.bcc.json');
		expect(run.status).toBe(0);
		expect(run.stdout.trim()).toBe('orders.bcc.html');
		expect(read('orders.bcc.html')).toBe(artifactDocument(referenceDoc()));
	});

	it('writes an SVG at the height it is given, without a browser anywhere', () => {
		put('orders.bcc.json', REFERENCE_FILE);
		const run = bcc('render', '--svg', '--height', '1234', 'orders.bcc.json');
		expect(run.status).toBe(0);
		expect(read('orders.bcc.svg')).toBe(reproduce(referenceDoc(), 1234));
		// And what it wrote is what `check` will hold it to.
		expect(bcc('check').status).toBe(0);
	});

	it('renders every canvas under the root, and never an artifact onto itself', () => {
		put('a/one.bcc.json', REFERENCE_FILE);
		put('b/two.bcc.json', REFERENCE_FILE);
		put('b/two.bcc.html', artifactDocument(referenceDoc()));

		// HTML rather than SVG: a walk of several canvases has several heights,
		// so `--height` is refused there and measuring would want a browser.
		const run = bcc('render');
		expect(run.status).toBe(0);
		expect(run.stdout.split('\n').filter(Boolean).sort()).toEqual([
			'a/one.bcc.html',
			'b/two.bcc.html'
		]);
		// The artifact already under b/ was passed over, not read and rewritten.
		expect(read('b/two.bcc.html')).toBe(artifactDocument(referenceDoc()));
	});

	it('refuses to render an artifact back over itself', () => {
		put('orders.bcc.html', artifactDocument(referenceDoc()));
		const run = bcc('render', 'orders.bcc.html');
		expect(run.status).toBe(1);
		expect(run.stderr).toContain('would overwrite the file it was read from');
	});

	it('takes --out for one canvas and refuses it for several', () => {
		put('orders.bcc.json', REFERENCE_FILE);
		put('other.bcc.json', REFERENCE_FILE);

		const one = bcc('render', '--out', 'sheet.html', 'orders.bcc.json');
		expect(one.status).toBe(0);
		expect(read('sheet.html')).toBe(artifactDocument(referenceDoc()));

		const several = bcc('render', '--out', 'sheet.html');
		expect(several.status).toBe(2);
		expect(several.stderr).toContain('--out names one file, and 2 canvases are in reach.');
	});
});

describe('the way a command refuses', () => {
	it('exits 2 and prints the command usage, not the program usage', () => {
		const run = bcc('render', '--hieght', '900');
		expect(run.status).toBe(2);
		expect(run.stderr).toContain('no such option: --hieght');
		expect(run.stderr).toContain('usage: bcc render');
	});

	it('exits 2 on a command it does not have', () => {
		const run = bcc('renders');
		expect(run.status).toBe(2);
		expect(run.stderr).toContain('no such command: renders. bcc takes render, check, fmt and ls.');
	});

	it('refuses a root that is not a directory, before walking anything', () => {
		put('orders.bcc.json', REFERENCE_FILE);
		const run = bcc('ls', '--root', 'orders.bcc.json');
		expect(run.status).toBe(2);
		expect(run.stderr).toContain('not a directory');
	});

	it('refuses the filesystem root, which is the one root policy rules out', () => {
		const run = bcc('ls', '--root', '/');
		expect(run.status).toBe(2);
		expect(run.stderr).toContain('listing it would walk the whole disk');
	});

	it('answers --help with the command, and nothing with the program', () => {
		expect(bcc('fmt', '--help').stdout).toContain('usage: bcc fmt');
		expect(bcc().stdout).toContain('usage: bcc <command>');
	});
});

describe('parseOptions', () => {
	const spec = { booleans: ['svg'], values: ['height', 'root'] };

	it('takes both spellings of a value option', () => {
		expect(parseOptions(['--height', '9'], spec).values.get('height')).toBe('9');
		expect(parseOptions(['--height=9'], spec).values.get('height')).toBe('9');
	});

	it('keeps operands in the order they were written, and honours --', () => {
		const parsed = parseOptions(['a', '--svg', 'b', '--', '--not-an-option'], spec);
		expect(parsed.operands).toEqual(['a', 'b', '--not-an-option']);
		expect(parsed.booleans.has('svg')).toBe(true);
	});

	it('names what the command does take when it meets one it does not', () => {
		expect(() => parseOptions(['--verbose'], spec)).toThrow(UsageError);
		expect(() => parseOptions(['--verbose'], spec)).toThrow(/--height, --root, --svg/);
	});

	it('refuses a value option with nothing after it', () => {
		expect(() => parseOptions(['--height'], spec)).toThrow(/--height needs a value/);
	});
});

describe('outputPath and declaredHeight', () => {
	it('swaps the family extension, keeping the stem the canvas is found by', () => {
		// Not `exportFileName`'s slug of the canvas *name*: a committed image has
		// to be findable from the path of the canvas beside it, or the staleness
		// check has nothing to compare (ticket 056 decision 6).
		expect(outputPath('docs/order-fulfillment.bcc.json', 'svg')).toBe(
			'docs/order-fulfillment.bcc.svg'
		);
		expect(outputPath('docs/order-fulfillment.bcc.html', 'svg')).toBe(
			'docs/order-fulfillment.bcc.svg'
		);
		expect(outputPath('orders.bcc.json', 'html')).toBe('orders.bcc.html');
	});

	it('reads the height off the root element, and only off a real one', () => {
		expect(declaredHeight(reproduce(referenceDoc(), 1234))).toBe(1234);
		expect(declaredHeight('<svg width="1440"></svg>')).toBe(null);
		expect(declaredHeight('not an svg at all')).toBe(null);
	});
});
