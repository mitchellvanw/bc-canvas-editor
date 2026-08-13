import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { blankCanvas, stampIds, type CanvasFile } from '$lib/model/canvas';
import { parseCanvasFile } from '$lib/model/parse';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { canvasBytes, serializeCanvas, serializeCanvasFile } from '$lib/model/serialize';

// The committed example is the only thing that can prove the on-disk bytes:
// the fixture is a string in the repo, and the trailing newline is exactly the
// difference between the two.
const EXAMPLE = fileURLToPath(
	new URL('../../../examples/order-fulfillment.bcc.json', import.meta.url)
);

function referenceFile(): CanvasFile {
	return JSON.parse(REFERENCE_FILE) as CanvasFile;
}

describe('serializeCanvas', () => {
	it('round-trips the spec reference example with ids stripped and fixed key order', () => {
		const doc = stampIds(referenceFile());
		expect(JSON.parse(serializeCanvas(doc))).toEqual(referenceFile());
		expect(serializeCanvas(doc)).not.toContain('"id"');
	});

	it('is deterministic: same content serializes byte-identically regardless of runtime key order', () => {
		const doc = stampIds(referenceFile());
		const shuffled = Object.fromEntries(Object.entries(doc).reverse()) as typeof doc;
		expect(serializeCanvas(shuffled)).toBe(serializeCanvas(doc));
		expect(Object.keys(JSON.parse(serializeCanvas(shuffled)))).toEqual(
			Object.keys(referenceFile())
		);
	});

	it('serializes a blank canvas with all eleven section keys present and empty', () => {
		expect(serializeCanvas(blankCanvas())).toBe(
			JSON.stringify(
				{
					version: 2,
					name: '',
					purpose: '',
					strategicClassification: {},
					domainRoles: [],
					inboundCommunication: [],
					ubiquitousLanguage: [],
					businessDecisions: [],
					outboundCommunication: [],
					assumptions: [],
					verificationMetrics: [],
					openQuestions: []
				},
				null,
				2
			)
		);
	});

	it('escapes < as \\u003c so the exact export bytes embed in an HTML script block (SPEC §9.1)', () => {
		const doc = blankCanvas();
		doc.purpose = 'Renders </script> tags & other markup, e.g. a < b.';

		const out = serializeCanvas(doc);
		expect(out).not.toContain('<');
		expect(out).toContain('\\u003c/script>');
		expect(JSON.parse(out).purpose).toBe('Renders </script> tags & other markup, e.g. a < b.');
	});

	it('omits optional fields that are unset or emptied, never writes null', () => {
		const doc = blankCanvas();
		doc.strategicClassification = { domain: 'core', businessModel: undefined };
		doc.businessDecisions = [{ id: 'x', name: 'Rule', description: '' }];
		doc.inboundCommunication = [{ id: 'y', collaborator: { name: 'Checkout' }, messages: [] }];

		const out = serializeCanvas(doc);
		const parsed = JSON.parse(out);
		expect(parsed.strategicClassification).toEqual({ domain: 'core' });
		expect(parsed.businessDecisions[0]).toEqual({ name: 'Rule' });
		expect(parsed.inboundCommunication[0]).toEqual({
			collaborator: { name: 'Checkout' },
			messages: []
		});
		expect(out).not.toContain('null');
	});

	it('writes theirs before ours whatever order the document holds them in', () => {
		const doc = blankCanvas();
		doc.inboundCommunication = [
			{
				id: 'y',
				collaborator: { name: 'Checkout' },
				// Runtime insertion order: ours first — the file order is fixed.
				relationship: { ours: 'conformist', theirs: 'open-host-service' },
				messages: []
			}
		];
		const out = serializeCanvas(doc);
		expect(Object.keys(JSON.parse(out).inboundCommunication[0].relationship)).toEqual([
			'theirs',
			'ours'
		]);
	});

	it('omits a relationship with neither end, and an unset kind, entirely', () => {
		const doc = blankCanvas();
		doc.inboundCommunication = [
			{
				id: 'y',
				collaborator: { name: 'Checkout', kind: undefined },
				relationship: { theirs: '', ours: undefined },
				messages: []
			}
		];
		const parsed = JSON.parse(serializeCanvas(doc));
		expect(parsed.inboundCommunication[0]).toEqual({
			collaborator: { name: 'Checkout' },
			messages: []
		});
	});
});

describe('serializeCanvasFile', () => {
	it('writes the same bytes as exporting the equivalent document', () => {
		expect(serializeCanvasFile(referenceFile())).toBe(serializeCanvas(stampIds(referenceFile())));
	});

	it('is canonical whatever key order the file arrives in', () => {
		const shuffled = Object.fromEntries(
			Object.entries(referenceFile()).reverse()
		) as unknown as CanvasFile;
		expect(serializeCanvasFile(shuffled)).toBe(serializeCanvasFile(referenceFile()));
	});
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
