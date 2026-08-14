<script lang="ts" module>
	import type { CollaboratorKind, MessageType } from '$lib/model/canvas';

	// One uniform chip shape; type is carried by color + glyph (SPEC §5). The
	// sheet is the canonical visual truth, so the editor's type popover imports
	// this map rather than re-encoding it.
	export const GLYPHS: Record<MessageType, string> = { command: '▶', query: '?', event: '◆' };

	/**
	 * The four canonical collaborator kinds as stroke icons — cloud, gear,
	 * monitor, person, per upstream's collaborator-types drawing (SPEC §5) —
	 * keyed in the footer legend. `label` is the spoken meaning (sr-only prefix,
	 * legend entry, the kind picker's value text). Like GLYPHS, the editor
	 * imports this map rather than re-encoding it.
	 */
	export const KIND_META: Record<CollaboratorKind, { label: string; icon: string }> = {
		'bounded-context': {
			label: 'Bounded context',
			icon: '<path d="M4.6 12h6.2a2.6 2.6 0 0 0 .3-5.18A3.65 3.65 0 0 0 4.3 6.9 2.55 2.55 0 0 0 4.6 12Z"/>'
		},
		'external-system': {
			label: 'External system',
			icon: '<circle cx="8" cy="8" r="2.3"/><path d="M8 1.4v1.9M8 12.7v1.9M1.4 8h1.9M12.7 8h1.9M3.35 3.35l1.35 1.35M11.3 11.3l1.35 1.35M12.65 3.35 11.3 4.7M4.7 11.3l-1.35 1.35"/>'
		},
		frontend: {
			label: 'Frontend',
			icon: '<rect x="1.9" y="2.9" width="12.2" height="8.3" rx="1.1"/><path d="M6 13.7h4M8 11.2v2.5"/>'
		},
		user: {
			label: 'Direct user interaction',
			icon: '<circle cx="8" cy="5.1" r="2.4"/><path d="M3.3 13.3a4.7 4.7 0 0 1 9.4 0"/>'
		}
	};
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
	 * seams of ticket 07: a PickSlot on every classification axis, lane kind
	 * and lane relationship end, a TraitSlot on the domain-role set. Without
	 * the snippets every slot renders its plain value and no chrome exists.
	 *
	 * Palette pairs are AA-verified by contrast.test.ts; secondary text uses
	 * ink-soft (the prototype's faint gray fails AA and is decorative-only) —
	 * which is also why the relationship pair's set-back side is ink-soft, not
	 * the mockup's ink-faint.
	 */
	import type { Snippet } from 'svelte';
	import { CAUTION_TRAITS } from '$lib/editor/vocab';
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

	// Legend order and wording per SPEC §10; the kind icons and the
	// relationship-pair key follow in the footer markup.
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

	/**
	 * Write one end of the lane's relationship; the pair collapses to absent
	 * when both ends clear, so an untouched lane serializes without the key
	 * (SPEC §3.2). Doc key order is free — the serializer writes theirs first.
	 */
	function setRelationshipEnd(lane: LaneRow, side: 'theirs' | 'ours', value: string | undefined) {
		const next = { ...lane.relationship, [side]: value };
		if (next.theirs === undefined) delete next.theirs;
		if (next.ours === undefined) delete next.ours;
		lane.relationship = next.theirs === undefined && next.ours === undefined ? undefined : next;
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

{#snippet kindIcon(kind: CollaboratorKind, size: 'lane' | 'key')}
	<!-- The namespace is load-bearing off-screen (wayfinder ticket 056 decision 1):
	     inside a committed `.bcc.svg` this markup is XHTML, and an <svg> that does
	     not declare its own namespace inherits XHTML and is not a drawing — the
	     four collaborator-kind glyphs and the footer legend keys silently vanish.
	     In the browser the HTML parser supplies it, so nothing on screen shows
	     what it is for; render.test.ts is where that gets caught. -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class={size === 'lane' ? 'kind__svg' : 'key__svg'}
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		stroke-width={size === 'lane' ? 1.3 : 1.4}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- static icon paths from KIND_META -->
		{@html KIND_META[kind].icon}
	</svg>
{/snippet}

{#snippet stackMarker(tilted: boolean)}
	<!-- The stack markers are inline SVG, not positioned pseudo-elements
	     (wayfinder ticket 063): WebKit's SVG-as-image path paints positioned
	     boxes and stacking contexts unscaled when the committed image displays
	     below natural size, which blanked all four stack panels on GitHub in
	     Safari — so nothing in the sheet may lean on position, opacity or a
	     CSS transform. The hotspot tilt is an SVG-internal rotate, which stays
	     inside the SVG painter and scales. xmlns is load-bearing off-screen,
	     as on the kind icons above. -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="stack__marker"
		viewBox="0 0 7 7"
		aria-hidden="true"
	>
		<rect
			x="0.5"
			y="0.5"
			width="6"
			height="6"
			rx="2"
			transform={tilted ? 'rotate(14 3.5 3.5)' : undefined}
		/>
	</svg>
{/snippet}

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
									{#if pickValue}
										{@render pickValue({
											kind: 'collaboratorKind',
											key: `${lane.id}:kind`,
											label: `Collaborator kind for ${lane.collaborator.name}`.trim(),
											value: lane.collaborator.kind,
											set: (value) =>
												(lane.collaborator.kind = value as CollaboratorKind | undefined)
										})}
									{:else if lane.collaborator.kind}
										<span class="kind" aria-hidden="true"
											>{@render kindIcon(lane.collaborator.kind, 'lane')}</span
										><span class="sr-only">{`${KIND_META[lane.collaborator.kind].label}: `}</span>
									{/if}
									{@render text({
										value: lane.collaborator.name,
										label: 'Collaborator',
										placeholder: 'Collaborator',
										set: (value) => (lane.collaborator.name = value)
									})}
								</h3>
								{@render removeItem?.({
									label: `Remove collaborator ${lane.collaborator.name}`.trim(),
									type: 'Collaborator',
									remove: () => lanes.splice(laneIndex, 1)
								})}
							</div>
							<!-- The two-sided relationship (SPEC §5): collaborator's side
							     first, set back; this context's steps forward. The arrow is
							     reading order across the boundary — never message flow — so
							     it points the same way in both panels. Weight and order say
							     nothing to a screen reader; the sr-only prefixes do. -->
							{#if pickValue}
								<p class="rel" class:rel--unset={lane.relationship === undefined}>
									<span class="rel__theirs">
										{@render pickValue({
											kind: 'relationship',
											key: `${lane.id}:theirs`,
											label: `Their relationship for ${lane.collaborator.name}`.trim(),
											value: lane.relationship?.theirs,
											set: (value) => setRelationshipEnd(lane, 'theirs', value)
										})}
									</span><span class="rel__arrow" aria-hidden="true">→</span><span
										class="rel__ours"
									>
										{@render pickValue({
											kind: 'relationship',
											key: `${lane.id}:ours`,
											label: `Our relationship for ${lane.collaborator.name}`.trim(),
											value: lane.relationship?.ours,
											set: (value) => setRelationshipEnd(lane, 'ours', value)
										})}
									</span>
								</p>
							{:else if lane.relationship}
								<p class="rel">
									{#if lane.relationship.theirs !== undefined}<span class="sr-only"
											>{'Collaborator: '}</span
										><span class="rel__theirs">{lane.relationship.theirs}</span
										>{/if}<span class="rel__arrow" aria-hidden="true">→</span
									>{#if lane.relationship.ours !== undefined}<span class="sr-only"
											>{'this context: '}</span
										><span class="rel__ours">{lane.relationship.ours}</span>{/if}
								</p>
							{/if}
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
				add: () => lanes.push({ id: newId(), collaborator: { name: '' }, messages: [] })
			})}
		</div>
	</section>
{/snippet}

{#snippet languageSection()}
	<section class="panel panel--lang">
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
{/snippet}

{#snippet decisionsSection()}
	<section class="panel panel--decisions">
		<h2 class="panel__label">Business decisions</h2>
		<div class="panel__body">
			{#if doc.businessDecisions.length > 0}
				<ul class="stack stack--policy">
					{#each doc.businessDecisions as decision, index (decision.id)}
						<li>
							{@render stackMarker(false)}<b
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
							{@render stackMarker(hotspot)}{@render text({
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
	</header>

	<div class="grid">
		<section class="panel area-purpose">
			<h2 class="panel__label">Purpose</h2>
			<div class="panel__body">
				{#if field || doc.purpose}
					<p class="prose">
						{@render text({
							value: doc.purpose,
							label: 'Purpose',
							placeholder:
								'What does this context exist to do? A few sentences in business language.',
							multiline: true,
							set: (value) => (doc.purpose = value)
						})}
					</p>
				{/if}
			</div>
		</section>

		<section class="panel area-classification">
			<h2 class="panel__label">Strategic classification</h2>
			<div class="panel__body">
				<dl class="axes">
					{#each axes as axis (axis.label)}
						<div>
							<dt>{axis.label}</dt>
							<dd>
								{#if pickValue}{@render pickValue({
										kind: axis.kind,
										key: axis.kind,
										label: axis.label,
										value: axis.value,
										set: (value) => (doc.strategicClassification[axis.kind] = value)
									})}{:else}{axis.value ?? '—'}{/if}
							</dd>
						</div>
					{/each}
				</dl>
			</div>
		</section>

		<section class="panel area-roles">
			<h2 class="panel__label">Domain roles</h2>
			<div class="panel__body">
				{#if doc.domainRoles.length > 0}
					<ul class="roles">
						{#each doc.domainRoles as role, index (role.id)}
							<li class="role" class:role--caution={CAUTION_TRAITS.has(role.name)}>
								{role.name}{#if CAUTION_TRAITS.has(role.name)}<span
										class="role__caution"
										aria-hidden="true">⚠</span
									><span class="sr-only"> — likely anti-pattern</span>{/if}{@render removeItem?.({
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

		<!-- The canonical template draws these two inside one outer rectangle —
		     layout, not nesting (SPEC §5): a hairline around the pair, and the
		     two stay separate sections with their own h2s. -->
		<div class="centre area-centre">
			{@render languageSection()}
			{@render decisionsSection()}
		</div>

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
			{#each Object.keys(KIND_META) as kind (kind)}
				<li>
					<span class="key__icon"
						>{@render kindIcon(kind as CollaboratorKind, 'key')}</span
					>{KIND_META[kind as CollaboratorKind].label.toLowerCase()}
				</li>
			{/each}
			<li
				><span class="sr-only">{'relationship: '}</span><span class="key__theirs">theirs</span><span
					class="key__arrow"
					aria-hidden="true">→</span
				><span class="key__ours">ours</span></li
			>
		</ul>
		<p class="note">
			Based on the <a href={REPO_URL}>Bounded Context Canvas by the ddd-crew</a> · <a
				href={LICENSE_URL}>CC BY 4.0</a
			>
		</p>
	</footer>
</article>

<style>
	/* The sheet's own screen-reader utility, and the last thing it depended on
	   something outside itself for. Tailwind has an identical `sr-only`, but
	   the headless renderer (wayfinder ticket 050) never runs Tailwind, and a
	   copy in the renderer's preamble would be two definitions of one rule that
	   drift silently and only for screen-reader users. Here, Svelte scopes it
	   to the sheet and returns it on SSR's `head` with everything else, so the
	   sheet is self-contained by construction rather than by a rule someone
	   remembered to copy. */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.quiet-sheet {
		--gap: 18px;
		font-family: var(--font-serif);
		color: var(--color-ink);
		line-height: 1.5;
	}

	/* ---- title block (SPEC §5): ink block, eyebrow, name ---- */
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
		/* Dimmed by colour, never by opacity (wayfinder ticket 063): any opacity
		   below 1 is a stacking context, and WebKit's SVG-as-image path paints
		   stacking contexts unscaled when the committed image displays below
		   natural size — the eyebrow drew full-size on top of the name. The mix
		   is the same blend contrast.test.ts verifies against AA. (This CSS also
		   travels inside XML, so no left angle bracket may appear in it —
		   render.test.ts pins that.) */
		color: color-mix(in srgb, var(--color-sheet) 60%, var(--color-ink));
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

	/* ---- the V5 canonical 12-column grid (SPEC §5): ten panels ---- */
	.grid {
		display: grid;
		gap: var(--gap);
		grid-template-columns: repeat(12, 1fr);
		grid-template-areas:
			'purpose purpose purpose purpose purpose classification classification classification classification roles roles roles'
			'inbound inbound inbound inbound centre centre centre centre outbound outbound outbound outbound'
			'assumptions assumptions assumptions assumptions metrics metrics metrics metrics questions questions questions questions';
	}
	.area-purpose {
		grid-area: purpose;
	}
	.area-classification {
		grid-area: classification;
	}
	.area-roles {
		grid-area: roles;
	}
	.area-inbound {
		grid-area: inbound;
	}
	.area-centre {
		grid-area: centre;
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

	/* ---- strategic classification: the tenth panel ---- */
	/* The title block's own idiom, kept verbatim on the panel: spaced-caps
	   label, mono value, no fill and no box — the finding was about where
	   classification lives, not how it looks. */
	.axes {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		grid-template-rows: auto auto;
		gap: 0.45rem 0.9rem;
		margin: 0;
	}
	/* Subgrid keeps the three sub-labels on one row, so the values share a
	   baseline even when "Business model" wraps. */
	.axes > div {
		display: grid;
		grid-row: span 2;
		grid-template-rows: subgrid;
		align-content: start;
		min-width: 0;
	}
	.axes dt {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.57rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-ink-soft);
	}
	.axes dd {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.35;
		overflow-wrap: break-word;
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
	/* The worksheet flags the trait "(likely anti-pattern)": a caution ring in
	   hotspot ink so an exported PNG carries the warning (pair AA-gated in
	   contrast.test.ts; the wash is the hotspot fill at 8%). */
	.role--caution {
		border-color: var(--color-hotspot-ink);
		color: var(--color-hotspot-ink);
		background: rgb(247 107 163 / 0.08);
	}
	.role__caution {
		margin-left: 0.4em;
		font-family: var(--font-mono);
		font-size: 0.86em;
		font-weight: 400;
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
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
		margin: 0;
		padding-bottom: 0.1rem;
		border-bottom: 2px solid var(--color-collaborator);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-collaborator-ink);
	}
	.kind {
		flex: none;
		align-self: center;
		width: 15px;
		height: 15px;
		color: var(--color-collaborator-ink);
	}
	.kind :global(.kind__svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	/* The two-sided relationship: theirs set back in ink-soft (the sheet's
	   AA-passing secondary text — ink-faint is decorative-only), ours forward
	   in full ink at 500. The pair works without labels because order is fixed
	   and the footer legend keys it. */
	.rel {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.34rem;
		margin: 0.45rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.69rem;
		line-height: 1.4;
	}
	.rel__theirs {
		color: var(--color-ink-soft);
	}
	.rel__arrow {
		color: var(--color-ink-soft);
	}
	.rel__ours {
		color: var(--color-ink);
		font-weight: 500;
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

	/* ---- the shared centre plate (SPEC §5) ---- */
	/* The canonical template's outer rectangle, drawn as ground instead of
	   line: a translucent ink wash at grid-line intensity, so the drafting
	   grid shows through and the region reads as marked paper. */
	.centre {
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		min-width: 0;
		padding: var(--gap);
		background: rgb(26 30 32 / 0.045);
		border-radius: 6px;
	}
	.centre .panel {
		flex: 1 1 auto;
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
		padding-left: 1.15rem;
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.stack li + li {
		margin-top: 0.65rem;
	}
	/* The marker rides the first line box, pulled into the li's padding — see
	   the stackMarker snippet for why it is not a positioned ::before. overflow
	   keeps the tilted hotspot's corners; the stroke is the same-hue ink border
	   the chips carry, self-coloured on the neutral marker. */
	.stack__marker {
		/* Explicit, because the sheet renders inside hosts whose stylesheets
		   reach element selectors — Tailwind's preflight makes every svg
		   display: block, which would put each marker on its own line in the
		   editor while the artifact keeps flowing. Stated here, no host can
		   disagree. */
		display: inline-block;
		width: 7px;
		height: 7px;
		margin-left: -1.15rem;
		margin-right: calc(1.15rem - 7px);
		overflow: visible;
		vertical-align: 0.05em;
	}
	.stack__marker rect {
		fill: var(--color-ink-faint);
		stroke: var(--color-ink-faint);
		stroke-width: 1;
	}
	.stack--policy .stack__marker rect {
		fill: var(--color-policy);
		stroke: var(--color-policy-ink);
	}
	.stack--hotspot .stack__marker rect {
		fill: var(--color-hotspot);
		stroke: var(--color-hotspot-ink);
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
	.key__icon {
		display: inline-block;
		width: 12px;
		height: 12px;
		color: var(--color-collaborator-ink);
	}
	.key__icon :global(.key__svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	/* The relationship-pair key: the same set-back/forward inks the lanes use,
	   so the legend entry is the convention. */
	.key__theirs {
		color: var(--color-ink-soft);
	}
	.key__ours {
		color: var(--color-ink);
		font-weight: 500;
	}
	.key__arrow {
		margin: 0 0.35rem;
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

	/* ---- responsive tiers (SPEC §5) ---- */
	/* Sized by the editor's container, never the viewport: the offscreen
	   artifact mount and the exported HTML declare no container, so every
	   rule here is inert in an export and artifacts keep the fixed desktop
	   grid (§9.2). The artifact's own 760px stack lives in §9.1. Last in
	   the sheet so each tier outranks the base rules it adjusts. */

	/* Trim tier: the canonical grid, tightened — smaller gutters and panel
	   padding buy the twelve columns another ~180px before anything
	   collides, where the old 1080px floor gave up. */
	@container (max-width: 1060px) {
		.quiet-sheet {
			--gap: 14px;
		}
		.panel {
			padding: 1.1rem;
		}
		.tb {
			padding: 1.2rem 1.35rem;
		}
	}

	/* Two-column tier: inbound stays left of outbound, so the lanes keep
	   their in/out reading; the centre pair turns side by side inside its
	   full-width box. */
	@container (max-width: 880px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			grid-template-areas:
				'purpose purpose'
				'classification roles'
				'inbound outbound'
				'centre centre'
				'assumptions metrics'
				'questions questions';
		}
		.centre {
			flex-direction: row;
		}
		.centre .panel {
			flex: 1 1 0;
			min-width: 0;
		}
	}

	/* Stack tier: one column in the artifact's reading order (§9.1). */
	@container (max-width: 620px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas:
				'purpose' 'classification' 'roles' 'inbound' 'centre'
				'outbound' 'assumptions' 'metrics' 'questions';
		}
		.centre {
			flex-direction: column;
		}
		.tb {
			padding: 1rem 1.15rem;
		}
		.tb__name {
			font-size: 1.9rem;
		}
	}
</style>
