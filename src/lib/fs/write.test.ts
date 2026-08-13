import { mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { writeAtomic } from './write';

let base: string;

beforeEach(() => {
	base = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-write-')));
});

describe('writeAtomic', () => {
	it('creates a file and leaves no temp behind', () => {
		const path = join(base, 'orders.bcc.json');
		writeAtomic(path, 'first\n');

		expect(readFileSync(path, 'utf8')).toBe('first\n');
		expect(readdirSync(base)).toEqual(['orders.bcc.json']);
	});

	it('replaces an existing file whole', () => {
		const path = join(base, 'orders.bcc.json');
		writeFileSync(path, 'old bytes that are longer than the new ones\n');
		writeAtomic(path, 'new\n');

		expect(readFileSync(path, 'utf8')).toBe('new\n');
		expect(readdirSync(base)).toEqual(['orders.bcc.json']);
	});

	it('leaves the original in place and no temp behind when the write fails', () => {
		const path = join(base, 'missing-directory', 'orders.bcc.json');
		expect(() => writeAtomic(path, 'never\n')).toThrow();
		expect(readdirSync(base)).toEqual([]);
	});
});
