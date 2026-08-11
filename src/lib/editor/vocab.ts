/**
 * The curated vocabularies (SPEC §4), verbatim: canonical well-known strings
 * the pickers offer, with the teaching one-liners that are the pickers' only
 * teaching (SPEC §10 — no hint lines). All app-side text — descriptions never
 * reach the Canvas file (SPEC §3.2); any other string is a custom value that
 * renders identically and round-trips by construction. The one exception is
 * `collaboratorKind`, a closed set: the parser refuses unknown kinds by name,
 * so its picker offers no custom… entry.
 */

import type { PickKind } from '$lib/sheet/pick-slots';

export interface PickOption {
	value: string;
	/** The teaching one-liner (kinds, relationships and traits; axes carry none). */
	description?: string;
	/** The worksheet's "(likely anti-pattern)" flag — the sheet draws a caution ring. */
	caution?: true;
}

/** The clear entry per pick-one vocabulary — exact wording from SPEC §10. */
export const CLEAR_LABELS: Record<PickKind, string> = {
	domain: '— none —',
	businessModel: '— none —',
	evolution: '— none —',
	relationship: '— no relationship —',
	collaboratorKind: '— no kind —'
};

/**
 * Classification axis values (SPEC §4.1), collaborator kinds (§4.2) and
 * relationship patterns (§4.4).
 */
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
	collaboratorKind: [
		{
			value: 'bounded-context',
			description: 'Another modelled context in the system, with its own team and language.'
		},
		{
			value: 'external-system',
			description: 'A system outside the design — third-party or legacy — taken as it is.'
		},
		{
			value: 'frontend',
			description: 'A user interface that consumes this context from outside it.'
		},
		{
			value: 'user',
			description: 'Direct user interaction — this context owns the interface people use.'
		}
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
 * The domain-role traits (SPEC §4.3): the ddd-crew model-traits worksheet plus
 * one local addition, in the worksheet's own order — the worksheet fixes no
 * count and invites custom traits, so no count is claimed anywhere. File
 * values are natural lowercase prose, displayed sentence-case by the sheet and
 * the picker. Where the worksheet slashes two names into one row
 * (Specification/Draft, Analysis/Audit) the list keeps the project's split,
 * in the slash's order.
 */
export const TRAITS: PickOption[] = [
	{
		value: 'specification model',
		description: 'Encodes the detailed rules of a critical business calculation.'
	},
	{ value: 'draft context', description: 'A model still being explored; expect churn.' },
	{
		value: 'execution context',
		description: 'Carries out a business workflow from trigger to outcome.'
	},
	{
		value: 'analysis context',
		description: 'Derives insight from data other contexts produce.'
	},
	{ value: 'audit model', description: 'Records what happened for traceability and compliance.' },
	{ value: 'approver', description: 'Decides whether a requested action may proceed.' },
	{ value: 'enforcer', description: 'Makes other contexts comply with a policy or standard.' },
	{
		value: 'octopus enforcer',
		description: 'Holds many contexts at once to the same standard rule.'
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
		value: 'gateway interchange',
		description: 'Fronts an external protocol and translates its model in the same place.'
	},
	{
		value: 'dogfood context',
		description: 'Used daily by the team that builds it, so the model is tested from inside.'
	},
	{
		value: 'bubble context',
		description: 'A clean model kept apart from legacy behind a translation layer.'
	},
	{
		value: 'autonomous bubble',
		description: 'Deliberately isolated from legacy models so it can evolve freely.'
	},
	{
		value: 'brain context',
		description:
			'Concentrates so much logic that everything else leans on it — likely an anti-pattern.',
		caution: true
	},
	{ value: 'funnel context', description: 'Condenses input from many sources into one stream.' },
	{ value: 'engagement context', description: 'Drives user interaction and experience.' },
	{
		value: 'service context',
		description:
			'Offers a capability other contexts consume on demand. Local addition, not on the community worksheet.'
	}
];

/**
 * Traits the worksheet flags "(likely anti-pattern)". Matched by name, so a
 * hand-typed custom "brain context" carries the same ring — it is the same
 * trait.
 */
export const CAUTION_TRAITS: ReadonlySet<string> = new Set(
	TRAITS.filter((trait) => trait.caution).map((trait) => trait.value)
);
