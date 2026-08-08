<script lang="ts">
	/**
	 * PROTOTYPE variant 3 — no new control: "New canvas" becomes a menu where
	 * a blank sheet is one starting point and the examples are four more.
	 */
	import { EXAMPLES, type ExampleEntry } from './roster';

	let {
		newCanvas,
		openExample
	}: { newCanvas: () => void; openExample: (entry: ExampleEntry) => void } = $props();

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
		New canvas
	</button>
	{#if open}
		<div
			role="menu"
			class="absolute right-0 z-10 mt-1 w-80 rounded-[6px] border border-line bg-sheet py-1 shadow-md"
		>
			<button
				type="button"
				role="menuitem"
				class="block w-full px-4 py-2 text-left text-sm font-medium hover:bg-paper focus:bg-paper focus:outline-none"
				onclick={() => {
					open = false;
					newCanvas();
				}}
				onkeydown={closeOnEscape}
			>
				Blank canvas
			</button>
			<hr class="my-1 border-line" />
			<div role="group" aria-label="Examples">
				<div
					aria-hidden="true"
					class="px-4 pt-1 pb-0.5 text-xs font-bold tracking-wide text-ink-soft uppercase"
				>
					Examples
				</div>
				{#each EXAMPLES as entry (entry.name)}
					<button
						type="button"
						role="menuitem"
						class="block w-full px-4 py-2 text-left hover:bg-paper focus:bg-paper focus:outline-none"
						onclick={() => {
							open = false;
							openExample(entry);
						}}
						onkeydown={closeOnEscape}
					>
						<span class="block text-sm font-medium">{entry.name}</span>
						<span class="block text-xs leading-snug text-ink-soft">{entry.description}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
