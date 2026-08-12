<script lang="ts">
	/**
	 * PROTOTYPE — the throwaway switcher bar (ticket 042). Deliberately ugly
	 * and high-contrast so it can never be mistaken for the design under
	 * review. ←/→ cycle variants; the toggle drives the unapplied-buffer
	 * marker so it can be judged without typing JSON. Dev only.
	 */
	let {
		variant,
		names,
		unapplied = $bindable(false)
	}: { variant: string; names: Record<string, string>; unapplied: boolean } = $props();

	const keys = Object.keys(names);

	function go(step: number) {
		const next = keys[(keys.indexOf(variant) + step + keys.length) % keys.length];
		const url = new URL(location.href);
		url.searchParams.set('switcher', next);
		location.href = url.toString();
	}

	function onKey(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, [contenteditable]')) return;
		if (event.key === 'ArrowLeft' && event.shiftKey) go(-1);
		if (event.key === 'ArrowRight' && event.shiftKey) go(1);
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="bar">
	<button type="button" onclick={() => go(-1)} aria-label="Previous variant">←</button>
	<span class="label">{variant} — {names[variant]}</span>
	<button type="button" onclick={() => go(1)} aria-label="Next variant">→</button>
	<label class="toggle">
		<input type="checkbox" bind:checked={unapplied} />
		unapplied
	</label>
	<span class="hint">shift+←/→</span>
</div>

<style>
	.bar {
		position: fixed;
		bottom: 14px;
		left: 50%;
		z-index: 999;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		transform: translateX(-50%);
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
		background: #101418;
		color: #fff;
		font-family: ui-monospace, monospace;
		font-size: 12px;
		box-shadow: 0 6px 22px rgb(0 0 0 / 0.35);
	}
	.bar button {
		padding: 0 0.35rem;
		color: #fff;
		font-size: 14px;
	}
	.label {
		min-width: 20ch;
		text-align: center;
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding-left: 0.6rem;
		border-left: 1px solid #444;
		cursor: pointer;
	}
	.hint {
		opacity: 0.45;
	}
</style>
