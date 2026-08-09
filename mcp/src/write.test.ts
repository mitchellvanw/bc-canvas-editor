import { mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseCanvasFile } from '$lib/model/parse';
import { canvasBytes, writeAtomic } from './write';

const EXAMPLE = fileURLToPath(new URL('../../examples/order-fulfillment.bcc.json', import.meta.url));

let base: string;

beforeEach(() => {
	base = realpathSync(mkdtempSync(join(tmpdir(), 'bcc-write-')));
});

describe('canvasBytes', () => {
	it('reproduces a committed example byte for byte', () => {
		const committed = readFileSync(EXAMPLE, 'utf8');
		const parsed = parseCanvasFile(committed);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) return;

		expect(canvasBytes(parsed.file)).toBe(committed);
	});

	it('ends with exactly one newline', () => {
		const parsed = parseCanvasFile(readFileSync(EXAMPLE, 'utf8'));
		if (!parsed.ok) throw new Error('the example should parse');

		expect(canvasBytes(parsed.file).endsWith('}\n')).toBe(true);
	});
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
