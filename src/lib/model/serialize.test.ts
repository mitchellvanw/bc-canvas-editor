import { describe, expect, it } from 'vitest';
import { blankCanvas, stampIds, type CanvasFile } from '$lib/model/canvas';
import { serializeCanvas } from '$lib/model/serialize';

// The reference example from SPEC §3.1, byte for byte.
const REFERENCE_FILE = `{
  "version": 1,
  "name": "Order Fulfillment",
  "description": "Coordinates picking, packing and shipping once an order is paid.",
  "strategicClassification": {
    "domain": "core",
    "businessModel": "revenue",
    "evolution": "custom-built"
  },
  "domainRoles": [
    { "name": "execution context" }
  ],
  "inboundCommunication": [
    {
      "collaborator": "Checkout",
      "relationship": "customer-supplier",
      "messages": [
        { "type": "command", "name": "Place Order" },
        { "type": "event", "name": "Payment Confirmed", "description": "Triggers fulfillment." }
      ]
    }
  ],
  "ubiquitousLanguage": [
    { "term": "Shipment", "definition": "A physical parcel dispatched against an order." }
  ],
  "businessDecisions": [
    { "name": "No partial shipments", "description": "An order ships complete or not at all." }
  ],
  "outboundCommunication": [
    { "collaborator": "Notifications", "messages": [{ "type": "event", "name": "Order Shipped" }] }
  ],
  "assumptions": ["Warehouse stock counts are accurate within the hour."],
  "verificationMetrics": ["Time from payment to dispatch under 4 hours."],
  "openQuestions": ["Who owns returns — this context or a new one?"]
}`;

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
