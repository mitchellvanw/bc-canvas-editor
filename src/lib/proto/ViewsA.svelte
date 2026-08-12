<script lang="ts">
	/**
	 * PROTOTYPE — variant A: EYEBROW TABS. The tabs ride the title block's own
	 * eyebrow line, in the spaced-caps idiom that already exists there. The ink
	 * lip persists across all three Views — it is the sheet's top edge, and it
	 * is the one constant. In Sheet view it merges into the title block (the
	 * sheet's own eyebrow is suppressed here and rendered by the lip instead,
	 * which is what the real build would do inside CanvasSheet's header).
	 */
	import EditableSheet from '$lib/editor/EditableSheet.svelte';
	import TextPanels from './TextPanels.svelte';
	import { tablistKeydown, VIEWS, type ViewKey } from './views';

	let { view = $bindable('sheet' as ViewKey), unapplied = $bindable(false) } = $props();
</script>

<div class="proto-a">
<div class="lip" class:lip--sheet={view === 'sheet'}>
	<p class="lip__eyebrow">Bounded&nbsp;Context&nbsp;Canvas&nbsp;·&nbsp;V5</p>
	<div
		class="strip"
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
				{tab.label}{#if tab.key === 'json' && unapplied}<span class="mark" aria-hidden="true">•</span
					><span class="sr">, unapplied changes</span>{/if}
			</button>
		{/each}
	</div>
</div>

<div
	id="panel-{view}"
	role="tabpanel"
	aria-labelledby="tab-{view}"
	tabindex="-1"
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
	.lip {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem 2rem;
		padding: 1.1rem 1.7rem 0.75rem;
		border-radius: 6px 6px 0 0;
		background: var(--color-ink);
		color: var(--color-sheet);
	}
	/* In Sheet view the lip and the title block are one object. */
	.lip--sheet {
		margin-bottom: -1px;
	}
	.lip:not(.lip--sheet) {
		margin-bottom: 14px;
		border-radius: 6px;
		padding-bottom: 1.1rem;
	}
	.lip__eyebrow,
	.tab {
		font-family: var(--font-sans);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.24em;
		text-transform: uppercase;
	}
	.lip__eyebrow {
		margin: 0;
		opacity: 0.6;
	}
	.strip {
		display: flex;
		gap: 1.6rem;
	}
	.tab {
		position: relative;
		padding-bottom: 0.3rem;
		/* Dimmed by colour rather than opacity: an opacity here would drag the
		   unapplied marker down with it, and the marker is at its most useful
		   on the tab you are not looking at. */
		color: rgb(253 253 251 / 0.5);
	}
	.tab:hover {
		color: rgb(253 253 251 / 0.8);
	}
	.tab[aria-selected='true'] {
		color: var(--color-sheet);
	}
	.tab[aria-selected='true']::after {
		content: '';
		position: absolute;
		inset: auto 0 0 0;
		height: 2px;
		background: var(--color-sheet);
	}
	.tab:focus-visible {
		outline: 2px solid var(--color-sheet);
		outline-offset: 3px;
	}
	.mark {
		margin-left: 0.35em;
		color: var(--color-hotspot);
		letter-spacing: 0;
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
	/* The lip owns the eyebrow in this variant; the sheet's own is suppressed
	   and the title block's top corners square off so the two read as one.
	   Scoped under the variant wrapper — a bare :global would leak across the
	   other three, which is exactly what it did the first time. */
	.proto-a :global(.tb__eyebrow) {
		display: none;
	}
	.proto-a :global(.tb) {
		border-radius: 0 0 6px 6px;
	}
</style>
