<script lang="ts">
	import { onMount } from 'svelte';
	import LiveRegion from '$lib/a11y/LiveRegion.svelte';
	import { trackModality } from '$lib/a11y/modality';
	import Chrome from '$lib/chrome/Chrome.svelte';
	import { canvas } from '$lib/editor/document.svelte';
	import EditableSheet from '$lib/editor/EditableSheet.svelte';
	import { wireUnloadFlush } from '$lib/editor/flush';
	import JsonView from '$lib/editor/JsonView.svelte';
	import MarkdownView from '$lib/editor/MarkdownView.svelte';
	import { multiTab } from '$lib/editor/multi-tab.svelte';
	import ViewSwitcher from '$lib/editor/ViewSwitcher.svelte';
	import type { ViewKey } from '$lib/editor/views';
	import { windowTitle } from '$lib/model/title';

	/**
	 * Which View is showing (SPEC §5). The app always opens on the Sheet: the
	 * `bcc.autosave` slot is the Canvas file byte-for-byte and does not grow
	 * app-UI state, so there is nothing to restore this from.
	 */
	let view = $state<ViewKey>('sheet');

	onMount(() => {
		canvas.restore();
		const unwireFlush = wireUnloadFlush();
		const unwatchTabs = multiTab.watch();
		const untrackModality = trackModality();
		return () => {
			unwireFlush();
			unwatchTabs();
			untrackModality();
		};
	});
</script>

<svelte:head>
	<title>{windowTitle(canvas.doc.name)}</title>
</svelte:head>

<LiveRegion />

<Chrome />

<!-- The responsive container (SPEC §5): the sheet reflows by this element's
     width, never the viewport — and only the editor declares a container, so
     the offscreen artifact mount and the exported HTML have no container
     ancestor and keep the fixed desktop grid (§9.2). -->
<main class="@container mx-auto max-w-[1440px] px-4 pt-6 pb-12 sm:px-6 lg:px-10">
	<ViewSwitcher bind:view />

	<!-- The title block belongs to the Sheet View: switching replaces everything
	     below the pill, title block included. Only the selected View is mounted,
	     which is why the JSON buffer lives outside these components. -->
	<div id="panel-{view}" role="tabpanel" aria-labelledby="tab-{view}" tabindex="-1">
		{#if view === 'sheet'}
			<EditableSheet />
		{:else if view === 'json'}
			<JsonView />
		{:else}
			<MarkdownView />
		{/if}
	</div>
</main>
