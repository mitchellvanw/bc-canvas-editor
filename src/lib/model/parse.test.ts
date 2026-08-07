import { describe, expect, it } from 'vitest';
import { blankCanvas, stampIds } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { serializeCanvas } from '$lib/model/serialize';

function referenceJson(mutate: (raw: Record<string, unknown>) => void = () => {}): string {
	const raw = JSON.parse(REFERENCE_FILE) as Record<string, unknown>;
	mutate(raw);
	return JSON.stringify(raw);
}

describe('parseCanvasFile', () => {
	it('accepts the spec reference example', () => {
		const result = parseCanvasFile(REFERENCE_FILE);
		expect(result).toEqual({ ok: true, file: JSON.parse(REFERENCE_FILE) });
	});

	it('round-trips a serialized canvas byte-identically: export → import → export', () => {
		const exported = serializeCanvas(stampIds(JSON.parse(REFERENCE_FILE)));
		const result = parseCanvasFile(exported);
		if (!result.ok) throw new Error('expected ok');
		expect(serializeCanvas(stampIds(result.file))).toBe(exported);
	});

	it('accepts a blank canvas export', () => {
		const result = parseCanvasFile(serializeCanvas(blankCanvas()));
		expect(result.ok).toBe(true);
	});

	it('keeps escape-hatch strings as-is: custom classification and relationship values', () => {
		const text = referenceJson((raw) => {
			raw.strategicClassification = { domain: 'weird custom axis value' };
			(raw.inboundCommunication as { relationship: string }[])[0].relationship = 'my own pattern';
		});
		const result = parseCanvasFile(text);
		if (!result.ok) throw new Error('expected ok');
		expect(result.file.strategicClassification).toEqual({ domain: 'weird custom axis value' });
		expect(result.file.inboundCommunication[0].relationship).toBe('my own pattern');
	});

	it('drops unknown extra keys instead of letting them ride along', () => {
		const text = referenceJson((raw) => {
			raw.generator = 'some other app';
			(raw.domainRoles as Record<string, unknown>[])[0].description = 'stowaway';
		});
		const result = parseCanvasFile(text);
		if (!result.ok) throw new Error('expected ok');
		expect(result.file).not.toHaveProperty('generator');
		expect(result.file.domainRoles[0]).toEqual({ name: 'execution context' });
	});

	it('refuses a newer format version, reporting the file version', () => {
		const text = referenceJson((raw) => (raw.version = 3));
		expect(parseCanvasFile(text)).toEqual({ ok: false, reason: 'newer-version', version: 3 });
	});

	it('refuses version 2 — the app reads up to version 1', () => {
		const text = referenceJson((raw) => (raw.version = 2));
		expect(parseCanvasFile(text)).toEqual({ ok: false, reason: 'newer-version', version: 2 });
	});

	it.each([
		['garbage text', 'not json {'],
		['a JSON string', '"just a string"'],
		['a JSON array', '[1, 2, 3]'],
		['JSON null', 'null'],
		['an empty object (no version)', '{}'],
		['a fractional version', referenceJson((raw) => (raw.version = 1.5))],
		['a string version', referenceJson((raw) => (raw.version = '1'))],
		['version zero', referenceJson((raw) => (raw.version = 0))]
	])('refuses %s as not a Canvas file', (_label, text) => {
		expect(parseCanvasFile(text)).toEqual({ ok: false, reason: 'not-canvas' });
	});

	it.each([
		['a missing section key', (raw: Record<string, unknown>) => delete raw.assumptions],
		['a non-string name', (raw: Record<string, unknown>) => (raw.name = 7)],
		['a non-array section', (raw: Record<string, unknown>) => (raw.domainRoles = 'roles')],
		[
			'a non-object classification',
			(raw: Record<string, unknown>) => (raw.strategicClassification = ['core'])
		],
		[
			'a non-string classification axis',
			(raw: Record<string, unknown>) => (raw.strategicClassification = { domain: 42 })
		],
		['a role without a name', (raw: Record<string, unknown>) => (raw.domainRoles = [{}])],
		[
			'a lane without a collaborator',
			(raw: Record<string, unknown>) => (raw.inboundCommunication = [{ messages: [] }])
		],
		[
			'a lane without messages',
			(raw: Record<string, unknown>) => (raw.outboundCommunication = [{ collaborator: 'X' }])
		],
		[
			'a message type outside the closed enum',
			(raw: Record<string, unknown>) =>
				(raw.inboundCommunication = [
					{ collaborator: 'X', messages: [{ type: 'signal', name: 'Y' }] }
				])
		],
		[
			'a null optional field',
			(raw: Record<string, unknown>) => (raw.businessDecisions = [{ name: 'X', description: null }])
		],
		[
			'a non-string sticky',
			(raw: Record<string, unknown>) => (raw.openQuestions = ['fine', 9])
		],
		[
			'a term row without a term',
			(raw: Record<string, unknown>) => (raw.ubiquitousLanguage = [{ definition: 'X' }])
		]
	])('refuses %s as not a Canvas file', (_label, mutate) => {
		expect(parseCanvasFile(referenceJson(mutate))).toEqual({ ok: false, reason: 'not-canvas' });
	});
});
