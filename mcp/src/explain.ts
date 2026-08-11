/**
 * `bcc_explain`: the method, one section at a time.
 *
 * The server carries the ddd-crew's questions rather than hoping the model
 * reconstructs them, and it carries them in the sheet's own words — the SPEC
 * §10 placeholders, through `sections.ts`, so the tool and the editor ask the
 * same thing. What this adds on top is the shape of the JSON for that section
 * and one or two rows to calibrate against.
 *
 * Those rows are deliberately drawn from different domains — a warehouse here,
 * a clinic there — and never assemble into one imitable canvas. Models lift
 * proper nouns, and the cost of a plausible fiction in context is a collaborator
 * called "Order Fulfillment" turning up in somebody's payroll canvas. Anything
 * larger than a row belongs to the user's own canvases, which `bcc_list_canvases`
 * surfaces as soon as there are any.
 */

import { PICK_OPTIONS, TRAITS, type PickOption } from '$lib/editor/vocab';
import { question, sectionByKey, SECTIONS, type SectionKey } from './sections';

export const TOPICS = [
	'canvas',
	...SECTIONS.map((section) => section.key)
] as const satisfies readonly ('canvas' | SectionKey)[];

export type Topic = (typeof TOPICS)[number];

function vocabularyLines(options: readonly PickOption[]): string[] {
	return options.map((option) =>
		option.description === undefined ? `  ${option.value}` : `  ${option.value} — ${option.description}`
	);
}

const CUSTOM_OK = 'Any other value is accepted and kept as written.';

interface Entry {
	/** What this section looks like in the file. */
	shape: string;
	/** The curated vocabulary, where the section draws on one. */
	vocabulary?: string[];
	/** One or two rows, as they would read in the file. */
	rows: string[];
}

const ENTRIES: Record<SectionKey, Entry> = {
	name: {
		shape: 'A string: the bounded context this canvas is about, as the business names it.',
		rows: ['Shipment Tracking']
	},
	purpose: {
		shape:
			'A string of a few sentences, in business language. What the context is for — not how it is built.',
		rows: ['Keeps parcels findable from dispatch to doorstep, and tells everyone else where they are.']
	},
	strategicClassification: {
		shape:
			'An object of up to three independent axes — domain, businessModel, evolution. Each is optional; omit an axis rather than guessing it.',
		vocabulary: [
			'domain — how much of the business advantage lives here:',
			...vocabularyLines(PICK_OPTIONS.domain),
			'',
			'businessModel — how the context pays for itself:',
			...vocabularyLines(PICK_OPTIONS.businessModel),
			'',
			'evolution — how settled the thing being built is:',
			...vocabularyLines(PICK_OPTIONS.evolution)
		],
		rows: ['Domain: supporting · Business model: cost-reduction · Evolution: product']
	},
	domainRoles: {
		shape:
			'An array of { "name": … }, usually one to three. Traits describe how the context behaves, not what it stores.',
		vocabulary: ['The fifteen:', ...vocabularyLines(TRAITS)],
		rows: ['gateway context', 'analysis context']
	},
	inboundCommunication: {
		shape:
			'An array of lanes, one per collaborator: { "collaborator": { "name": …, "kind"?: "bounded-context" | "external-system" | "frontend" | "user" }, "relationship"?: { "theirs"?: …, "ours"?: … }, "messages": [ { "type": "command" | "query" | "event", "name": …, "description"?: … } ] }. The relationship names the context-mapping pattern at each end of the boundary — the collaborator\'s side and this context\'s. Inbound messages are the ones this context receives.',
		vocabulary: ['relationship — the context-mapping pattern:', ...vocabularyLines(PICK_OPTIONS.relationship)],
		rows: [
			'Dispatch (customer-supplier)',
			'  command Register Parcel — Opens tracking for a parcel the carrier has taken.'
		]
	},
	ubiquitousLanguage: {
		shape:
			'An array of { "term": …, "definition"?: … }. The words this context insists on, meant as they are meant inside its boundary.',
		rows: ['Shipment — A physical parcel dispatched against an order.']
	},
	businessDecisions: {
		shape:
			'An array of { "name": …, "description"?: … }. State each as a rule, not as a capability — this is the section that explains why the context owns its data.',
		rows: [
			"A parcel is late once it passes its promised window — Measured against the carrier's promise, not ours."
		]
	},
	outboundCommunication: {
		shape:
			'The same lane shape as inbound — collaborator, optional relationship ends, messages. Outbound messages are the ones this context emits — most of them events, and each one a commitment to whoever listens.',
		vocabulary: ['relationship — the context-mapping pattern:', ...vocabularyLines(PICK_OPTIONS.relationship)],
		rows: ['Customer Notifications (open-host-service)', '  event Parcel Delivered']
	},
	assumptions: {
		shape: 'An array of strings, each one thing the design takes to be true.',
		rows: ['Every carrier we use exposes a tracking webhook.']
	},
	verificationMetrics: {
		shape:
			'An array of strings. What would show the design works — measurable where it can be, honest where it cannot.',
		rows: ['Fewer than one in a hundred parcels needs a manual status lookup.']
	},
	openQuestions: {
		shape: 'An array of strings, each phrased as a question, each still genuinely open.',
		rows: ['Who owns a parcel once the carrier loses it?']
	}
};

const CANVAS_OVERVIEW = [
	'# The Bounded Context Canvas',
	'',
	'One canvas describes one bounded context: what it is for, who it talks to, the',
	'language it insists on, and the rules it enforces. It is a design conversation',
	'in eleven sections, and it is worth more half-filled than left unstarted — an',
	'empty section is a question nobody has answered yet, which is information.',
	'',
	'The eleven, in the order the sheet reads:',
	'',
	...SECTIONS.map((section) => {
		const asked = question(section);
		return asked === undefined ? `  ${section.label}` : `  ${section.label} — ${asked}`;
	}),
	'',
	'Five of the eleven are business judgments a codebase cannot answer: strategic',
	'classification, domain roles, business decisions, assumptions, and',
	'verification metrics. Reading code will still produce plausible entries for',
	'all five. When drafting from code alone, leave them empty and raise what you',
	'would have written under Open questions instead — a filled row reads as a',
	'decision someone made, and a question is the honest form of a guess.',
	'',
	'Call bcc_explain again with any section name for its shape, its vocabulary and',
	'an example row. bcc_list_canvases shows the canvases already under this root —',
	'read one before drafting, since a real neighbouring canvas calibrates better',
	'than anything described here.',
	'',
	'Based on the Bounded Context Canvas by the ddd-crew · CC BY 4.0'
].join('\n');

/** The teaching text for one topic. */
export function explain(topic: Topic): string {
	if (topic === 'canvas') return CANVAS_OVERVIEW;

	const section = sectionByKey(topic);
	const entry = ENTRIES[topic];
	const asked = question(section);

	// Heading and question on one line, the same shape the overview lists them
	// in — the §10 strings are fragments that follow a label ("+ trait — how
	// does this context behave?"), and they read as fragments on their own.
	const lines = [`# ${section.label}${asked === undefined ? '' : ` — ${asked}`}`, '', entry.shape];
	if (entry.vocabulary !== undefined) lines.push('', ...entry.vocabulary, '', CUSTOM_OK);
	lines.push('', 'For example:', ...entry.rows);

	return lines.join('\n');
}
