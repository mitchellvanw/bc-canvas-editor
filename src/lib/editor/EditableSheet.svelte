<script lang="ts">
	/**
	 * The live sheet (SPEC §6): the shared read-only CanvasSheet with its
	 * `field` seam filled in, so every free-text slot is contenteditable in
	 * place — modeless, no editing chrome at rest. Each field blur is one
	 * commit feeding autosave. Structural actions are ticket 06, pickers
	 * ticket 07, the full placeholder teaching copy ticket 10.
	 */
	import CanvasSheet from '$lib/sheet/CanvasSheet.svelte';
	import type { TextSlot } from '$lib/sheet/text-slot';
	import { canvas } from './document.svelte';
	import { editableText } from './editable';
</script>

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
</CanvasSheet>

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
</style>
