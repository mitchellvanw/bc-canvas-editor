<script lang="ts">
	/**
	 * PROTOTYPE — throwaway. The editor dock, third shape: the scroll-tear
	 * mechanic is replaced by a finale. The homepage ends on a small
	 * celebration — "You made it to the end. Congrats!" with a burst of
	 * EventStorming-chip confetti — and the REAL editor page appears as a
	 * fixed overlay the instant any door is opened (hero CTAs, example
	 * cards, the blank-canvas card, or the button here). No fly-in: Mitchell
	 * cut it as too slow.
	 * While the overlay is up the body is pinned, the editor scrolls
	 * internally, and the URL reads "/". One-way by design: leaving is a
	 * reload or the back button, like any navigation.
	 *
	 * Prototype liberties: raw history.replaceState (bypasses SvelteKit's
	 * router), body overflow-hidden while entered, and the editor's global
	 * shortcuts are live even while the homepage shows, since the page is
	 * genuinely mounted.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import EditorPage from '../+page.svelte';

	type DockState = 'home' | 'locked';

	let celebrationEl = $state<HTMLElement>();
	let dockState = $state<DockState>('home');
	let party = $state(false);
	let mechanicOn = $state(true);

	// Confetti: the palette as little chips scattered around the heading.
	const CONFETTI = [
		{ c: 'bg-command', x: '8%', y: '-0.4rem', r: -18, d: 0 },
		{ c: 'bg-event', x: '16%', y: '1.6rem', r: 12, d: 60 },
		{ c: 'bg-query', x: '24%', y: '-1.2rem', r: 6, d: 120 },
		{ c: 'bg-term', x: '31%', y: '0.9rem', r: -8, d: 30 },
		{ c: 'bg-collaborator', x: '66%', y: '-1rem', r: 14, d: 90 },
		{ c: 'bg-policy', x: '74%', y: '1.4rem', r: -12, d: 150 },
		{ c: 'bg-event', x: '82%', y: '-0.5rem', r: 20, d: 45 },
		{ c: 'bg-command', x: '90%', y: '1rem', r: -6, d: 105 },
		{ c: 'bg-hotspot', x: '50%', y: '-1.6rem', r: 3, d: 180 }
	];

	function lockBody(on: boolean) {
		document.documentElement.style.overflow = on ? 'hidden' : '';
	}

	function tweenValue(from: number, to: number, ms: number, set: (v: number) => void): Promise<void> {
		return new Promise((resolve) => {
			const t0 = performance.now();
			const ease = (t: number) => 1 - Math.pow(1 - t, 3);
			function frame(now: number) {
				const t = Math.min(1, (now - t0) / ms);
				set(from + (to - from) * ease(t));
				if (t < 1) requestAnimationFrame(frame);
				else resolve();
			}
			requestAnimationFrame(frame);
		});
	}

	/** Every door on the page lands here: ride to the end of the homepage so
	 * the reader sees it complete, the shortest beat on the finale, then the
	 * editor is simply there — no fly-in. */
	export async function enter() {
		if (!mechanicOn) {
			await goto('/');
			return;
		}
		if (dockState !== 'home') return;
		const max = document.documentElement.scrollHeight - window.innerHeight;
		const distance = Math.abs(max - window.scrollY);
		if (distance > 2) {
			await tweenValue(window.scrollY, max, Math.min(900, 300 + distance * 0.2), (v) =>
				window.scrollTo(0, v)
			);
		}
		party = true;
		await new Promise((r) => setTimeout(r, 250));
		dockState = 'locked';
		lockBody(true);
		history.replaceState(history.state, '', '/');
	}

	onMount(() => {
		mechanicOn = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// The confetti pops the first time the finale scrolls into view.
		let observer: IntersectionObserver | undefined;
		if (celebrationEl) {
			observer = new IntersectionObserver(
				(entries) => {
					if (entries.some((e) => e.isIntersecting)) {
						party = true;
						observer?.disconnect();
					}
				},
				{ rootMargin: '0px 0px -20% 0px' }
			);
			observer.observe(celebrationEl);
		}

		return () => {
			observer?.disconnect();
			lockBody(false);
		};
	});
</script>

<!-- The finale: the page is over, and says so. -->
<section bind:this={celebrationEl} class="relative mx-auto max-w-2xl px-5 pt-24 pb-28 text-center" class:party>
	<div class="pointer-events-none absolute inset-x-0 top-12 h-16" aria-hidden="true">
		{#each CONFETTI as piece (piece.x + piece.c)}
			<span
				class="piece absolute h-3 w-2 rounded-[1px] {piece.c}"
				style="left: {piece.x}; top: {piece.y}; --r: {piece.r}deg; --d: {piece.d}ms"
			></span>
		{/each}
	</div>
	<p class="font-serif text-3xl italic sm:text-4xl">You made it to the end.</p>
	<p class="mt-5 font-serif text-lg text-ink-soft">Nothing below here but the editor.</p>
	<button
		type="button"
		onclick={() => void enter()}
		class="mt-7 rounded-[4px] bg-ink px-7 py-3 text-sm font-semibold text-sheet transition-transform duration-200 hover:-translate-y-0.5"
	>
		Enter the editor
	</button>
</section>

<!-- The editor: a fixed overlay, shown the instant a door is used. -->
<div
	class="dock fixed inset-0 z-40 overflow-hidden bg-paper {dockState === 'home'
		? 'pointer-events-none invisible'
		: ''}"
>
	<div
		class="h-full overscroll-contain {dockState === 'locked'
			? 'overflow-y-auto'
			: 'pointer-events-none overflow-hidden'}"
	>
		<EditorPage />
	</div>
</div>

<style>
	/* Confetti rests invisible; the party class pops each piece out with a
	   short, determined settle — staggered, no bounce. Reduced motion shows
	   them resting in place instead. */
	.piece {
		opacity: 0;
		transform: rotate(var(--r)) scale(0.5);
	}
	.party .piece {
		opacity: 1;
		transform: rotate(var(--r)) scale(1);
	}
	@media (prefers-reduced-motion: no-preference) {
		.party .piece {
			animation: pop 480ms cubic-bezier(0.2, 0, 0, 1) both;
			animation-delay: var(--d);
		}
		@keyframes pop {
			from {
				opacity: 0;
				transform: translateY(14px) rotate(0deg) scale(0.4);
			}
			60% {
				opacity: 1;
			}
			to {
				opacity: 1;
				transform: translateY(0) rotate(var(--r)) scale(1);
			}
		}
	}
</style>
