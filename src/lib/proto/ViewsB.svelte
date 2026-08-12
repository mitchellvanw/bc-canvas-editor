<script lang="ts">
	/**
	 * PROTOTYPE — variant B: FOLDER TABS. Tabs cut from the paper, rising out
	 * of the top edge of whatever is below them. The honest consequence of the
	 * folder metaphor: the active tab takes the colour of its own panel — ink
	 * when the Sheet's title block is below it, sheet-white when a text panel
	 * is — so the tab and its panel are literally one piece of card.
	 */
	import EditableSheet from '$lib/editor/EditableSheet.svelte';
	import TextPanels from './TextPanels.svelte';
	import { tablistKeydown, VIEWS, type ViewKey } from './views';

	let { view = $bindable('sheet' as ViewKey), unapplied = $bindable(false) } = $props();
</script>

<div class="proto-b">
<div
	class="strip"
	class:strip--ink={view === 'sheet'}
	role="tablist"
	aria-label="Views"
>
	{#each VIEWS as tab (tab.key)}
		<button
			type="button"
			role="tab"
			id="tab-{tab.key}"
			class="tab"
			aria-selected={view === tab.key}
			aria-controls="panel-{tab.key}"
			tabindex={view === tab.key ? 0 : -1}
			onclick={() => (view = tab.key)}
			onkeydown={(event) => tablistKeydown(event, view, (key) => (view = key))}
		>
			{#if tab.key === 'json' && unapplied}<span class="mark" aria-hidden="true">•</span><span
					class="sr">Unapplied changes, </span
				>{/if}{tab.label}
		</button>
	{/each}
</div>

<div
	id="panel-{view}"
	role="tabpanel"
	aria-labelledby="tab-{view}"
	tabindex="-1"
	class="panel"
	class:panel--text={view !== 'sheet'}
>
	{#if view === 'sheet'}
		<EditableSheet />
	{:else}
		<TextPanels {view} bind:unapplied />
	{/if}
</div>
</div>

<style>
	.strip {
		display: flex;
		align-items: flex-end;
		gap: 3px;
		padding-left: 1.1rem;
	}
	.tab {
		position: relative;
		z-index: 1;
		margin-bottom: -1px;
		padding: 0.42rem 1.05rem 0.5rem;
		border: 1px solid var(--color-line);
		border-bottom: 0;
		border-radius: 5px 5px 0 0;
		background: color-mix(in srgb, var(--color-sheet) 55%, transparent);
		color: var(--color-ink-soft);
		font-family: var(--font-sans);
		font-size: 0.78rem;
		font-weight: 500;
	}
	.tab:hover {
		background: var(--color-sheet);
		color: var(--color-ink);
	}
	/* The active tab is the same card as its panel: white above a text panel… */
	.tab[aria-selected='true'] {
		padding-bottom: 0.62rem;
		background: var(--color-sheet);
		color: var(--color-ink);
		font-weight: 600;
	}
	/* …and ink above the Sheet, where the title block is what it joins. */
	.strip--ink .tab[aria-selected='true'] {
		border-color: var(--color-ink);
		background: var(--color-ink);
		color: var(--color-sheet);
	}
	.tab:focus-visible {
		outline: 2px solid var(--color-ink);
		outline-offset: 2px;
	}
	.strip--ink .tab[aria-selected='true']:focus-visible {
		outline-color: var(--color-ink-soft);
	}
	.mark {
		margin-right: 0.4em;
		font-size: 0.9em;
		color: var(--color-hotspot-ink);
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.panel--text {
		padding-top: 0;
	}
	/* The title block is the folder body in Sheet view: its top edge squares
	   off so the active ink tab is continuous with it. Scoped under the
	   variant wrapper so it cannot reach the other three. */
	.proto-b :global(.tb) {
		border-radius: 0 0 6px 6px;
	}
</style>
