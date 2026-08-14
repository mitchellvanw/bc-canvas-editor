<script lang="ts">
	/**
	 * PROTOTYPE — throwaway. The floating variant switcher for the homepage
	 * prototype: arrows and ←/→ cycle the ?variant= search param. Dev-only,
	 * deliberately styled unlike the app so it reads as scaffolding, not design.
	 */
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { variants }: { variants: readonly { key: string; name: string }[] } = $props();

	const current = $derived(page.url.searchParams.get('variant') ?? variants[0].key);
	const index = $derived(Math.max(0, variants.findIndex((v) => v.key === current)));

	function cycle(delta: number) {
		const next = variants[(index + delta + variants.length) % variants.length];
		const url = new URL(page.url);
		url.searchParams.set('variant', next.key);
		goto(url, { replaceState: true, keepFocus: true });
	}

	function onKeydown(event: KeyboardEvent) {
		if (!dev) return;
		const target = event.target instanceof Element ? event.target : null;
		if (target?.closest('input, textarea, select, [contenteditable]')) return;
		if (event.key === 'ArrowLeft') cycle(-1);
		else if (event.key === 'ArrowRight') cycle(1);
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if dev}
	<div
		class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#111] px-2 py-1.5 font-mono text-xs text-white shadow-lg"
	>
		<button
			type="button"
			class="rounded-full px-2 py-0.5 hover:bg-white/15"
			onclick={() => cycle(-1)}
			aria-label="Previous variant"
		>
			←
		</button>
		<span class="min-w-44 px-1 text-center tabular-nums">
			{current} — {variants[index].name}
		</span>
		<button
			type="button"
			class="rounded-full px-2 py-0.5 hover:bg-white/15"
			onclick={() => cycle(1)}
			aria-label="Next variant"
		>
			→
		</button>
	</div>
{/if}
