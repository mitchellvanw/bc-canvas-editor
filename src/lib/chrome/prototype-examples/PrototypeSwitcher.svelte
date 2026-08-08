<script lang="ts">
	/**
	 * PROTOTYPE — floating variant switcher, deliberately loud so it can't be
	 * mistaken for the design under evaluation. Lives only on the
	 * prototype/example-chooser branch; never merges.
	 */
	let { variant = $bindable(1), labels }: { variant?: number; labels: string[] } = $props();

	// No $app/environment here — vitest mounts Chrome without SvelteKit aliases.
	if (typeof location !== 'undefined') {
		const fromUrl = Number(new URL(location.href).searchParams.get('variant'));
		if (fromUrl >= 1 && fromUrl <= labels.length) variant = fromUrl;
	}

	function set(next: number) {
		variant = ((next - 1 + labels.length) % labels.length) + 1;
		const url = new URL(location.href);
		url.searchParams.set('variant', String(variant));
		history.replaceState(null, '', url);
	}

	// ←/→ cycle variants, but never while typing, picking, or in a dialog.
	function onKey(event: KeyboardEvent) {
		const target = event.target instanceof Element ? event.target : null;
		if (target?.closest('input, textarea, [contenteditable], dialog, [role="menu"], [role="listbox"]'))
			return;
		if (event.key === 'ArrowLeft') set(variant - 1);
		if (event.key === 'ArrowRight') set(variant + 1);
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-sheet shadow-lg"
>
	<button type="button" class="px-1 hover:opacity-70" onclick={() => set(variant - 1)} aria-label="Previous variant">
		←
	</button>
	<span class="font-mono text-[13px]">{variant} — {labels[variant - 1]}</span>
	<button type="button" class="px-1 hover:opacity-70" onclick={() => set(variant + 1)} aria-label="Next variant">
		→
	</button>
</div>
