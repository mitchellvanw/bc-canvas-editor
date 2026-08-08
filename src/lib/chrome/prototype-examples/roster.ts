/**
 * PROTOTYPE — throwaway roster for the example-chooser prototype
 * (wayfinder/tickets/021-example-chooser.md). Order Fulfillment rides the
 * real draft from examples/; the other three are thin placeholders that
 * exist only so choosing visibly changes the sheet. The real canvases land
 * via wayfinder/tickets/022-author-examples.md.
 */
import type { CanvasFile } from '$lib/model/canvas';
import orderFulfillment from './order-fulfillment.json';

export interface ExampleEntry {
	name: string;
	/** Chooser one-liner from the roster ticket — draft copy, polished at ship time. */
	description: string;
	file: CanvasFile;
}

const notifications: CanvasFile = {
	version: 1,
	name: 'Notifications',
	description:
		'Delivers order updates to customers on whichever channel they chose — email, SMS or push. Rented provider underneath; this context owns preferences and routing, nothing else.',
	strategicClassification: { domain: 'generic', evolution: 'commodity' },
	domainRoles: [{ name: 'gateway' }],
	inboundCommunication: [
		{
			collaborator: 'Order Fulfillment',
			relationship: 'customer-supplier',
			messages: [{ type: 'event', name: 'Order Shipped' }]
		}
	],
	ubiquitousLanguage: [
		{ term: 'Channel', definition: 'A way to reach the customer: email, SMS, push.' },
		{ term: 'Preference', definition: 'The channel a customer chose for a kind of update.' }
	],
	businessDecisions: [
		{
			name: 'Buy, never build',
			description: 'Delivery rides a rented provider; we conform to its API.'
		}
	],
	outboundCommunication: [],
	assumptions: [],
	verificationMetrics: [],
	openQuestions: []
};

const appointmentScheduling: CanvasFile = {
	version: 1,
	name: 'Appointment Scheduling',
	description:
		'Books patients into clinic slots and keeps no-shows down. Care is the clinic’s core; scheduling supports it.',
	strategicClassification: { domain: 'supporting', evolution: 'product' },
	domainRoles: [{ name: 'execution context' }],
	inboundCommunication: [
		{
			collaborator: 'Front Desk',
			messages: [
				{ type: 'command', name: 'Book Appointment' },
				{ type: 'command', name: 'Cancel Appointment' }
			]
		}
	],
	ubiquitousLanguage: [
		{ term: 'Slot', definition: 'A bookable stretch of a practitioner’s day.' },
		{ term: 'No-show', definition: 'A booked patient who never arrived.' }
	],
	businessDecisions: [
		{
			name: 'Overbook high no-show clinics',
			description: 'Clinics above the no-show threshold may book slots twice.'
		}
	],
	outboundCommunication: [],
	assumptions: [],
	verificationMetrics: ['No-show rate stays under 5% of booked slots'],
	openQuestions: []
};

const royaltyDistribution: CanvasFile = {
	version: 1,
	name: 'Royalty Distribution',
	description: 'Splits streaming revenue among rights holders.',
	// Deliberately unset — the core-or-supporting debate lives in the open questions.
	strategicClassification: {},
	domainRoles: [],
	inboundCommunication: [],
	ubiquitousLanguage: [
		{ term: 'Split', definition: 'The agreed percentage of a work’s revenue per rights holder.' }
	],
	businessDecisions: [
		{ name: 'Monthly settlement', description: 'Royalties settle monthly, never per stream.' }
	],
	outboundCommunication: [],
	assumptions: [],
	verificationMetrics: [],
	openQuestions: [
		'Is royalty splitting core to our label deals, or supporting the catalogue?',
		'Who resolves conflicting rights claims on the same work?',
		'Are advances and recoupments in scope here or in Contracts?'
	]
};

export const EXAMPLES: ExampleEntry[] = [
	{
		name: 'Order Fulfillment',
		description: 'Coordinates picking, packing and shipping once an order is paid.',
		file: orderFulfillment as CanvasFile
	},
	{
		name: 'Notifications',
		description: 'Delivers order updates to customers on their preferred channel.',
		file: notifications
	},
	{
		name: 'Appointment Scheduling',
		description: 'Books patients into clinic slots and keeps no-shows down.',
		file: appointmentScheduling
	},
	{
		name: 'Royalty Distribution',
		description: 'Splits streaming revenue among rights holders. Captured mid-workshop.',
		file: royaltyDistribution
	}
];
