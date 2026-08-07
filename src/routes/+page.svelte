<script lang="ts">
	import { onMount } from 'svelte';
	import Chrome from '$lib/chrome/Chrome.svelte';
	import { canvas } from '$lib/editor/document.svelte';
	import { editableText } from '$lib/editor/editable';
	import { windowTitle } from '$lib/model/title';
	import CanvasSheet from '$lib/sheet/CanvasSheet.svelte';

	onMount(() => canvas.restore());
</script>

<svelte:head>
	<title>{windowTitle(canvas.doc.name)}</title>
</svelte:head>

<Chrome />

<main class="mx-auto max-w-[1440px] px-10 pt-6 pb-12">
	<CanvasSheet doc={canvas.doc}>
		{#snippet titleName()}
			<span
				class="-mx-2 block min-h-[1.2em] rounded-sm px-2 outline-none hover:bg-sheet/5 focus:ring-1 focus:ring-sheet/40 focus:ring-inset"
				aria-label="Name"
				aria-placeholder="Name this context"
				data-placeholder="Name this context"
				use:editableText={{
					value: canvas.doc.name,
					onCommit: (name) => canvas.commit((doc) => (doc.name = name))
				}}
			></span>
		{/snippet}
	</CanvasSheet>
</main>
