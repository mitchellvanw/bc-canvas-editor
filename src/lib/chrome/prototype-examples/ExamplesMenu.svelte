<script lang="ts">
	/**
	 * PROTOTYPE variant 1 — "Examples" as a chrome menu, borrowing the Export
	 * menu's grammar exactly. Sits on the input side, right after Import…
	 */
	import { EXAMPLES, type ExampleEntry } from './roster';

	let { openExample }: { openExample: (entry: ExampleEntry) => void } = $props();

	let open = $state(false);
	let button = $state<HTMLButtonElement>();

	const chromeButton =
		'rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper';

	function closeOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
			button?.focus();
		}
	}

	function closeMenu(event: FocusEvent | MouseEvent) {
		const next = 'relatedTarget' in event && event.relatedTarget ? event.relatedTarget : event.target;
		if (!(next instanceof Node) || !button?.parentElement?.contains(next)) {
			open = false;
		}
	}

	function choose(entry: ExampleEntry) {
		open = false;
		openExample(entry);
	}
</script>

<svelte:window onclick={open ? closeMenu : undefined} />

<div class="relative" onfocusout={closeMenu}>
	<button
		type="button"
		class={chromeButton}
		aria-haspopup="menu"
		aria-expanded={open}
		bind:this={button}
		onclick={(event) => {
			event.stopPropagation();
			open = !open;
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape') open = false;
		}}
	>
		Examples
	</button>
	{#if open}
		<div
			role="menu"
			class="absolute right-0 z-10 mt-1 w-80 rounded-[6px] border border-line bg-sheet py-1 shadow-md"
		>
			{#each EXAMPLES as entry (entry.name)}
				<button
					type="button"
					role="menuitem"
					class="block w-full px-4 py-2 text-left hover:bg-paper focus:bg-paper focus:outline-none"
					onclick={() => choose(entry)}
					onkeydown={closeOnEscape}
				>
					<span class="block text-sm font-medium">{entry.name}</span>
					<span class="block text-xs leading-snug text-ink-soft">{entry.description}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
