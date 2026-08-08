<script lang="ts">
	/**
	 * PROTOTYPE variant 2 — "Examples" opens a small modal in the Reference
	 * dialog's family; the four canvases present as a curated set.
	 */
	import { EXAMPLES, type ExampleEntry } from './roster';

	let { openExample }: { openExample: (entry: ExampleEntry) => void } = $props();

	let open = $state(false);
	let dialogEl = $state<HTMLDialogElement>();
	let invoker = $state<HTMLButtonElement>();

	const chromeButton =
		'rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper';

	function openAsModal(node: HTMLDialogElement) {
		node.showModal();
	}

	// Close first, then hand the entry to the chrome — its confirmation gate
	// (if the sheet has unexported changes) opens as its own modal.
	function choose(entry: ExampleEntry) {
		dialogEl?.close();
		openExample(entry);
	}

	function closed() {
		open = false;
		invoker?.focus();
	}
</script>

<button type="button" class={chromeButton} bind:this={invoker} onclick={() => (open = true)}>
	Examples
</button>

{#if open}
	<dialog
		bind:this={dialogEl}
		use:openAsModal
		onclose={closed}
		aria-labelledby="examples-title"
		class="m-auto w-[26rem] rounded-[6px] border border-line bg-sheet p-6 text-ink shadow-lg backdrop:bg-ink/30"
	>
		<h2 id="examples-title" class="font-bold">Examples</h2>

		<ul class="mt-4 space-y-2">
			{#each EXAMPLES as entry (entry.name)}
				<li>
					<button
						type="button"
						class="w-full rounded-[6px] border border-line px-4 py-2.5 text-left hover:bg-paper"
						onclick={() => choose(entry)}
					>
						<span class="block text-sm font-medium">{entry.name}</span>
						<span class="mt-0.5 block text-sm leading-snug text-ink-soft">{entry.description}</span>
					</button>
				</li>
			{/each}
		</ul>

		<div class="mt-6 flex justify-end">
			<button type="button" class={chromeButton} onclick={() => dialogEl?.close()}>Close</button>
		</div>
	</dialog>
{/if}
