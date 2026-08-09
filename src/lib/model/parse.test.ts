import { describe, expect, it } from 'vitest';
import { blankCanvas, stampIds } from '$lib/model/canvas';
import { embeddedCanvasBlock, extractEmbeddedCanvas } from '$lib/model/embed';
import { parseCanvasFile, parseCanvasImport, type ParseResult } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { serializeCanvas } from '$lib/model/serialize';

function referenceJson(mutate: (raw: Record<string, unknown>) => void = () => {}): string {
	const raw = JSON.parse(REFERENCE_FILE) as Record<string, unknown>;
	mutate(raw);
	return JSON.stringify(raw);
}

/**
 * The refusal's second level of disclosure. These strings are a model's only
 * instruction for fixing a file it wrote, so they are pinned as tightly as any
 * UI copy — see `chrome/import-refusal.test.ts` for the first level, the one
 * sentence the app shows regardless of what this says.
 */
function refusalDetail(result: ParseResult): string {
	if (result.ok || result.reason !== 'not-canvas') throw new Error('expected a not-canvas refusal');
	if (result.detail === undefined) throw new Error('expected a refusal detail');
	return result.detail;
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
		expect(result.file.strategicClassification).toEqual({
			domain: 'weird custom axis value'
		});
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
		expect(parseCanvasFile(text)).toEqual({
			ok: false,
			reason: 'newer-version',
			version: 3
		});
	});

	it('refuses version 2 — the app reads up to version 1', () => {
		const text = referenceJson((raw) => (raw.version = 2));
		expect(parseCanvasFile(text)).toEqual({
			ok: false,
			reason: 'newer-version',
			version: 2
		});
	});

	it('refuses text that is not JSON at all, quoting the syntax failure', () => {
		const detail = refusalDetail(parseCanvasFile('not json {'));
		expect(detail).toMatch(/^the file is not valid JSON \(.+\)\.$/);
	});

	// Every table below holds the *clause* the walk produces; the parser puts
	// the full stop on. Readers join a detail with sentences of their own, so a
	// clause that ended bare would run into the next one.
	it('ends every detail in a full stop, without doubling one already there', () => {
		expect(refusalDetail(parseCanvasFile('{}'))).toMatch(/[^.]\.$/);
		expect(refusalDetail(parseCanvasFile('not json {'))).toMatch(/[^.]\.$/);
	});

	it.each([
		['a JSON string', '"just a string"', 'expected a JSON object at the top level, got a string'],
		['a JSON array', '[1, 2, 3]', 'expected a JSON object at the top level, got an array'],
		['JSON null', 'null', 'expected a JSON object at the top level, got null'],
		[
			'an empty object (no version)',
			'{}',
			'version: expected an integer of 1 or more, got nothing'
		],
		[
			'a fractional version',
			referenceJson((raw) => (raw.version = 1.5)),
			'version: expected an integer of 1 or more, got 1.5'
		],
		[
			'a string version',
			referenceJson((raw) => (raw.version = '1')),
			'version: expected an integer of 1 or more, got a string'
		],
		[
			'version zero',
			referenceJson((raw) => (raw.version = 0)),
			'version: expected an integer of 1 or more, got 0'
		]
	])('refuses %s as not a Canvas file', (_label, text, clause) => {
		expect(refusalDetail(parseCanvasFile(text))).toBe(`${clause}.`);
	});

	it.each([
		[
			'a missing section key',
			(raw: Record<string, unknown>) => delete raw.assumptions,
			'assumptions: expected an array, got nothing'
		],
		[
			'a non-string name',
			(raw: Record<string, unknown>) => (raw.name = 7),
			'name: expected a string, got a number'
		],
		[
			'a non-array section',
			(raw: Record<string, unknown>) => (raw.domainRoles = 'roles'),
			'domainRoles: expected an array, got a string'
		],
		[
			'a non-object row',
			(raw: Record<string, unknown>) => (raw.domainRoles = ['execution context']),
			'domainRoles[0]: expected an object, got a string'
		],
		[
			'a non-object classification',
			(raw: Record<string, unknown>) => (raw.strategicClassification = ['core']),
			'strategicClassification: expected an object, got an array'
		],
		[
			'a non-string classification axis',
			(raw: Record<string, unknown>) => (raw.strategicClassification = { domain: 42 }),
			'strategicClassification.domain: expected a string or no key at all, got a number'
		],
		[
			'a role without a name',
			(raw: Record<string, unknown>) => (raw.domainRoles = [{}]),
			'domainRoles[0].name: expected a string, got nothing'
		],
		[
			'a lane without a collaborator',
			(raw: Record<string, unknown>) => (raw.inboundCommunication = [{ messages: [] }]),
			'inboundCommunication[0].collaborator: expected a string, got nothing'
		],
		[
			'a lane without messages',
			(raw: Record<string, unknown>) => (raw.outboundCommunication = [{ collaborator: 'X' }]),
			'outboundCommunication[0].messages: expected an array, got nothing'
		],
		[
			'a message type outside the closed enum',
			(raw: Record<string, unknown>) =>
				(raw.inboundCommunication as Record<string, unknown>[]).push({
					collaborator: 'Support',
					messages: [{ type: 'notification', name: 'Refund asked' }]
				}),
			'inboundCommunication[1].messages[0].type: expected one of "command", "query", "event", got "notification"'
		],
		[
			'a null optional field',
			(raw: Record<string, unknown>) =>
				(raw.businessDecisions = [{ name: 'X', description: null }]),
			'businessDecisions[0].description: expected a string or no key at all, got null'
		],
		[
			'a non-string sticky',
			(raw: Record<string, unknown>) => (raw.openQuestions = ['fine', 9]),
			'openQuestions[1]: expected a string, got a number'
		],
		[
			'a term row without a term',
			(raw: Record<string, unknown>) => (raw.ubiquitousLanguage = [{ definition: 'X' }]),
			'ubiquitousLanguage[0].term: expected a string, got nothing'
		]
	])('refuses %s as not a Canvas file, naming the field', (_label, mutate, clause) => {
		const result = parseCanvasFile(referenceJson(mutate));
		expect(result).toMatchObject({ ok: false, reason: 'not-canvas' });
		expect(refusalDetail(result)).toBe(`${clause}.`);
	});
});

function artifactAround(block: string): string {
	return `<!doctype html>\n<html lang="en"><head><title>T</title></head><body>\n${block}\n</body></html>`;
}

describe('embeddedCanvasBlock / extractEmbeddedCanvas', () => {
	it('extracts the embedded JSON byte-identically to the Canvas-file export (SPEC §9.1)', () => {
		const exported = serializeCanvas(stampIds(JSON.parse(REFERENCE_FILE)));
		const artifact = artifactAround(embeddedCanvasBlock(exported));
		expect(extractEmbeddedCanvas(artifact)).toBe(exported);
	});

	it('survives </script> in canvas content — the serializer keeps < out of the bytes', () => {
		const doc = blankCanvas();
		doc.description = 'Mind the </script> tag.';
		const exported = serializeCanvas(doc);
		expect(extractEmbeddedCanvas(artifactAround(embeddedCanvasBlock(exported)))).toBe(exported);
	});

	it('finds nothing in a document without the block', () => {
		expect(extractEmbeddedCanvas('<!doctype html><html><body>hi</body></html>')).toBeNull();
		expect(extractEmbeddedCanvas(REFERENCE_FILE)).toBeNull();
	});
});

describe('parseCanvasImport — one path for .bcc.json and .bcc.html', () => {
	const exported = serializeCanvas(stampIds(JSON.parse(REFERENCE_FILE)));

	it('accepts a raw Canvas file', () => {
		expect(parseCanvasImport(exported)).toEqual(parseCanvasFile(exported));
	});

	it('accepts an HTML artifact through the same validation', () => {
		const result = parseCanvasImport(artifactAround(embeddedCanvasBlock(exported)));
		if (!result.ok) throw new Error('expected ok');
		expect(serializeCanvas(stampIds(result.file))).toBe(exported);
	});

	it('refuses a newer version inside the embedded block with the version notice', () => {
		const newer = referenceJson((raw) => (raw.version = 4));
		expect(parseCanvasImport(artifactAround(embeddedCanvasBlock(newer)))).toEqual({
			ok: false,
			reason: 'newer-version',
			version: 4
		});
	});

	it('refuses an HTML file with a missing embedded block as not a Canvas file', () => {
		const result = parseCanvasImport('<!doctype html><html><body>plain page</body></html>');
		expect(result).toMatchObject({ ok: false, reason: 'not-canvas' });
		// Both doors were tried, so the detail names both — "not valid JSON"
		// alone would misdiagnose the HTML file this most often is.
		expect(refusalDetail(result)).toBe(
			'expected a Canvas file (JSON) or an HTML artifact carrying an embedded Canvas file; this text is neither.'
		);
	});

	it('refuses a corrupt embedded block as not a Canvas file, reporting the block', () => {
		const corrupt = artifactAround(embeddedCanvasBlock(exported.slice(0, 40)));
		const result = parseCanvasImport(corrupt);
		expect(result).toMatchObject({ ok: false, reason: 'not-canvas' });
		expect(refusalDetail(result)).toMatch(/^the file is not valid JSON \(.+\)\.$/);
	});

	it('reports the shape failure of a JSON text that is no artifact either', () => {
		const detail = refusalDetail(parseCanvasImport(referenceJson((raw) => delete raw.assumptions)));
		expect(detail).toBe('assumptions: expected an array, got nothing.');
	});

	it('imports a foreign Canvas file whose prose contains the embed marker as itself (SPEC §3.2)', () => {
		// Only our serializer escapes <; a hand-authored file may carry the
		// marker raw inside a string value and must not be routed to extraction.
		const marker = '<script type="application/json" data-canvas-file>';
		const foreign = referenceJson((raw) => (raw.description = `About ${marker} blocks.`));
		const result = parseCanvasImport(foreign);
		if (!result.ok) throw new Error('expected ok');
		expect(result.file.description).toBe(`About ${marker} blocks.`);
	});
});
