<script lang="ts">
	/**
	 * The live sheet (SPEC §6): the shared read-only CanvasSheet with its
	 * editing seams filled in. The `field` seam makes every free-text slot
	 * contenteditable in place; the structural seams (ticket 06) hang ghost
	 * adds on every repeating section, a × on every removable item, and a ⠿
	 * grip on every lane — all materializing on approach, zero chrome at rest.
	 * A message ghost first opens the mini type popover (▶ command / ? query /
	 * ◆ event), then the new chip's name is focused for immediate typing.
	 * Chips drag-reorder within their lane and lanes within their section via
	 * the delegated dragReorder wrapper. Every action — field blur, add,
	 * remove, reorder — is exactly one commit feeding autosave. Pickers are
	 * ticket 07, the full placeholder teaching copy ticket 10.
	 */
	import { tick } from 'svelte';
	import { moveItem, type MessageType } from '$lib/model/canvas';
	import CanvasSheet, { GLYPHS } from '$lib/sheet/CanvasSheet.svelte';
	import type { AddSlot, MessageAddSlot, RemoveSlot } from '$lib/sheet/structure-slots';
	import type { TextSlot } from '$lib/sheet/text-slot';
	import { canvas } from './document.svelte';
	import { dragReorder } from './drag';
	import { editableText } from './editable';

	// The type popover's options, in SPEC §6 order; glyphs come from the sheet.
	const TYPES: MessageType[] = ['command', 'query', 'event'];

	/** The lane whose message-type popover is open, if any. */
	let typePopover: string | null = $state(null);

	/** Focus the last field with this identity under `root` — adds append. */
	function focusLast(root: Element | null, label: string) {
		const fields = root?.querySelectorAll<HTMLElement>(`[contenteditable][aria-label="${label}"]`);
		fields?.[fields.length - 1]?.focus();
	}

	async function addAndFocus(ghostEl: HTMLElement, slot: AddSlot) {
		const panel = ghostEl.closest('.panel');
		canvas.commit(() => slot.add());
		await tick();
		focusLast(panel, slot.focusField);
	}

	async function addMessageOfType(optionEl: HTMLElement, slot: MessageAddSlot, type: MessageType) {
		const lane = optionEl.closest('.lane');
		typePopover = null;
		canvas.commit(() => slot.add(type));
		await tick();
		focusLast(lane, 'Message name');
	}

	/**
	 * Map a dropped `.lanes`/`.msgs` list element back to its model list —
	 * render order is model order, so element indexes are model indexes.
	 */
	function modelList(listEl: HTMLElement): unknown[] | null {
		const lanes = listEl.closest('.area-inbound')
			? canvas.doc.inboundCommunication
			: listEl.closest('.area-outbound')
				? canvas.doc.outboundCommunication
				: null;
		if (!lanes) return null;
		if (listEl.classList.contains('lanes')) return lanes;
		const laneEl = listEl.closest('.lane');
		if (!laneEl?.parentElement) return null;
		const laneIndex = [...laneEl.parentElement.children].indexOf(laneEl);
		return lanes[laneIndex]?.messages ?? null;
	}

	function onReorder(listEl: HTMLElement, from: number, to: number) {
		const list = modelList(listEl);
		if (list) canvas.commit(() => moveItem(list, from, to));
	}
</script>

<svelte:window
	onpointerdown={(event) => {
		if (typePopover && !(event.target instanceof Element && event.target.closest('.addmsg')))
			typePopover = null;
	}}
	onkeydown={(event) => {
		if (event.key === 'Escape') typePopover = null;
	}}
/>

<div class="editable" use:dragReorder={{ onReorder }}>
	<CanvasSheet doc={canvas.doc}>
		{#snippet field(slot: TextSlot)}
			<span
				class="field"
				class:field--block={slot.multiline}
				class:field--ink={slot.tone === 'ink'}
				aria-label={slot.label}
				aria-placeholder={slot.placeholder}
				data-placeholder={slot.placeholder}
				use:editableText={{
					value: slot.value,
					multiline: slot.multiline,
					onCommit: (value) => canvas.commit(() => slot.set(value))
				}}
			></span>
		{/snippet}

		{#snippet removeItem(slot: RemoveSlot)}
			<button
				type="button"
				class="x"
				aria-label={slot.label}
				onclick={() => canvas.commit(() => slot.remove())}>×</button
			>
		{/snippet}

		{#snippet addItem(slot: AddSlot)}
			<button
				type="button"
				class="ghost"
				onclick={(event) => addAndFocus(event.currentTarget, slot)}>{slot.label}</button
			>
		{/snippet}

		{#snippet addMessage(slot: MessageAddSlot)}
			<span class="addmsg">
				<button
					type="button"
					class="ghost ghost--msg"
					aria-label="Add message"
					aria-expanded={typePopover === slot.laneId}
					onclick={() => (typePopover = typePopover === slot.laneId ? null : slot.laneId)}
					>+</button
				>
				{#if typePopover === slot.laneId}
					<div class="typepop">
						{#each TYPES as type (type)}
							<button
								type="button"
								class="typepop__option"
								data-meaning={type}
								aria-label={type}
								onclick={(event) => addMessageOfType(event.currentTarget, slot, type)}
							>
								<span aria-hidden="true">{GLYPHS[type]}</span> {type}
							</button>
						{/each}
					</div>
				{/if}
			</span>
		{/snippet}

		{#snippet grip()}
			<button type="button" class="grip" data-grip tabindex="-1" aria-hidden="true">⠿</button>
		{/snippet}
	</CanvasSheet>
</div>

<style>
	/* Fields hug their text so panel whitespace never opens a caret — the
	   stray-click softening SPEC §13 asks for; only prose blocks span their
	   column. */
	.field {
		display: inline-block;
		min-width: 1ch;
		margin: 0 -0.15rem;
		padding: 0 0.15rem;
		border-radius: 3px;
		outline: none;
	}
	.field--block {
		display: block;
		min-height: 1lh;
	}

	/* Faint halo on hover, hairline outline on focus (SPEC §6) — nothing at rest. */
	.field:hover {
		background: rgb(26 30 32 / 0.055);
	}
	.field:focus {
		outline: 1px solid var(--color-ink-faint);
	}
	.field--ink:hover {
		background: rgb(253 253 251 / 0.12);
	}
	.field--ink:focus {
		outline-color: rgb(253 253 251 / 0.4);
	}

	/* An empty optional detail (message description, term definition, decision
	   description) would put a blank line on every row at rest; like the other
	   affordances it materializes on approach (SPEC §6) — revealed while its
	   row is hovered or holds focus, kept while the field itself is focused.
	   Keyboard path per the §8.2 reveal pattern: focusing the row's name field
	   reveals the detail, so the next Tab lands in it (display:none never hides
	   it from a focus already inside the row). */
	:global(
		:is(.msg, .terms__row, .stack li):not(:hover, :focus-within)
			:is(.msg__desc, dd, .stack__detail):has(> .field:empty)
	) {
		display: none;
	}

	/* ---- structural chrome (ticket 06): materializes on approach ---- */

	/* All of it real buttons kept in the layout (opacity, not display) so a
	   revealed control never reflows the sheet and stays focusable (SPEC §8.2);
	   the grip alone is pointer-only — its keyboard path is Alt+arrows. */
	.x,
	.ghost,
	.grip {
		opacity: 0;
		transition: opacity 120ms ease;
		cursor: pointer;
	}
	@media (prefers-reduced-motion: reduce) {
		.x,
		.ghost,
		.grip {
			transition: none;
		}
	}

	/* Hovering a panel fades in its ghost adds (SPEC §6); focus keeps parity,
	   and an open type popover pins its ghost. */
	:global(.panel:hover) .ghost,
	:global(.panel:focus-within) .ghost,
	.ghost:focus-visible,
	.ghost[aria-expanded='true'] {
		opacity: 1;
	}

	/* Hovering an item reveals its ×; a lane's own × lives in its head, so a
	   hovered chip never lights up its lane's remove. (Reveal rules live fully
	   inside :global() — the snippets render across the CanvasSheet boundary,
	   where Svelte's scoped-CSS analysis would prune them as unused.) */
	.editable :global(:is(.msg, .role):hover > .x),
	.editable :global(:is(.msg, .role):focus-within > .x),
	.editable :global(.terms__row:hover dt > .x),
	.editable :global(.terms__row:focus-within dt > .x),
	.editable :global(.stack li:hover > .x),
	.editable :global(.stack li:focus-within > .x),
	.editable :global(.lane:hover .lane__head > .x),
	.editable :global(.lane:focus-within .lane__head > .x),
	.x:focus-visible {
		opacity: 1;
	}

	/* Hovering a lane reveals its ⠿ grip. */
	.editable :global(.lane:hover .lane__head > .grip) {
		opacity: 1;
	}

	.x {
		border: 0;
		padding: 0 0.2rem;
		background: none;
		color: var(--color-ink-soft);
		font-family: var(--font-sans);
		font-size: 0.85em;
		line-height: 1;
	}

	/* On chips the × rides the corner as a badge in the chip's own colors —
	   inline it would widen every chip against the artifact render. */
	.editable :global(:is(.msg, .role)) {
		position: relative;
	}
	.editable :global(:is(.msg, .role) > .x) {
		position: absolute;
		top: -0.42rem;
		right: -0.42rem;
		display: grid;
		place-items: center;
		width: 1.05rem;
		height: 1.05rem;
		padding: 0;
		border: 1px solid var(--edge, var(--color-line));
		border-radius: 999px;
		background: var(--fill, var(--color-sheet));
		color: var(--edge, var(--color-ink-soft));
		font-size: 0.72rem;
	}

	.ghost {
		display: inline-block;
		margin-top: 0.55rem;
		padding: 0.22rem 0.6rem;
		border: 1px dashed var(--color-ink-faint);
		border-radius: 4px;
		background: none;
		color: var(--color-ink-soft);
		font-family: var(--font-sans);
		font-size: 0.74rem;
	}
	.editable :global(.panel__body > .ghost:first-child) {
		margin-top: 0;
	}

	/* The lane grip sits in the panel's padding gutter — no layout shift. */
	.editable :global(.lane__head) {
		position: relative;
	}
	.grip {
		position: absolute;
		top: 0.1rem;
		left: -1.05rem;
		border: 0;
		padding: 0 0.15rem;
		background: none;
		color: var(--color-ink-faint);
		font-size: 0.72rem;
		line-height: 1;
		cursor: grab;
		touch-action: none;
	}

	/* ---- the message-type mini popover (SPEC §6) ---- */
	.addmsg {
		position: relative;
		display: block;
		margin-top: 0.5rem;
	}
	.typepop {
		position: absolute;
		z-index: 10;
		top: calc(100% + 4px);
		left: 0;
		display: flex;
		gap: 0.3rem;
		padding: 0.35rem;
		background: var(--color-sheet);
		border: 1px solid var(--color-line);
		border-radius: 5px;
		box-shadow: 0 4px 14px rgb(26 30 32 / 0.14);
	}
	.typepop__option {
		padding: 0.24rem 0.5rem;
		background: var(--fill);
		border: 1px solid var(--edge);
		border-radius: 4px;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		cursor: pointer;
	}

	/* ---- drag feedback (classes applied by dragReorder) ---- */
	.editable:global(.dragging) {
		user-select: none;
	}
	.editable :global(.drag-src) {
		opacity: 0.35;
	}
	.editable :global(.msg.drop-before) {
		box-shadow: -3px 0 0 0 var(--color-ink);
	}
	.editable :global(.msg.drop-after) {
		box-shadow: 3px 0 0 0 var(--color-ink);
	}
	.editable :global(.lane.drop-before) {
		box-shadow: 0 -2px 0 0 var(--color-ink);
	}
	.editable :global(.lane.drop-after) {
		box-shadow: 0 2px 0 0 var(--color-ink);
	}
</style>
