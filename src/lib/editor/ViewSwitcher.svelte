<script lang="ts">
	/**
	 * The View switcher (SPEC §5): a segmented pill in the gutter band above the
	 * sheet, at the sheet's own left edge. Winner of the view-switcher prototype
	 * (`wayfinder/tickets/042-view-switcher-prototype.md`, variant C on branch
	 * `prototype/view-switcher`); the decisive property is that the strip is a
	 * *sibling* of the sheet, so `CanvasSheet` — shared with the offscreen mount
	 * and the PNG capture region — grows no switcher seam. It renders in the
	 * editor only, for the same reason the responsive tiers are inert in an
	 * artifact: affordances never leak into a serialized mount (§9).
	 *
	 * The pill is plainly the chrome's family (§6 known accepted risks). Two
	 * softenings that don't touch the model: it rests unfilled on the paper and
	 * fills sheet on hover — the inverse of a chrome button, which rests sheet
	 * and darkens to paper — and it sits a further step down from the chrome
	 * band. The focus ring is inset, since an outset §8.4 ring breaks the
	 * pill's edge.
	 *
	 * The unapplied marker rides the JSON segment: a hotspot-pink dot with the
	 * fact in the accessible name. It is dimmed by colour and never by opacity —
	 * an inherited opacity would make it faintest exactly when it has something
	 * to say.
	 */
	import { jsonBuffer } from './json-buffer.svelte';
	import { tablistKeydown, VIEWS, type ViewKey } from './views';

	let { view = $bindable('sheet') }: { view: ViewKey } = $props();
</script>

<div class="bar">
	<div class="seg" role="tablist" aria-label="Views">
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
				{tab.label}{#if tab.key === 'json' && jsonBuffer.unapplied}<span
						class="mark"
						aria-hidden="true">•</span
					><span class="sr-only">, unapplied changes</span>{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.bar {
		display: flex;
		padding-top: 0.5rem;
		padding-bottom: 14px;
	}
	.seg {
		display: flex;
		overflow: hidden;
		border: 1px solid var(--color-line);
		border-radius: 4px;
	}
	.tab {
		padding: 0.35rem 0.95rem;
		border-left: 1px solid var(--color-line);
		color: var(--color-ink-soft);
		font-family: var(--font-sans);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
	}
	.tab:first-child {
		border-left: 0;
	}
	.tab:hover {
		background: var(--color-sheet);
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
	.tab[aria-selected='true']:focus-visible {
		outline-color: var(--color-sheet);
	}
	.mark {
		margin-left: 0.35em;
		color: var(--color-hotspot);
	}
</style>
