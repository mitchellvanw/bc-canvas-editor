/**
 * The curated vocabularies (SPEC §4), verbatim: canonical well-known strings
 * the pickers offer, with the teaching one-liners that are the pickers' only
 * teaching (SPEC §10 — no hint lines). All app-side text — descriptions never
 * reach the Canvas file (SPEC §3.2); any other string is a custom value that
 * renders identically and round-trips by construction.
 */

import type { PickKind } from '$lib/sheet/pick-slots';

export interface PickOption {
	value: string;
	/** The teaching one-liner (relationships and traits; axes carry none). */
	description?: string;
}

/** The clear entry per pick-one vocabulary — exact wording from SPEC §10. */
export const CLEAR_LABELS: Record<PickKind, string> = {
	domain: '— none —',
	businessModel: '— none —',
	evolution: '— none —',
	relationship: '— no relationship —'
};

/** Classification axis values (SPEC §4.1) and relationship patterns (§4.3). */
export const PICK_OPTIONS: Record<PickKind, PickOption[]> = {
	domain: [{ value: 'core' }, { value: 'supporting' }, { value: 'generic' }],
	businessModel: [
		{ value: 'revenue' },
		{ value: 'engagement' },
		{ value: 'compliance' },
		{ value: 'cost-reduction' }
	],
	evolution: [
		{ value: 'genesis' },
		{ value: 'custom-built' },
		{ value: 'product' },
		{ value: 'commodity' }
	],
	relationship: [
		{
			value: 'partnership',
			description: 'The two contexts succeed or fail together; teams coordinate as equals.'
		},
		{
			value: 'shared-kernel',
			description: 'Both contexts share a piece of the model, changed only by mutual agreement.'
		},
		{
			value: 'customer-supplier',
			description: "Upstream plans around this context's needs, like a supplier serving a customer."
		},
		{
			value: 'conformist',
			description: 'This context adopts the upstream model wholesale rather than translating it.'
		},
		{
			value: 'anticorruption-layer',
			description: 'A translation layer at the boundary keeps the upstream model from leaking in.'
		},
		{
			value: 'open-host-service',
			description: 'Upstream exposes one published protocol that all consumers use.'
		},
		{
			value: 'published-language',
			description: 'The exchange uses a shared, well-documented format — often an industry standard.'
		},
		{
			value: 'separate-ways',
			description: 'No integration — duplication costs less than coupling here.'
		},
		{
			value: 'big-ball-of-mud',
			description: "The other side is entangled legacy; defend this context's boundary."
		}
	]
};

/**
 * The 15 domain-role traits (SPEC §4.2): file values are natural lowercase
 * prose, displayed sentence-case by the sheet and the picker.
 */
export const TRAITS: PickOption[] = [
	{
		value: 'specification model',
		description: 'Encodes the detailed rules of a critical business calculation.'
	},
	{
		value: 'execution context',
		description: 'Carries out a business workflow from trigger to outcome.'
	},
	{ value: 'audit model', description: 'Records what happened for traceability and compliance.' },
	{ value: 'approver', description: 'Decides whether a requested action may proceed.' },
	{ value: 'enforcer', description: 'Makes other contexts comply with a policy or standard.' },
	{
		value: 'octopus coordinator',
		description: 'Orchestrates several contexts to fulfil one process.'
	},
	{
		value: 'interchange context',
		description: 'Translates between two models so neither has to bend.'
	},
	{
		value: 'gateway context',
		description: 'Fronts an external system or protocol for the rest of the system.'
	},
	{
		value: 'service context',
		description: 'Offers a capability other contexts consume on demand.'
	},
	{
		value: 'analysis context',
		description: 'Derives insight from data other contexts produce.'
	},
	{ value: 'engagement context', description: 'Drives user interaction and experience.' },
	{ value: 'funnel context', description: 'Condenses input from many sources into one stream.' },
	{ value: 'draft context', description: 'A model still being explored; expect churn.' },
	{ value: 'brain context', description: 'Concentrates the cleverest, most valuable logic.' },
	{
		value: 'autonomous bubble',
		description: 'Deliberately isolated from legacy models so it can evolve freely.'
	}
];
