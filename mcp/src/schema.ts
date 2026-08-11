/**
 * The shape `bcc_write_canvas` advertises — and the vocabularies riding in it.
 *
 * Two rules run through this file.
 *
 * **The vocabularies are generated, never typed out.** Every well-known value
 * and every teaching one-liner comes from `src/lib/editor/vocab.ts`, the same
 * module the pickers read. That costs about 400 tokens in `tools/list`, paid
 * once per session against a prompt cache, and buys the one thing a round trip
 * through `bcc_explain` cannot: the model sees them whether or not it thought
 * to ask, and a confident wrong pick is exactly the failure that never asks.
 *
 * **Closed enums are enums; escape-hatched vocabularies are described strings.**
 * `message.type` and `collaborator.kind` are the two genuinely closed sets
 * (SPEC §3.2), so they are the two `z.enum`s. Everywhere else SPEC §4 promises
 * a custom value renders and round-trips like any other, so a hard enum here
 * would refuse "strangler-fig" before the handler ran — the server being
 * stricter than the editor it serves. The describe text says so, and the
 * handler notes the value instead.
 *
 * What this schema is *not* is a validator. `parseCanvasFile` decides whether a
 * document is a Canvas file; this only tells the model what to send. Where the
 * two could disagree, the parser wins and its refusal is what comes back.
 */

import { z } from 'zod';
import { PICK_OPTIONS, TRAITS, type PickOption } from '$lib/editor/vocab';

/** `core, supporting, generic` — for vocabularies whose values speak for themselves. */
function values(options: readonly PickOption[]): string {
	return options.map((option) => option.value).join(', ');
}

/** `partnership — The two contexts succeed…; shared-kernel — …` */
function oneLiners(options: readonly PickOption[]): string {
	return options
		.map((option) => `${option.value} — ${option.description ?? ''}`.trim())
		.join(' · ');
}

const CUSTOM_OK = 'Any other value is kept as written and noted in the result.';

const axis = (what: string, options: readonly PickOption[]) =>
	z.string().optional().describe(`${what} One of: ${values(options)}. ${CUSTOM_OK} Omit if unpicked.`);

const message = z.object({
	type: z
		.enum(['command', 'query', 'event'])
		.describe(
			'What kind of message this is. A command asks the receiver to do something, a query asks it a question, an event reports something that already happened. The only closed set on the canvas.'
		),
	name: z.string().describe('The message itself, as the business says it: "Place Order".'),
	description: z
		.string()
		.optional()
		.describe('One line on what it carries or when it fires. Omit rather than sending an empty string.')
});

const relationshipEnd = (whose: string) =>
	z
		.string()
		.optional()
		.describe(`${whose} One of: ${values(PICK_OPTIONS.relationship)}. ${CUSTOM_OK} Omit if undecided.`);

const lane = (direction: string) =>
	z.object({
		collaborator: z
			.object({
				name: z.string().describe(`The other context or system ${direction}. Its name, not its role.`),
				kind: z
					.enum(['bounded-context', 'external-system', 'frontend', 'user'])
					.optional()
					.describe(
						'What kind of collaborator this is. Omit if unstated — an absent kind means unclassified, not bounded-context. The only other closed set on the canvas.'
					)
			})
			.describe(`The other party ${direction}.`),
		relationship: z
			.object({
				theirs: relationshipEnd("The collaborator's side of the boundary."),
				ours: relationshipEnd("This context's side of the boundary.")
			})
			.optional()
			.describe(
				`The context-mapping pattern, read from each end of the boundary — a pairing, not a duplicate field: send both ends only when each side's stance is actually known. The patterns: ${oneLiners(PICK_OPTIONS.relationship)}. Omit the whole object if it hasn't been decided.`
			),
		messages: z.array(message).describe('What crosses this boundary, in the order it makes sense in.')
	});

export const CANVAS_SHAPE = z.object({
	name: z.string().describe('The bounded context this canvas is about.'),
	purpose: z
		.string()
		.describe(
			'What the context exists to do, in a few sentences of business language — not implementation. Empty string if not yet written.'
		),
	strategicClassification: z
		.object({
			domain: axis('How much of the business advantage lives here.', PICK_OPTIONS.domain),
			businessModel: axis('How the context pays for itself.', PICK_OPTIONS.businessModel),
			evolution: axis('How settled the thing being built is.', PICK_OPTIONS.evolution)
		})
		.describe('Three independent axes. Send an empty object if none has been picked.'),
	domainRoles: z
		.array(z.object({ name: z.string() }))
		.describe(
			`What kind of context this is — usually one to three traits. The fifteen: ${oneLiners(TRAITS)}. ${CUSTOM_OK}`
		),
	inboundCommunication: z
		.array(lane('that sends to this context'))
		.describe('Who sends this context commands, queries or events — one entry per collaborator.'),
	ubiquitousLanguage: z
		.array(
			z.object({
				term: z.string().describe('A word that means something precise inside this context.'),
				definition: z.string().optional().describe('What it means here, in one line.')
			})
		)
		.describe('The words this context insists on, and what they mean inside its boundary.'),
	businessDecisions: z
		.array(
			z.object({
				name: z.string().describe('The rule, stated as a rule.'),
				description: z.string().optional().describe('One line on the detail or the exception.')
			})
		)
		.describe('The policies and rules this context enforces — the reason it owns its data.'),
	outboundCommunication: z
		.array(lane('that consumes what this context emits'))
		.describe('Who consumes what this context emits — one entry per collaborator.'),
	assumptions: z.array(z.string()).describe('What the design takes to be true, each on its own.'),
	verificationMetrics: z
		.array(z.string())
		.describe('What would show the design is working — measurable where possible.'),
	openQuestions: z.array(z.string()).describe("What is still unresolved, phrased as questions.")
});

export const WRITE_INPUT = z.object({
	path: z
		.string()
		.describe(
			'Where to write it, relative to the canvas root. Must end in .bcc.json. Directories are the repo\'s business, not the server\'s — put it next to the code it describes.'
		),
	version: z
		.number()
		.int()
		.optional()
		.describe(
			'The Canvas file format version. Omit it — the server stamps the current one either way. It is accepted only so a document read with view: "json" can be handed straight back.'
		),
	canvas: CANVAS_SHAPE.describe(
		'The whole canvas. Every section is required; a section with nothing in it is an empty array or an empty string, and the result names which ones came out that way.'
	)
});
