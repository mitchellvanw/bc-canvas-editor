<script lang="ts">
	import { onMount } from 'svelte';
	import LiveRegion from '$lib/a11y/LiveRegion.svelte';
	import { trackModality } from '$lib/a11y/modality';
	import Chrome from '$lib/chrome/Chrome.svelte';
	import { canvas } from '$lib/editor/document.svelte';
	import EditableSheet from '$lib/editor/EditableSheet.svelte';
	import { wireUnloadFlush } from '$lib/editor/flush';
	import { multiTab } from '$lib/editor/multi-tab.svelte';
	import { windowTitle } from '$lib/model/title';

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
	<EditableSheet />
</main>
