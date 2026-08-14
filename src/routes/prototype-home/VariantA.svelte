<script lang="ts">
	/**
	 * PROTOTYPE — throwaway. Variant A: "Already on the table."
	 * Artifact-first: a real rendered canvas dominates the viewport and the
	 * words sit on a small plate over it. The primary CTA lifts the homepage
	 * matter away while the sheet stays put, then routes to the editor — the
	 * sheet the visitor was looking at appears to become the sheet they edit.
	 */
	import { goto } from '$app/navigation';
	import appointmentSvg from './assets/appointment-scheduling.bcc.svg?url';
	import notificationsSvg from './assets/notifications.bcc.svg?url';
	import orderSvg from './assets/order-fulfillment.bcc.svg?url';
	import royaltySvg from './assets/royalty-distribution.bcc.svg?url';

	let leaving = $state(false);

	function openEditor(event: MouseEvent) {
		event.preventDefault();
		if (leaving) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			goto('/');
			return;
		}
		leaving = true;
		setTimeout(() => goto('/'), 420);
	}

	const tools = [
		{ name: 'the editor', line: 'Edits happen inline on the rendered sheet. No accounts, no server.' },
		{ name: 'bcc', line: 'ls, check, fmt, render — canvases behave like source code, from a terminal.' },
		{ name: 'mcp', line: 'Reads a canvas as prose so a conversation can hold the whole context.' },
		{ name: '```bcc', line: 'A fence in any markdown file draws the sheet when the site builds.' }
	];

	const examples = [
		{ src: orderSvg, name: 'Order Fulfillment', line: 'every section filled' },
		{ src: notificationsSvg, name: 'Notifications', line: 'a generic context' },
		{ src: appointmentSvg, name: 'Appointment Scheduling', line: 'falsifiable metrics' },
		{ src: royaltySvg, name: 'Royalty Distribution', line: 'captured mid-workshop' }
	];
</script>

<div class:leaving>
	<!-- Hero: the sheet is the page. -->
	<section class="relative min-h-svh overflow-hidden">
		<img
			src={orderSvg}
			alt="The Order Fulfillment canvas, fully rendered"
			class="hero-sheet pointer-events-none absolute top-24 left-1/2 w-[min(1180px,140vw)] max-w-none -translate-x-1/2 sm:top-20 sm:w-[min(1180px,94vw)]"
			width="1440"
			height="1292"
		/>

		<header class="matter relative z-10 flex items-baseline justify-between px-5 pt-5 sm:px-8">
			<span class="text-lg font-bold tracking-tight">BC Canvas</span>
			<a
				href="/"
				onclick={openEditor}
				class="rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper"
			>
				Open the editor
			</a>
		</header>

		<div class="matter plate relative z-10 mx-5 mt-[52svh] max-w-xl border border-line bg-sheet p-6 shadow-[0_2px_16px_rgb(26_30_32/0.10)] sm:mx-8 sm:mt-[46svh] sm:p-8">
			<h1 class="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
				This is a bounded context, written down.
			</h1>
			<p class="mt-4 font-serif text-lg leading-relaxed text-ink-soft">
				One sheet holds a context's name, its purpose, and every promise it makes to the rest of
				the system. This editor makes the sheet itself the document — you are looking at it now,
				and it is one click from editable.
			</p>
			<div class="mt-6 flex items-center gap-4">
				<a
					href="/"
					onclick={openEditor}
					class="rounded-[4px] bg-ink px-5 py-2.5 text-sm font-semibold text-sheet transition-transform duration-200 hover:-translate-y-0.5"
				>
					Start your canvas
				</a>
				<span class="text-sm text-ink-soft">Nothing leaves your machine.</span>
			</div>
		</div>
	</section>

	<!-- Below the fold: the argument, the tools, the examples, the credit. -->
	<div class="matter relative z-10 border-t border-line">
		<div class="mx-auto max-w-3xl px-5 py-16 sm:px-8">
			<h2 class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">
				Why write it down
			</h2>
			<p class="mt-4 font-serif text-lg leading-relaxed">
				Every system has a context that only one person can explain, and a boundary everyone
				draws differently. Writing it on one page makes the names sharp, surfaces the
				assumptions, and turns "we should talk about that service" into a sheet the whole team
				can point at. The canvas is the ddd-crew's design — this project's job is to make
				filling one in feel lighter than not doing it.
			</p>

			<h2 class="mt-14 text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">
				One sheet, every surface
			</h2>
			<dl class="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
				{#each tools as tool (tool.name)}
					<div class="border-t border-line pt-3">
						<dt class="font-mono text-sm font-medium">{tool.name}</dt>
						<dd class="mt-1 text-sm leading-relaxed text-ink-soft">{tool.line}</dd>
					</div>
				{/each}
			</dl>

			<h2 class="mt-14 text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">
				Four canvases to steal from
			</h2>
			<div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
				{#each examples as ex (ex.name)}
					<figure>
						<div class="overflow-hidden border border-line bg-sheet p-1">
							<img src={ex.src} alt="" class="h-auto w-full" width="1440" height="1292" loading="lazy" />
						</div>
						<figcaption class="mt-2 text-xs leading-snug">
							<span class="font-medium">{ex.name}</span>
							<span class="text-ink-soft"> — {ex.line}</span>
						</figcaption>
					</figure>
				{/each}
			</div>
			<p class="mt-3 text-sm text-ink-soft">All four ship in the editor's Examples menu.</p>

			<p class="mt-16 border-t border-line pt-5 font-serif text-sm text-ink-soft italic">
				The Bounded Context Canvas is by the
				<a href="https://github.com/ddd-crew/bounded-context-canvas" class="underline underline-offset-2 hover:text-ink">ddd-crew</a>, licensed CC BY 4.0. This editor is one way to fill it in.
			</p>
		</div>
	</div>
</div>

<style>
	/* Load: the sheet settles onto the table, then the words arrive.
	   Subtle distances, determined easing — nothing bounces. */
	@media (prefers-reduced-motion: no-preference) {
		.hero-sheet {
			animation: settle 550ms cubic-bezier(0.2, 0, 0, 1) both;
		}
		.plate {
			animation: rise 450ms cubic-bezier(0.2, 0, 0, 1) 140ms both;
		}
		.matter {
			transition:
				opacity 380ms cubic-bezier(0.4, 0, 1, 1),
				transform 380ms cubic-bezier(0.4, 0, 1, 1);
		}
		/* The exit: everything but the sheet lifts away; the sheet remains,
		   and the editor mounts on the same paper. */
		.leaving .matter {
			opacity: 0;
			transform: translateY(-14px);
		}
	}

	/* Horizontal centering rides the Tailwind `translate` property; the
	   keyframe only touches `transform`, so the two never stack. */
	@keyframes settle {
		from {
			opacity: 0;
			transform: translateY(10px) scale(1.008);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
