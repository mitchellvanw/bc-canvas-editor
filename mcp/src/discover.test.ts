import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	realpathSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findCanvases, isCanvasPath } from './discover';
import { openRoot, type CanvasRoot } from './root';

let root: CanvasRoot;
let base: string;
/** Restored after each test, so the tmpdir stays removable. */
const locked: string[] = [];

function put(relative: string, text = '{}'): void {
	const path = join(base, relative);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, text);
}

/** A directory the walk cannot open — the shape `/Library/…/AssetCache` has. */
function lock(relative: string): void {
	const path = join(base, relative);
	mkdirSync(path, { recursive: true });
	chmodSync(path, 0o000);
	locked.push(path);
}

beforeEach(() => {
	base = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-find-')));
	root = openRoot(base);
});

afterEach(() => {
	for (const path of locked.splice(0)) chmodSync(path, 0o700);
});

describe('findCanvases', () => {
	it('finds both importable forms, at any depth, in a stable order', () => {
		put('orders.bcc.json');
		put('docs/canvases/billing.bcc.json');
		put('docs/shipping.bcc.html', '<html></html>');

		expect(findCanvases(root).paths).toEqual([
			'docs/canvases/billing.bcc.json',
			'docs/shipping.bcc.html',
			'orders.bcc.json'
		]);
	});

	it('ignores files that are not canvases', () => {
		put('package.json');
		put('notes.md', '#');
		put('orders.json');
		put('orders.bcc.json');

		expect(findCanvases(root).paths).toEqual(['orders.bcc.json']);
	});

	it('skips generated and vendored trees', () => {
		put('node_modules/pkg/fixture.bcc.json');
		put('.git/stash.bcc.json');
		put('dist/orders.bcc.json');
		put('build/orders.bcc.json');
		put('.svelte-kit/orders.bcc.json');
		put('examples/orders.bcc.json');

		expect(findCanvases(root).paths).toEqual(['examples/orders.bcc.json']);
	});

	it('does not follow symlinks out of the root', () => {
		const away = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-away-')));
		writeFileSync(join(away, 'secret.bcc.json'), '{}');
		symlinkSync(away, join(base, 'door'));
		symlinkSync(join(away, 'secret.bcc.json'), join(base, 'linked.bcc.json'));
		put('orders.bcc.json');

		expect(findCanvases(root).paths).toEqual(['orders.bcc.json']);
	});

	it('finds nothing in an empty root without complaining', () => {
		expect(findCanvases(root).paths).toEqual([]);
		expect(findCanvases(root).unreadable).toEqual([]);
	});

	it('walks past a directory it cannot open, and names it', () => {
		put('orders.bcc.json');
		put('docs/billing.bcc.json');
		lock('vault');

		const found = findCanvases(root);
		expect(found.paths).toEqual(['docs/billing.bcc.json', 'orders.bcc.json']);
		expect(found.unreadable).toEqual(['vault']);
	});

	it('reports the root itself when it is the unreadable one', () => {
		lock('.');

		const found = findCanvases(root);
		expect(found.paths).toEqual([]);
		expect(found.unreadable).toEqual(['.']);
	});
});

describe('isCanvasPath', () => {
	it('recognizes the two importable forms and nothing else', () => {
		expect(isCanvasPath('a/orders.bcc.json')).toBe(true);
		expect(isCanvasPath('orders.bcc.html')).toBe(true);
		expect(isCanvasPath('orders.json')).toBe(false);
		expect(isCanvasPath('bcc.json')).toBe(false);
	});
});
