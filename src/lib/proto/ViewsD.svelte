<script lang="ts">
	/**
	 * PROTOTYPE — variant D: SECTION-LABEL STRIP. No box and no fill: three
	 * words in the sheet's own section-label idiom — small-caps Archivo with a
	 * short 2px underline — which the sheet already uses eleven times to say
	 * "this label names the thing below it". That is exactly what a tab
	 * asserts, so the switcher borrows the sentence the sheet already speaks.
	 * The quietest of the four; the risk it is drawn to test is whether it is
	 * so quiet nobody finds it. The title block is untouched.
	 */
	import EditableSheet from '$lib/editor/EditableSheet.svelte';
	import TextPanels from './TextPanels.svelte';
	import { tablistKeydown, VIEWS, type ViewKey } from './views';

	let { view = $bindable('sheet' as ViewKey), unapplied = $bindable(false) } = $props();
</script>

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
			<span class="tab__word">{tab.label}</span>{#if tab.key === 'json' && unapplied}<span
					class="mark"
					aria-hidden="true">•</span
				><span class="sr">, unapplied changes</span>{/if}
		</button>
	{/each}
</div>

<div id="panel-{view}" role="tabpanel" aria-labelledby="tab-{view}" tabindex="-1">
	{#if view === 'sheet'}
		<EditableSheet />
	{:else}
		<TextPanels {view} bind:unapplied />
	{/if}
</div>

<style>
	.strip {
		display: flex;
		gap: 1.5rem;
		padding: 0 0 16px 2px;
	}
	.tab {
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: var(--color-ink-soft);
	}
	.tab__word {
		display: inline-block;
		padding-bottom: 5px;
		/* The section label's short rule, transparent until selected, so the
		   words never shift when the selection moves. */
		border-bottom: 2px solid transparent;
	}
	.tab:hover {
		color: var(--color-ink);
	}
	.tab[aria-selected='true'] {
		color: var(--color-ink);
	}
	.tab[aria-selected='true'] .tab__word {
		border-bottom-color: var(--color-ink);
	}
	.tab:focus-visible {
		outline: 2px solid var(--color-ink);
		outline-offset: 4px;
	}
	.mark {
		margin-left: 0.3em;
		color: var(--color-hotspot-ink);
		letter-spacing: 0;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
