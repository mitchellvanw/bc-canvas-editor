<script lang="ts">
	import { onMount } from 'svelte';
	import Chrome from '$lib/chrome/Chrome.svelte';
	import { canvas } from '$lib/editor/document.svelte';
	import { editableText } from '$lib/editor/editable';
	import { windowTitle } from '$lib/model/title';

	onMount(() => canvas.restore());

	const axes = [
		{ label: 'Domain', value: () => canvas.doc.strategicClassification.domain },
		{ label: 'Business model', value: () => canvas.doc.strategicClassification.businessModel },
		{ label: 'Evolution', value: () => canvas.doc.strategicClassification.evolution }
	];
</script>

<svelte:head>
	<title>{windowTitle(canvas.doc.name)}</title>
</svelte:head>

<Chrome />

<main class="mx-auto max-w-[1440px] px-10 pt-6 pb-12">
	<header class="rounded-[6px] bg-ink px-9 py-8 text-sheet shadow-md">
		<p class="text-[11px] font-medium tracking-[0.22em] uppercase opacity-60">
			Bounded Context Canvas&nbsp;·&nbsp;V5
		</p>
		<!-- svelte-ignore a11y_missing_content — the editableText action owns the name text -->
		<h1 class="mt-3 text-4xl font-bold">
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
		</h1>
		<dl class="mt-7 flex gap-12">
			{#each axes as axis (axis.label)}
				<div>
					<dt class="text-[11px] font-medium tracking-[0.14em] uppercase opacity-60">
						{axis.label}
					</dt>
					<dd class="mt-1 font-mono text-sm">{axis.value() ?? '—'}</dd>
				</div>
			{/each}
		</dl>
	</header>
</main>
