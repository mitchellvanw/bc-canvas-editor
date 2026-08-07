import { describe, expect, it } from 'vitest';
import { blankCanvas, stampIds, type CanvasFile } from '$lib/model/canvas';

const SECTION_KEYS = [
	'version',
	'name',
	'description',
	'strategicClassification',
	'domainRoles',
	'inboundCommunication',
	'ubiquitousLanguage',
	'businessDecisions',
	'outboundCommunication',
	'assumptions',
	'verificationMetrics',
	'openQuestions'
] as const;

describe('blankCanvas', () => {
	it('holds all eleven section keys plus version, empty', () => {
		const doc = blankCanvas();
		expect(Object.keys(doc)).toEqual([...SECTION_KEYS]);
		expect(doc.version).toBe(1);
		expect(doc.name).toBe('');
		expect(doc.description).toBe('');
		expect(doc.strategicClassification).toEqual({});
		expect(doc.domainRoles).toEqual([]);
		expect(doc.inboundCommunication).toEqual([]);
		expect(doc.ubiquitousLanguage).toEqual([]);
		expect(doc.businessDecisions).toEqual([]);
		expect(doc.outboundCommunication).toEqual([]);
		expect(doc.assumptions).toEqual([]);
		expect(doc.verificationMetrics).toEqual([]);
		expect(doc.openQuestions).toEqual([]);
	});
});

describe('stampIds', () => {
	it('stamps a distinct ephemeral id on every row, lane and message', () => {
		const file: CanvasFile = {
			version: 1,
			name: 'Order Fulfillment',
			description: 'Ships paid orders.',
			strategicClassification: { domain: 'core' },
			domainRoles: [{ name: 'execution context' }],
			inboundCommunication: [
				{
					collaborator: 'Checkout',
					relationship: 'customer-supplier',
					messages: [
						{ type: 'command', name: 'Place Order' },
						{ type: 'event', name: 'Payment Confirmed' }
					]
				}
			],
			ubiquitousLanguage: [{ term: 'Shipment', definition: 'A parcel.' }],
			businessDecisions: [{ name: 'No partial shipments' }],
			outboundCommunication: [
				{ collaborator: 'Notifications', messages: [{ type: 'event', name: 'Order Shipped' }] }
			],
			assumptions: ['Stock counts are accurate.'],
			verificationMetrics: [],
			openQuestions: []
		};

		const doc = stampIds(file);

		const ids = [
			doc.domainRoles[0].id,
			doc.inboundCommunication[0].id,
			doc.inboundCommunication[0].messages[0].id,
			doc.inboundCommunication[0].messages[1].id,
			doc.ubiquitousLanguage[0].id,
			doc.businessDecisions[0].id,
			doc.outboundCommunication[0].id,
			doc.outboundCommunication[0].messages[0].id
		];
		for (const id of ids) expect(id).toBeTruthy();
		expect(new Set(ids).size).toBe(ids.length);

		// Content survives untouched.
		expect(doc.name).toBe('Order Fulfillment');
		expect(doc.inboundCommunication[0].collaborator).toBe('Checkout');
		expect(doc.inboundCommunication[0].relationship).toBe('customer-supplier');
		expect(doc.inboundCommunication[0].messages[1].name).toBe('Payment Confirmed');
		expect(doc.assumptions).toEqual(['Stock counts are accurate.']);
	});

	it('does not mutate the input file', () => {
		const file: CanvasFile = {
			...blankFile(),
			domainRoles: [{ name: 'audit model' }]
		};
		stampIds(file);
		expect(file.domainRoles[0]).toEqual({ name: 'audit model' });
	});
});

function blankFile(): CanvasFile {
	return {
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
	};
}
