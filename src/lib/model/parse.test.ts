import { describe, expect, it } from 'vitest';
import { blankCanvas, stampIds } from '$lib/model/canvas';
import { embeddedCanvasBlock, extractEmbeddedCanvas } from '$lib/model/embed';
import { parseCanvasFile, parseCanvasImport } from '$lib/model/parse';
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
		expect(parseCanvasImport('<!doctype html><html><body>plain page</body></html>')).toEqual({
			ok: false,
			reason: 'not-canvas'
		});
	});

	it('refuses a corrupt embedded block as not a Canvas file', () => {
		const corrupt = artifactAround(embeddedCanvasBlock(exported.slice(0, 40)));
		expect(parseCanvasImport(corrupt)).toEqual({ ok: false, reason: 'not-canvas' });
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
