<script lang="ts">
	import { onMount } from 'svelte';
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
		return () => {
			unwireFlush();
			unwatchTabs();
		};
	});
</script>

<svelte:head>
	<title>{windowTitle(canvas.doc.name)}</title>
</svelte:head>

<Chrome />

<main class="mx-auto max-w-[1440px] px-10 pt-6 pb-12">
	<EditableSheet />
</main>
