<script lang="ts">
	/**
	 * PROTOTYPE — throwaway, not part of the app (SPEC has no homepage).
	 *
	 * Three variants of a BC Canvas homepage, switchable via ?variant=, on this
	 * throwaway /prototype-home route. All three keep the app's paper ground and
	 * tokens so the hand-off to the editor at / stays seamless; they disagree
	 * about structure:
	 *
	 *   A — Already on the table: a real rendered canvas dominates the viewport;
	 *       the CTA lifts the words away and the sheet stays.
	 *   B — The field manual: a single serif reading column; examples as
	 *       numbered plates, ddd-crew as colophon.
	 *   C — The workshop wall: the pitch written on EventStorming chips, a
	 *       terminal block, an example shelf, a pinned attribution note.
	 *   D — The synthesis (current pick): C's hero, A's hero, a fresh middle,
	 *       C's attribution, and the editor docked below a scroll-resistance
	 *       perforation that tears through into the real editor.
	 *
	 * Flip with the floating bar or ←/→. When a winner is picked, fold it into
	 * a real route and drop this folder onto the throwaway branch.
	 */
	import { page } from '$app/state';
	import PrototypeSwitcher from './PrototypeSwitcher.svelte';
	import VariantA from './VariantA.svelte';
	import VariantB from './VariantB.svelte';
	import VariantC from './VariantC.svelte';
	import VariantD from './VariantD.svelte';

	const VARIANTS = [
		{ key: 'D', name: 'The synthesis' },
		{ key: 'A', name: 'Already on the table' },
		{ key: 'B', name: 'The field manual' },
		{ key: 'C', name: 'The workshop wall' }
	] as const;

	const variant = $derived(page.url.searchParams.get('variant') ?? 'D');
</script>

<svelte:head>
	<title>Homepage prototype — BC Canvas</title>
</svelte:head>

{#if variant === 'A'}
	<VariantA />
{:else if variant === 'B'}
	<VariantB />
{:else if variant === 'C'}
	<VariantC />
{:else}
	<VariantD />
{/if}

<PrototypeSwitcher variants={VARIANTS} />
