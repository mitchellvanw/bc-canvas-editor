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
	// PROTOTYPE (ticket 042) — everything `proto` is throwaway and lives only
	// on the prototype/view-switcher branch. `?switcher=A|B|C|D` swaps the
	// sheet for a variant of the View switcher, in situ with the real chrome.
	import ProtoBar from '$lib/proto/ProtoBar.svelte';
	import ViewsA from '$lib/proto/ViewsA.svelte';
	import ViewsB from '$lib/proto/ViewsB.svelte';
	import ViewsC from '$lib/proto/ViewsC.svelte';
	import ViewsD from '$lib/proto/ViewsD.svelte';
	import { EXAMPLES } from '$lib/chrome/examples';
	import { stampIds } from '$lib/model/canvas';
	import type { ViewKey } from '$lib/proto/views';

	const PROTO_NAMES = {
		A: 'Eyebrow tabs (in the ink)',
		B: 'Folder tabs (cut from paper)',
		C: 'Gutter segmented control',
		D: 'Section-label strip'
	};
	const PROTO_VARIANTS = { A: ViewsA, B: ViewsB, C: ViewsC, D: ViewsD };
	let protoVariant = $state<keyof typeof PROTO_VARIANTS | null>(null);
	let protoView = $state<ViewKey>('sheet');
	let protoUnapplied = $state(false);

	onMount(() => {
		canvas.restore();
		const asked = new URL(location.href).searchParams.get('switcher')?.toUpperCase();
		if (asked && asked in PROTO_VARIANTS) {
			protoVariant = asked as keyof typeof PROTO_VARIANTS;
			// A populated canvas or the variants are judged in a vacuum.
			if (canvas.doc.name.trim() === '') canvas.replace(stampIds(EXAMPLES[0].file));
		}
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
	{#if protoVariant}
		{@const Variant = PROTO_VARIANTS[protoVariant]}
		<Variant bind:view={protoView} bind:unapplied={protoUnapplied} />
	{:else}
		<EditableSheet />
	{/if}
</main>

{#if protoVariant}
	<ProtoBar variant={protoVariant} names={PROTO_NAMES} bind:unapplied={protoUnapplied} />
{/if}
