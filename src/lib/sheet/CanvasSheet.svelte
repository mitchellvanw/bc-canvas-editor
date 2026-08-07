<script lang="ts" module>
	import type { MessageType } from '$lib/model/canvas';

	// One uniform chip shape; type is carried by color + glyph (SPEC §5). The
	// sheet is the canonical visual truth, so the editor's type popover imports
	// this map rather than re-encoding it.
	export const GLYPHS: Record<MessageType, string> = { command: '▶', query: '?', event: '◆' };
</script>

<script lang="ts">
	/**
	 * The quiet sheet (SPEC §5): the one shared read-only render of a canvas —
	 * the canonical visual truth the editor wraps and both artifacts mount
	 * offscreen (SPEC §9). It carries zero editing affordances; the only seam
	 * for the editor is the optional `field` snippet, offered a TextSlot for
	 * every free-text location, the structural seams of ticket 06 — a
	 * RemoveSlot on every removable item, an AddSlot ghost per repeating
	 * section, a MessageAddSlot per lane, a grip per lane — and the picker
	 * seams of ticket 07: a PickSlot on every classification axis and lane
	 * relationship, a TraitSlot on the domain-role set. Without the snippets
	 * every slot renders its plain value and no chrome exists.
	 *
	 * Palette pairs are AA-verified by contrast.test.ts; secondary text uses
	 * ink-soft (the prototype's faint gray fails AA and is decorative-only).
	 */
	import type { Snippet } from 'svelte';
	import { newId, type CanvasDoc, type LaneRow } from '$lib/model/canvas';
	import type { PickSlot, TraitSlot } from './pick-slots';
	import type { AddSlot, MessageAddSlot, RemoveSlot } from './structure-slots';
	import type { TextSlot } from './text-slot';

	let {
		doc,
		field,
		removeItem,
		addItem,
		addMessage,
		grip,
		pickValue,
		addTrait
	}: {
		doc: CanvasDoc;
		field?: Snippet<[TextSlot]>;
		removeItem?: Snippet<[RemoveSlot]>;
		addItem?: Snippet<[AddSlot]>;
		addMessage?: Snippet<[MessageAddSlot]>;
		grip?: Snippet;
		pickValue?: Snippet<[PickSlot]>;
		addTrait?: Snippet<[TraitSlot]>;
	} = $props();

	const REPO_URL = 'https://github.com/ddd-crew/bounded-context-canvas';
	const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

	// Legend order and wording per SPEC §10.
	const LEGEND = [
		{ meaning: 'command', label: 'command' },
		{ meaning: 'query', label: 'query' },
		{ meaning: 'event', label: 'event' },
		{ meaning: 'policy', label: 'decision' },
		{ meaning: 'collaborator', label: 'collaborator' },
		{ meaning: 'hotspot', label: 'open question' }
	];

	/**
	 * A ghost add's teaching face (SPEC §7): while its section is empty the
	 * label is the section's §10 question and the ghost stays visible; the
	 * first item collapses it to the terse label. Pure emptiness — no flag.
	 */
	function ghostFace(count: number, terse: string, question: string) {
		return { label: count ? terse : question, teaching: count === 0 };
	}

	const axes = $derived([
		{ kind: 'domain' as const, label: 'Domain', value: doc.strategicClassification.domain },
		{
			kind: 'businessModel' as const,
			label: 'Business model',
			value: doc.strategicClassification.businessModel
		},
		{ kind: 'evolution' as const, label: 'Evolution', value: doc.strategicClassification.evolution }
	]);
</script>

{#snippet text(slot: TextSlot)}{#if field}{@render field(slot)}{:else}{slot.value}{/if}{/snippet}

{#snippet communication(label: string, lanes: LaneRow[], area: string, question: string)}
	<section class="panel panel--collab {area}">
		<h2 class="panel__label">{label}</h2>
		<div class="panel__body">
			{#if lanes.length > 0}
				<ul class="lanes">
					{#each lanes as lane, laneIndex (lane.id)}
						<li class="lane">
							<div class="lane__head">
								{#if grip}{@render grip()}{/if}
								<h3 class="lane__who">
									{@render text({
										value: lane.collaborator,
										label: 'Collaborator',
										placeholder: 'Collaborator',
										set: (value) => (lane.collaborator = value)
									})}
								</h3>
								{@render removeItem?.({
									label: `Remove collaborator ${lane.collaborator}`.trim(),
									type: 'Collaborator',
									remove: () => lanes.splice(laneIndex, 1)
								})}
								{#if pickValue}
									<span class="lane__rel">
										{@render pickValue({
											kind: 'relationship',
											key: lane.id,
											label: `Relationship for ${lane.collaborator}`.trim(),
											value: lane.relationship,
											set: (value) => (lane.relationship = value)
										})}
									</span>
								{:else if lane.relationship}<span class="lane__rel">{lane.relationship}</span>{/if}
							</div>
							{#if lane.messages.length > 0}
								<ul class="msgs">
									{#each lane.messages as message, messageIndex (message.id)}
										<li class="msg" data-meaning={message.type}>
											<span class="msg__glyph" aria-hidden="true">{GLYPHS[message.type]}</span
											><span class="sr-only">{message.type}, </span>{@render text({
												value: message.name,
												label: 'Message name',
												placeholder: 'Message name',
												set: (value) => (message.name = value)
											})}
											{#if field || message.description}<span class="msg__desc"
													>{@render text({
														value: message.description ?? '',
														label: 'Message description',
														placeholder: 'detail',
														multiline: true,
														set: (value) => (message.description = value)
													})}</span
												>{/if}
											{@render removeItem?.({
												label: `Remove ${message.type} ${message.name}`.trim(),
												type: message.type.charAt(0).toUpperCase() + message.type.slice(1),
												remove: () => lane.messages.splice(messageIndex, 1)
											})}
										</li>
									{/each}
								</ul>
							{/if}
							{@render addMessage?.({
								laneId: lane.id,
								add: (type) => lane.messages.push({ id: newId(), type, name: '' })
							})}
						</li>
					{/each}
				</ul>
			{/if}
			{@render addItem?.({
				...ghostFace(lanes.length, '+ collaborator', question),
				focusField: 'Collaborator',
				add: () => lanes.push({ id: newId(), collaborator: '', messages: [] })
			})}
		</div>
	</section>
{/snippet}

{#snippet stickies(
	label: string,
	itemLabel: string,
	terse: string,
	question: string,
	items: string[],
	area: string,
	hotspot: boolean
)}
	<section class="panel {area}" class:panel--hotspot={hotspot}>
		<h2 class="panel__label">{label}</h2>
		<div class="panel__body">
			{#if items.length > 0}
				<ul class="stack" class:stack--hotspot={hotspot}>
					{#each items as item, index (index)}
						<li>
							{@render text({
								value: item,
								label: itemLabel,
								placeholder: '…',
								set: (value) => (items[index] = value)
							})}
							{@render removeItem?.({
								label: `Remove ${itemLabel.toLowerCase()}`,
								type: itemLabel,
								remove: () => items.splice(index, 1)
							})}
						</li>
					{/each}
				</ul>
			{/if}
			{@render addItem?.({
				...ghostFace(items.length, terse, question),
				focusField: itemLabel,
				add: () => items.push('')
			})}
		</div>
	</section>
{/snippet}

<article class="quiet-sheet">
	<header class="tb">
		<div class="tb__id">
			<p class="tb__eyebrow">Bounded Context Canvas&nbsp;·&nbsp;V5</p>
			<h1 class="tb__name">
				{@render text({
					value: doc.name,
					label: 'Name',
					placeholder: 'Name this context',
					tone: 'ink',
					set: (value) => (doc.name = value)
				})}
			</h1>
		</div>
		<dl class="tb__class">
			{#each axes as axis (axis.label)}
				<div>
					<dt>{axis.label}</dt>
					<dd>
						{#if pickValue}{@render pickValue({
								kind: axis.kind,
								key: axis.kind,
								label: axis.label,
								tone: 'ink',
								value: axis.value,
								set: (value) => (doc.strategicClassification[axis.kind] = value)
							})}{:else}{axis.value ?? '—'}{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</header>

	<div class="grid">
		<section class="panel area-description">
			<h2 class="panel__label">Description</h2>
			<div class="panel__body">
				{#if field || doc.description}
					<p class="prose">
						{@render text({
							value: doc.description,
							label: 'Description',
							placeholder:
								'What does this context exist to do? A few sentences in business language.',
							multiline: true,
							set: (value) => (doc.description = value)
						})}
					</p>
				{/if}
			</div>
		</section>

		<section class="panel area-roles">
			<h2 class="panel__label">Domain roles</h2>
			<div class="panel__body">
				{#if doc.domainRoles.length > 0}
					<ul class="roles">
						{#each doc.domainRoles as role, index (role.id)}
							<li class="role">
								{role.name}{@render removeItem?.({
									label: `Remove trait ${role.name}`.trim(),
									type: 'Trait',
									remove: () => doc.domainRoles.splice(index, 1)
								})}
							</li>
						{/each}
					</ul>
				{/if}
				{@render addTrait?.({
					...ghostFace(
						doc.domainRoles.length,
						'+ trait',
						'+ trait — how does this context behave?'
					),
					selected: doc.domainRoles.map((role) => role.name),
					toggle: (name) => {
						const index = doc.domainRoles.findIndex((role) => role.name === name);
						if (index >= 0) doc.domainRoles.splice(index, 1);
						else doc.domainRoles.push({ id: newId(), name });
					}
				})}
			</div>
		</section>

		{@render communication(
			'Inbound communication',
			doc.inboundCommunication,
			'area-inbound',
			'+ collaborator — who sends this context commands, queries or events?'
		)}

		<section class="panel panel--lang area-language">
			<h2 class="panel__label">Ubiquitous language</h2>
			<div class="panel__body">
				{#if doc.ubiquitousLanguage.length > 0}
					<dl class="terms">
						{#each doc.ubiquitousLanguage as entry, index (entry.id)}
							<div class="terms__row">
								<dt>
									{@render text({
										value: entry.term,
										label: 'Term',
										placeholder: 'Term',
										set: (value) => (entry.term = value)
									})}{@render removeItem?.({
										label: `Remove term ${entry.term}`.trim(),
										type: 'Term',
										remove: () => doc.ubiquitousLanguage.splice(index, 1)
									})}
								</dt>
								{#if field || entry.definition}
									<dd>
										{@render text({
											value: entry.definition ?? '',
											label: 'Definition',
											placeholder: 'What it means here',
											multiline: true,
											set: (value) => (entry.definition = value)
										})}
									</dd>
								{/if}
							</div>
						{/each}
					</dl>
				{/if}
				{@render addItem?.({
					...ghostFace(
						doc.ubiquitousLanguage.length,
						'+ term',
						'+ term — which words mean something precise here?'
					),
					focusField: 'Term',
					add: () => doc.ubiquitousLanguage.push({ id: newId(), term: '' })
				})}
			</div>
		</section>

		<section class="panel panel--decisions area-decisions">
			<h2 class="panel__label">Business decisions</h2>
			<div class="panel__body">
				{#if doc.businessDecisions.length > 0}
					<ul class="stack stack--policy">
						{#each doc.businessDecisions as decision, index (decision.id)}
							<li>
								<b
									>{@render text({
										value: decision.name,
										label: 'Decision',
										placeholder: 'Rule',
										set: (value) => (decision.name = value)
									})}</b
								>
								{#if field || decision.description}<span class="stack__detail"
										>{@render text({
											value: decision.description ?? '',
											label: 'Decision description',
											placeholder: 'detail',
											multiline: true,
											set: (value) => (decision.description = value)
										})}</span
									>{/if}
								{@render removeItem?.({
									label: `Remove decision ${decision.name}`.trim(),
									type: 'Decision',
									remove: () => doc.businessDecisions.splice(index, 1)
								})}
							</li>
						{/each}
					</ul>
				{/if}
				{@render addItem?.({
					...ghostFace(
						doc.businessDecisions.length,
						'+ decision',
						'+ decision — which rules does this context enforce?'
					),
					focusField: 'Decision',
					add: () => doc.businessDecisions.push({ id: newId(), name: '' })
				})}
			</div>
		</section>

		{@render communication(
			'Outbound communication',
			doc.outboundCommunication,
			'area-outbound',
			'+ collaborator — who consumes what this context emits?'
		)}

		{@render stickies(
			'Assumptions',
			'Assumption',
			'+ assumption',
			'+ assumption — what are you taking to be true?',
			doc.assumptions,
			'area-assumptions',
			false
		)}
		{@render stickies(
			'Verification metrics',
			'Verification metric',
			'+ metric',
			'+ metric — what would verify this design?',
			doc.verificationMetrics,
			'area-metrics',
			false
		)}
		{@render stickies(
			'Open questions',
			'Open question',
			'+ question',
			"+ question — what's still unresolved?",
			doc.openQuestions,
			'area-questions',
			true
		)}
	</div>

	<footer class="foot">
		<ul class="key" data-legend>
			{#each LEGEND as entry (entry.meaning)}
				<li><span class="key__swatch" data-meaning={entry.meaning} aria-hidden="true"></span>{entry.label}</li>
			{/each}
		</ul>
		<p class="note">
			Based on the <a href={REPO_URL}>Bounded Context Canvas by the ddd-crew</a> · <a
				href={LICENSE_URL}>CC BY 4.0</a
			>
		</p>
	</footer>
</article>

<style>
	.quiet-sheet {
		--gap: 18px;
		font-family: var(--font-serif);
		color: var(--color-ink);
		line-height: 1.5;
	}

	/* ---- title block (SPEC §5): ink block, eyebrow, name, classification ---- */
	.tb {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--gap) 2.5rem;
		margin-bottom: var(--gap);
		padding: 1.5rem 1.7rem;
		border-radius: 6px;
		background: var(--color-ink);
		color: var(--color-sheet);
	}
	.tb__id {
		flex: 1 1 320px;
		min-width: 0;
	}
	.tb__eyebrow {
		margin: 0 0 0.55rem;
		font-family: var(--font-sans);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		opacity: 0.6;
	}
	.tb__name {
		margin: 0;
		font-family: var(--font-sans);
		font-weight: 700;
		font-size: 2.4rem;
		line-height: 1.1;
		letter-spacing: 0.01em;
		min-height: 1.1em;
	}
	.tb__class {
		display: flex;
		gap: 2.2rem;
		margin: 0;
	}
	.tb__class dt {
		margin: 0 0 0.25rem;
		font-family: var(--font-sans);
		font-size: 0.57rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		opacity: 0.6;
	}
	.tb__class dd {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}

	/* ---- the V5 canonical 12-column grid (SPEC §5) ---- */
	.grid {
		display: grid;
		gap: var(--gap);
		grid-template-columns: repeat(12, 1fr);
		grid-template-areas:
			'description description description description description description description roles roles roles roles roles'
			'inbound inbound inbound inbound language language language language outbound outbound outbound outbound'
			'inbound inbound inbound inbound decisions decisions decisions decisions outbound outbound outbound outbound'
			'assumptions assumptions assumptions assumptions metrics metrics metrics metrics questions questions questions questions';
	}
	.area-description {
		grid-area: description;
	}
	.area-roles {
		grid-area: roles;
	}
	.area-inbound {
		grid-area: inbound;
	}
	.area-language {
		grid-area: language;
	}
	.area-decisions {
		grid-area: decisions;
	}
	.area-outbound {
		grid-area: outbound;
	}
	.area-assumptions {
		grid-area: assumptions;
	}
	.area-metrics {
		grid-area: metrics;
	}
	.area-questions {
		grid-area: questions;
	}

	/* ---- section sheets ---- */
	.panel {
		min-width: 0;
		padding: 1.35rem;
		background: var(--color-sheet);
		border: 1px solid var(--color-line);
		border-radius: 5px;
		box-shadow: 0 1px 2px rgb(26 30 32 / 0.04);
		/* Small-caps label underline: section hue, neutral where none applies. */
		--label-hue: var(--color-ink-faint);
	}
	.panel--collab {
		--label-hue: var(--color-collaborator-ink);
	}
	.panel--lang {
		--label-hue: var(--color-term-ink);
	}
	.panel--decisions {
		--label-hue: var(--color-policy-ink);
	}
	.panel--hotspot {
		--label-hue: var(--color-hotspot-ink);
	}
	.panel__label {
		display: inline-block;
		margin: 0;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--label-hue);
		font-family: var(--font-sans);
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.17em;
		text-transform: uppercase;
	}
	.panel__body {
		margin-top: 1rem;
	}

	.prose {
		margin: 0;
		font-size: 1rem;
		line-height: 1.55;
	}

	/* ---- domain roles ---- */
	.roles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.role {
		padding: 0.22rem 0.68rem;
		border: 1px solid var(--color-ink);
		border-radius: 999px;
		font-family: var(--font-sans);
		font-size: 0.74rem;
		font-weight: 600;
	}
	/* File values are lowercase prose; the sheet displays them sentence-case. */
	.role::first-letter {
		text-transform: uppercase;
	}

	/* ---- communication lanes ---- */
	.lanes {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.lane + .lane {
		margin-top: 1.05rem;
		padding-top: 1.05rem;
		border-top: 1px solid var(--color-line);
	}
	.lane__head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.45rem;
	}
	.lane__who {
		margin: 0;
		padding-bottom: 0.1rem;
		border-bottom: 2px solid var(--color-collaborator);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-collaborator-ink);
	}
	.lane__rel {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.06em;
		white-space: nowrap;
		color: var(--color-ink-soft);
	}
	.msgs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.55rem 0 0;
		padding: 0;
		list-style: none;
	}
	/* One meaning→(fill, edge) mapping shared by chips and legend swatches. */
	[data-meaning='command'] {
		--fill: var(--color-command);
		--edge: var(--color-command-ink);
	}
	[data-meaning='query'] {
		--fill: var(--color-query);
		--edge: var(--color-query-ink);
	}
	[data-meaning='event'] {
		--fill: var(--color-event);
		--edge: var(--color-event-ink);
	}
	[data-meaning='policy'] {
		--fill: var(--color-policy);
		--edge: var(--color-policy-ink);
	}
	[data-meaning='collaborator'] {
		--fill: var(--color-collaborator);
		--edge: var(--color-collaborator-ink);
	}
	[data-meaning='hotspot'] {
		--fill: var(--color-hotspot);
		--edge: var(--color-hotspot-ink);
	}
	.msg {
		padding: 0.28rem 0.55rem;
		background: var(--fill);
		border: 1px solid var(--edge);
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.73rem;
		line-height: 1.25;
	}
	.msg__glyph {
		margin-right: 0.42em;
		font-size: 0.7em;
		vertical-align: 0.08em;
	}
	.msg[data-meaning='query'] .msg__glyph {
		font-weight: 700;
	}
	/* Message descriptions render as visible text: the prototype's title
	   tooltip is pointer-only and print-invisible, which fails the artifact's
	   AA bar (SPEC §12 bans exactly that pattern for relationship values). */
	.msg__desc {
		display: block;
		margin-top: 0.1rem;
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 0.78rem;
	}

	/* ---- ubiquitous language ---- */
	.terms {
		margin: 0;
	}
	.terms__row + .terms__row {
		margin-top: 0.8rem;
	}
	.terms dt {
		display: inline-block;
		padding: 0 0.15rem;
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: 500;
		/* Highlighter stroke under the mono term. */
		background: linear-gradient(
			transparent 45%,
			var(--color-term) 45%,
			var(--color-term) 92%,
			transparent 92%
		);
	}
	.terms dd {
		margin: 0.15rem 0 0;
		font-size: 0.9rem;
		line-height: 1.45;
		color: var(--color-ink-soft);
	}

	/* ---- decisions / assumptions / questions ---- */
	.stack {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.stack li {
		position: relative;
		padding-left: 1.15rem;
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.stack li + li {
		margin-top: 0.65rem;
	}
	.stack li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.48em;
		width: 7px;
		height: 7px;
		border-radius: 2px;
		background: var(--color-ink-faint);
	}
	.stack--policy li::before {
		background: var(--color-policy);
		border: 1px solid var(--color-policy-ink);
	}
	.stack--hotspot li::before {
		background: var(--color-hotspot);
		border: 1px solid var(--color-hotspot-ink);
		transform: rotate(14deg);
	}
	.stack b {
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.stack__detail {
		color: var(--color-ink-soft);
	}

	/* ---- footer: legend + attribution (SPEC §10), inside the capture region ---- */
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem 2rem;
		margin-top: var(--gap);
		padding-top: 1rem;
		border-top: 1px solid var(--color-line);
	}
	.key {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.45rem 1.05rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.key li {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--color-ink-soft);
	}
	.key__swatch {
		display: inline-block;
		width: 10px;
		height: 10px;
		background: var(--fill);
		border: 1px solid var(--edge);
		border-radius: 3px;
	}
	/* The §10 one-line legend separators — decorative, hidden from AT. */
	.key li:not(:last-child)::after {
		content: '·' / '';
		margin-left: 0.7rem;
		color: var(--color-ink-faint);
	}
	.note {
		margin: 0;
		font-size: 0.74rem;
		color: var(--color-ink-soft);
	}
	.note a {
		color: inherit;
	}
</style>
