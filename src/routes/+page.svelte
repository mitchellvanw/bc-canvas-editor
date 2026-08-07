<script lang="ts">
	import { onMount } from 'svelte';
	import Chrome from '$lib/chrome/Chrome.svelte';
	import { canvas } from '$lib/editor/document.svelte';
	import EditableSheet from '$lib/editor/EditableSheet.svelte';
	import { windowTitle } from '$lib/model/title';

	onMount(() => canvas.restore());
</script>

<svelte:head>
	<title>{windowTitle(canvas.doc.name)}</title>
</svelte:head>

<Chrome />

<main class="mx-auto max-w-[1440px] px-10 pt-6 pb-12">
	<EditableSheet />
</main>
