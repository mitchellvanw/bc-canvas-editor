import { describe, expect, it } from 'vitest';
import { blankCanvas, stampIds } from '$lib/model/canvas';
import { embeddedCanvasBlock, extractEmbeddedCanvas } from '$lib/model/embed';
import { parseCanvasFile, parseCanvasImport, type ParseResult } from '$lib/model/parse';
import { REFERENCE_FILE, V1_REFERENCE_FILE } from '$lib/model/reference.fixture';
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
			(raw.inboundCommunication as { relationship: unknown }[])[0].relationship = {
				theirs: 'my own pattern',
				ours: 'another of mine'
			};
		});
		const result = parseCanvasFile(text);
		if (!result.ok) throw new Error('expected ok');
		expect(result.file.strategicClassification).toEqual({
			domain: 'weird custom axis value'
		});
		expect(result.file.inboundCommunication[0].relationship).toEqual({
			theirs: 'my own pattern',
			ours: 'another of mine'
		});
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
		const text = referenceJson((raw) => (raw.version = 4));
		expect(parseCanvasFile(text)).toEqual({
			ok: false,
			reason: 'newer-version',
			version: 4
		});
	});

	it('refuses version 3 — the app reads up to version 2', () => {
		const text = referenceJson((raw) => (raw.version = 3));
		expect(parseCanvasFile(text)).toEqual({
			ok: false,
			reason: 'newer-version',
			version: 3
		});
	});

	it('refuses text that is not JSON at all, quoting the syntax failure', () => {
		const detail = refusalDetail(parseCanvasFile('not json {'));
		expect(detail).toMatch(/^expected valid JSON \(.+\)\.$/);
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
			'inboundCommunication[0].collaborator: expected an object, got nothing'
		],
		[
			'a collaborator without a name',
			(raw: Record<string, unknown>) => (raw.inboundCommunication = [{ collaborator: {}, messages: [] }]),
			'inboundCommunication[0].collaborator.name: expected a string, got nothing'
		],
		[
			'a collaborator kind outside the closed enum',
			(raw: Record<string, unknown>) =>
				(raw.inboundCommunication = [
					{ collaborator: { name: 'Checkout', kind: 'microservice' }, messages: [] }
				]),
			'inboundCommunication[0].collaborator.kind: expected one of "bounded-context", "external-system", "frontend", "user" or no key at all, got "microservice"'
		],
		[
			'a non-string collaborator kind',
			(raw: Record<string, unknown>) =>
				(raw.inboundCommunication = [{ collaborator: { name: 'Checkout', kind: 7 }, messages: [] }]),
			'inboundCommunication[0].collaborator.kind: expected a string or no key at all, got a number'
		],
		[
			'a v1-style relationship string on a v2 lane',
			(raw: Record<string, unknown>) =>
				(raw.outboundCommunication = [
					{ collaborator: { name: 'X' }, relationship: 'conformist', messages: [] }
				]),
			'outboundCommunication[0].relationship: expected an object or no key at all, got a string'
		],
		[
			'a non-string relationship end',
			(raw: Record<string, unknown>) =>
				(raw.outboundCommunication = [
					{ collaborator: { name: 'X' }, relationship: { theirs: 4 }, messages: [] }
				]),
			'outboundCommunication[0].relationship.theirs: expected a string or no key at all, got a number'
		],
		[
			'a lane without messages',
			(raw: Record<string, unknown>) =>
				(raw.outboundCommunication = [{ collaborator: { name: 'X' } }]),
			'outboundCommunication[0].messages: expected an array, got nothing'
		],
		[
			'a message type outside the closed enum',
			(raw: Record<string, unknown>) =>
				(raw.inboundCommunication as Record<string, unknown>[]).push({
					collaborator: { name: 'Support' },
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

describe('the v1 → v2 migration', () => {
	function v1Json(mutate: (raw: Record<string, unknown>) => void = () => {}): string {
		const raw = JSON.parse(V1_REFERENCE_FILE) as Record<string, unknown>;
		mutate(raw);
		return JSON.stringify(raw);
	}

	it('loads a v1 file as v2: description becomes purpose, the lane fields take their v2 shapes', () => {
		const result = parseCanvasFile(V1_REFERENCE_FILE);
		if (!result.ok) throw new Error('expected ok');
		expect(result.file.version).toBe(2);
		expect(result.file.purpose).toBe(
			'Coordinates picking, packing and shipping once an order is paid.'
		);
		expect(result.file).not.toHaveProperty('description');
		expect(result.file.inboundCommunication[0].collaborator).toEqual({ name: 'Checkout' });
		expect(result.file.outboundCommunication[0].collaborator).toEqual({ name: 'Notifications' });
	});

	it('reports the version it came from, so a caller can say a migration happened', () => {
		const migrated = parseCanvasFile(V1_REFERENCE_FILE);
		expect(migrated).toMatchObject({ ok: true, migratedFrom: 1 });
		// The JSON View announces this (SPEC §10) because the bytes in the box
		// change under the user; a file already at the current version has
		// nothing to say, so the key is absent rather than equal to the version.
		const current = parseCanvasFile(REFERENCE_FILE);
		if (!current.ok) throw new Error('expected ok');
		expect(current).not.toHaveProperty('migratedFrom');
	});

	it('puts a v1 relationship string on ours, uniformly, and invents no theirs', () => {
		const result = parseCanvasFile(V1_REFERENCE_FILE);
		if (!result.ok) throw new Error('expected ok');
		expect(result.file.inboundCommunication[0].relationship).toEqual({
			ours: 'customer-supplier'
		});
		expect(result.file.outboundCommunication[0].relationship).toBeUndefined();
	});

	it('is indistinguishable from a file authored at v2: migrate → export matches the v2 authoring', () => {
		const migrated = parseCanvasFile(V1_REFERENCE_FILE);
		if (!migrated.ok) throw new Error('expected ok');
		const authored = parseCanvasFile(
			JSON.stringify({
				...(JSON.parse(V1_REFERENCE_FILE) as Record<string, unknown>),
				version: 2,
				description: undefined,
				purpose: 'Coordinates picking, packing and shipping once an order is paid.',
				inboundCommunication: [
					{
						collaborator: { name: 'Checkout' },
						relationship: { ours: 'customer-supplier' },
						messages: [
							{ type: 'command', name: 'Place Order' },
							{ type: 'event', name: 'Payment Confirmed', description: 'Triggers fulfillment.' }
						]
					}
				],
				outboundCommunication: [
					{
						collaborator: { name: 'Notifications' },
						messages: [{ type: 'event', name: 'Order Shipped' }]
					}
				]
			})
		);
		if (!authored.ok) throw new Error('expected ok');
		expect(serializeCanvas(stampIds(migrated.file))).toBe(serializeCanvas(stampIds(authored.file)));
	});

	it('never rewrites free text: an off-vocabulary domain role survives exactly as typed', () => {
		const result = parseCanvasFile(V1_REFERENCE_FILE);
		if (!result.ok) throw new Error('expected ok');
		// `octopus coordinator` stopped matching the picker vocabulary; the
		// migration is not entitled to an opinion about the user's prose.
		expect(result.file.domainRoles[1]).toEqual({ name: 'octopus coordinator' });
	});

	it('round-trips a migrated file byte-identically once it is v2: import → export → import → export', () => {
		const result = parseCanvasFile(V1_REFERENCE_FILE);
		if (!result.ok) throw new Error('expected ok');
		const exported = serializeCanvas(stampIds(result.file));
		const again = parseCanvasFile(exported);
		if (!again.ok) throw new Error('expected ok');
		expect(serializeCanvas(stampIds(again.file))).toBe(exported);
	});

	it('still refuses a malformed v1 file, naming the field in v2 terms', () => {
		const result = parseCanvasFile(v1Json((raw) => (raw.description = 7)));
		expect(result).toMatchObject({ ok: false, reason: 'not-canvas' });
		expect(refusalDetail(result)).toBe('purpose: expected a string, got a number.');
	});

	it('passes a non-v1-shaped lane field through for the v2 walk to refuse by name', () => {
		const result = parseCanvasFile(
			v1Json((raw) => (raw.inboundCommunication = [{ collaborator: 7, messages: [] }]))
		);
		expect(result).toMatchObject({ ok: false, reason: 'not-canvas' });
		expect(refusalDetail(result)).toBe(
			'inboundCommunication[0].collaborator: expected an object, got a number.'
		);
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
		doc.purpose = 'Mind the </script> tag.';
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
		// Both doors were tried, so the detail names both — "expected valid JSON"
		// alone would misdiagnose the HTML file this most often is.
		expect(refusalDetail(result)).toBe(
			'expected a Canvas file (JSON) or an HTML artifact carrying an embedded Canvas file; this text is neither.'
		);
	});

	it('refuses a corrupt embedded block as not a Canvas file, reporting the block', () => {
		const corrupt = artifactAround(embeddedCanvasBlock(exported.slice(0, 40)));
		const result = parseCanvasImport(corrupt);
		expect(result).toMatchObject({ ok: false, reason: 'not-canvas' });
		expect(refusalDetail(result)).toMatch(/^expected valid JSON \(.+\)\.$/);
	});

	it('reports the shape failure of a JSON text that is no artifact either', () => {
		const detail = refusalDetail(parseCanvasImport(referenceJson((raw) => delete raw.assumptions)));
		expect(detail).toBe('assumptions: expected an array, got nothing.');
	});

	it('imports a foreign Canvas file whose prose contains the embed marker as itself (SPEC §3.2)', () => {
		// Only our serializer escapes <; a hand-authored file may carry the
		// marker raw inside a string value and must not be routed to extraction.
		const marker = '<script type="application/json" data-canvas-file>';
		const foreign = referenceJson((raw) => (raw.purpose = `About ${marker} blocks.`));
		const result = parseCanvasImport(foreign);
		if (!result.ok) throw new Error('expected ok');
		expect(result.file.purpose).toBe(`About ${marker} blocks.`);
	});
});
