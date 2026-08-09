/**
 * Containment is the security seam of the package, so it is tested the way an
 * attacker would probe it: traversal, absolute paths, and symlinks — the case
 * a string check on `..` misses entirely.
 */

import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { OutsideRoot, openRoot, whyUnservable, type CanvasRoot } from './root';

let root: CanvasRoot;
let outside: string;

beforeEach(() => {
	// macOS puts the temp dir behind /private, so the fixture is realpath'd
	// before anything compares paths to it.
	const base = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-root-')));
	mkdirSync(join(base, 'canvases', 'nested'), { recursive: true });
	mkdirSync(join(base, 'elsewhere'));
	writeFileSync(join(base, 'canvases', 'orders.bcc.json'), '{}');
	writeFileSync(join(base, 'elsewhere', 'secrets.txt'), 'shh');
	root = openRoot(join(base, 'canvases'));
	outside = join(base, 'elsewhere');
});

describe('openRoot', () => {
	it('refuses a root that does not exist', () => {
		expect(() => openRoot(join(outside, 'nope'))).toThrow(/no such directory/);
	});

	it('refuses a root that is a file', () => {
		expect(() => openRoot(join(outside, 'secrets.txt'))).toThrow(/no such directory|not a directory/);
	});

	it('resolves the root itself, symlinks and all', () => {
		expect(root.path).toBe(realpathSync(root.path));
		expect(resolve(root.path)).toBe(root.path);
	});
});

describe('resolve', () => {
	it('accepts a relative path inside the root', () => {
		expect(root.resolve('orders.bcc.json')).toBe(join(root.path, 'orders.bcc.json'));
		expect(root.resolve('nested/deep.bcc.json')).toBe(join(root.path, 'nested', 'deep.bcc.json'));
	});

	it('accepts a path that does not exist yet, and one whose directory does not either', () => {
		expect(root.resolve('new.bcc.json')).toBe(join(root.path, 'new.bcc.json'));
		expect(root.resolve('made/up/new.bcc.json')).toBe(join(root.path, 'made', 'up', 'new.bcc.json'));
	});

	it('accepts an absolute path that lands inside the root', () => {
		expect(root.resolve(join(root.path, 'orders.bcc.json'))).toBe(
			join(root.path, 'orders.bcc.json')
		);
	});

	it('accepts .. that stays inside', () => {
		expect(root.resolve('nested/../orders.bcc.json')).toBe(join(root.path, 'orders.bcc.json'));
	});

	it('refuses traversal out of the root', () => {
		expect(() => root.resolve('../elsewhere/secrets.txt')).toThrow(OutsideRoot);
		expect(() => root.resolve('nested/../../elsewhere/secrets.txt')).toThrow(OutsideRoot);
	});

	it('refuses an absolute path outside the root', () => {
		expect(() => root.resolve(join(outside, 'secrets.txt'))).toThrow(OutsideRoot);
		expect(() => root.resolve('/etc/passwd')).toThrow(OutsideRoot);
	});

	it('refuses a symlinked file that points out of the root', () => {
		symlinkSync(join(outside, 'secrets.txt'), join(root.path, 'leak.bcc.json'));
		expect(() => root.resolve('leak.bcc.json')).toThrow(OutsideRoot);
	});

	it('refuses a path that reaches out through a symlinked directory', () => {
		symlinkSync(outside, join(root.path, 'door'));
		expect(() => root.resolve('door/secrets.txt')).toThrow(OutsideRoot);
		// Including one that does not exist yet — a write must not open the door.
		expect(() => root.resolve('door/new.bcc.json')).toThrow(OutsideRoot);
	});

	it('says which path was refused and where the root is', () => {
		expect(() => root.resolve('../elsewhere/secrets.txt')).toThrow(
			`../elsewhere/secrets.txt: outside the canvas root. Paths are relative to ${root.path}, and the server will not follow one out of it.`
		);
	});
});

describe('relative', () => {
	it('names a path the way a tool would, always with forward slashes', () => {
		expect(root.relative(join(root.path, 'nested', 'deep.bcc.json'))).toBe('nested/deep.bcc.json');
	});

	it('refuses to name a path outside the root', () => {
		expect(() => root.relative(join(outside, 'secrets.txt'))).toThrow(OutsideRoot);
	});
});

/**
 * The one root that already ends in a separator, so `root + sep` is `//` and
 * every containment check silently inverts. `main.ts` refuses to serve it, but
 * containment is the security seam and it must not depend on that: a rule that
 * is wrong for one root is a rule nobody can reason about.
 */
describe('the filesystem root', () => {
	const slash = openRoot('/');

	it('holds everything, rather than nothing', () => {
		expect(slash.resolve('/etc')).toBe(realpathSync('/etc'));
		expect(slash.resolve('etc')).toBe(realpathSync('/etc'));
	});

	it('names a path below it without eating the first character', () => {
		expect(slash.relative('/etc/hosts')).toBe('etc/hosts');
		expect(slash.relative('/etc')).toBe('etc');
	});

	it('is refused at launch anyway, saying what to pass instead', () => {
		const why = whyUnservable('/');
		expect(why).toContain('is the filesystem root, not a project');
		expect(why).toContain('--root <directory>');
	});

	it('is the only root refused', () => {
		expect(whyUnservable(root.path)).toBeNull();
		expect(whyUnservable(outside)).toBeNull();
	});
});
