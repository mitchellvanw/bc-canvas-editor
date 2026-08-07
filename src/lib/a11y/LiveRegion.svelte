<script lang="ts">
	/**
	 * The one polite live region (SPEC §8.5): a visually hidden status surface
	 * that speaks whatever announce() is fed — structural commits, undo/redo,
	 * import/new, the multi-tab notice. Polite and unqueued: a new message
	 * replaces the last, and nothing here is ever assertive.
	 */
	import { onMount } from 'svelte';
	import { setAnnouncer } from './announce';

	let el: HTMLElement;
	let flip = false;

	onMount(() => {
		setAnnouncer((message) => {
			// A repeat of the same string must still be a DOM change or screen
			// readers stay silent; the alternating no-break space is unspoken.
			flip = !flip;
			el.textContent = flip ? message : `${message} `;
		});
		return () => setAnnouncer(null);
	});
</script>

<div bind:this={el} class="sr-only" role="status"></div>
