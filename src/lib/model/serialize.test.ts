import { describe, expect, it } from 'vitest';
import { blankCanvas, stampIds, type CanvasFile } from '$lib/model/canvas';
import { REFERENCE_FILE } from '$lib/model/reference.fixture';
import { serializeCanvas } from '$lib/model/serialize';

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
					version: 1,
					name: '',
					description: '',
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
		doc.description = 'Renders </script> tags & other markup, e.g. a < b.';

		const out = serializeCanvas(doc);
		expect(out).not.toContain('<');
		expect(out).toContain('\\u003c/script>');
		expect(JSON.parse(out).description).toBe('Renders </script> tags & other markup, e.g. a < b.');
	});

	it('omits optional fields that are unset or emptied, never writes null', () => {
		const doc = blankCanvas();
		doc.strategicClassification = { domain: 'core', businessModel: undefined };
		doc.businessDecisions = [{ id: 'x', name: 'Rule', description: '' }];
		doc.inboundCommunication = [{ id: 'y', collaborator: 'Checkout', messages: [] }];

		const out = serializeCanvas(doc);
		const parsed = JSON.parse(out);
		expect(parsed.strategicClassification).toEqual({ domain: 'core' });
		expect(parsed.businessDecisions[0]).toEqual({ name: 'Rule' });
		expect(parsed.inboundCommunication[0]).toEqual({ collaborator: 'Checkout', messages: [] });
		expect(out).not.toContain('null');
	});
});
