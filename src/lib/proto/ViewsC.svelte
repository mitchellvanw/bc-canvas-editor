<script lang="ts">
	/**
	 * PROTOTYPE — variant C: GUTTER SEGMENTED CONTROL. A control, plainly: the
	 * chrome's own button idiom (4px radius, line border, sheet fill) grouped
	 * into one segmented pill and set into the gutter above the sheet. Drawn
	 * precisely because it is the direction most at risk of reading as a fourth
	 * file verb — left-aligned and segmented is the whole defence, and the
	 * point is to see whether that defence holds with the chrome in frame.
	 * The title block is untouched: it belongs to the Sheet View alone.
	 */
	import EditableSheet from '$lib/editor/EditableSheet.svelte';
	import TextPanels from './TextPanels.svelte';
	import { tablistKeydown, VIEWS, type ViewKey } from './views';

	let { view = $bindable('sheet' as ViewKey), unapplied = $bindable(false) } = $props();
</script>

<div class="bar">
	<div
		class="seg"
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

<div id="panel-{view}" role="tabpanel" aria-labelledby="tab-{view}" tabindex="-1">
	{#if view === 'sheet'}
		<EditableSheet />
	{:else}
		<TextPanels {view} bind:unapplied />
	{/if}
</div>

<style>
	.bar {
		display: flex;
		padding-bottom: 14px;
	}
	.seg {
		display: flex;
		overflow: hidden;
		border: 1px solid var(--color-line);
		border-radius: 4px;
		background: var(--color-sheet);
	}
	.tab {
		padding: 0.35rem 0.95rem;
		border-left: 1px solid var(--color-line);
		color: var(--color-ink-soft);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 500;
	}
	.tab:first-child {
		border-left: 0;
	}
	.tab:hover {
		background: var(--color-paper);
		color: var(--color-ink);
	}
	.tab[aria-selected='true'] {
		background: var(--color-ink);
		color: var(--color-sheet);
		font-weight: 600;
	}
	.tab:focus-visible {
		outline: 2px solid var(--color-ink);
		outline-offset: -2px;
	}
	.mark {
		margin-left: 0.35em;
		color: var(--color-hotspot);
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
