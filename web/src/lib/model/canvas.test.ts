import { describe, expect, it } from 'vitest';
import { blankCanvas, moveItem, stampIds, type CanvasFile } from '$lib/model/canvas';

const SECTION_KEYS = [
	'version',
	'name',
	'purpose',
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
		expect(doc.version).toBe(2);
		expect(doc.name).toBe('');
		expect(doc.purpose).toBe('');
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
			version: 2,
			name: 'Order Fulfillment',
			purpose: 'Ships paid orders.',
			strategicClassification: { domain: 'core' },
			domainRoles: [{ name: 'execution context' }],
			inboundCommunication: [
				{
					collaborator: { name: 'Checkout', kind: 'bounded-context' },
					relationship: { theirs: 'customer-supplier' },
					messages: [
						{ type: 'command', name: 'Place Order' },
						{ type: 'event', name: 'Payment Confirmed' }
					]
				}
			],
			ubiquitousLanguage: [{ term: 'Shipment', definition: 'A parcel.' }],
			businessDecisions: [{ name: 'No partial shipments' }],
			outboundCommunication: [
				{ collaborator: { name: 'Notifications' }, messages: [{ type: 'event', name: 'Order Shipped' }] }
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
		expect(doc.inboundCommunication[0].collaborator).toEqual({
			name: 'Checkout',
			kind: 'bounded-context'
		});
		expect(doc.inboundCommunication[0].relationship).toEqual({ theirs: 'customer-supplier' });
		expect(doc.inboundCommunication[0].messages[1].name).toBe('Payment Confirmed');
		expect(doc.assumptions).toEqual(['Stock counts are accurate.']);
	});

	it('does not mutate the input file', () => {
		const file: CanvasFile = {
			...blankFile(),
			domainRoles: [{ name: 'audit model' }],
			inboundCommunication: [
				{
					collaborator: { name: 'Checkout' },
					relationship: { ours: 'conformist' },
					messages: []
				}
			]
		};
		const doc = stampIds(file);
		doc.inboundCommunication[0].collaborator.name = 'Renamed';
		doc.inboundCommunication[0].relationship!.ours = 'partnership';
		expect(file.domainRoles[0]).toEqual({ name: 'audit model' });
		// The lane's objects are copies, not shared references.
		expect(file.inboundCommunication[0].collaborator).toEqual({ name: 'Checkout' });
		expect(file.inboundCommunication[0].relationship).toEqual({ ours: 'conformist' });
	});
});

describe('moveItem', () => {
	it('moves an item toward the end', () => {
		const list = ['a', 'b', 'c', 'd'];
		moveItem(list, 0, 2);
		expect(list).toEqual(['b', 'c', 'a', 'd']);
	});

	it('moves an item toward the start', () => {
		const list = ['a', 'b', 'c', 'd'];
		moveItem(list, 3, 1);
		expect(list).toEqual(['a', 'd', 'b', 'c']);
	});

	it('leaves the list unchanged when from equals to', () => {
		const list = ['a', 'b', 'c'];
		moveItem(list, 1, 1);
		expect(list).toEqual(['a', 'b', 'c']);
	});
});

function blankFile(): CanvasFile {
	return {
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
	};
}
