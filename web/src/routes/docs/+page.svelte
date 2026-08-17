<script lang="ts">
	/**
	 * The docs: every tool in this project, end to end, on one page — set in
	 * the same wall language as the homepage. The chip stack that pitches the
	 * canvas there returns here as wayfinding: each section is headed by a
	 * small tilted chip in its tool's color, the sticky nav mirrors them as a
	 * legend, and the homepage's tools grid links into the section anchors.
	 * The ids are a contract — change one and the grid changes with it.
	 *
	 * This file is the **shell** (SPEC §2.1): the masthead, the nav, the eight
	 * `<section>` wrappers and their chip heads. It writes no prose. Every
	 * section body is committed Markdown at `docs/site/<id>.md`, rendered by
	 * `+page.server.ts` at prerender and arriving here as one ordered array —
	 * so the id is written once, on the register row, instead of once
	 * literally and once positionally.
	 *
	 * The page carries no client script. The nav has no scroll-spy marker:
	 * CSS reproduces both of its visual effects but can never set
	 * `aria-current`, and the effects were `lg:`-gated while the attribute was
	 * not (ticket 067).
	 */
	import '$lib/docs/prose.css';
	import type { DocsSection } from '$lib/docs/sections';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const REPO = 'https://github.com/mitchellvanw/bc-canvas-editor';

	/** The nav's legend dot: the chip's background and border, none of its text. */
	const dot = (chip: string) => chip.split(' ').slice(0, 2).join(' ');
</script>

{#snippet chiphead(section: DocsSection)}
	<span class="chip-label {section.chip} border">{section.label}</span>
	<h2 class="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{section.title}</h2>
{/snippet}

<svelte:head>
	<title>Docs — BC Canvas</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-5 pt-6 pb-24 sm:px-8">
	<header class="flex items-baseline justify-between">
		<a href="/" class="text-lg font-bold tracking-tight">BC Canvas</a>
		<div class="flex items-baseline gap-5">
			<span aria-current="page" class="text-sm font-semibold">Docs</span>
			<a href="/edit" class="rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper">
				Open the editor
			</a>
		</div>
	</header>

	<div class="mt-16 max-w-3xl">
		<p class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">The docs</p>
		<h1 class="mt-4 text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl">
			<span class="underline-command">One file</span>, and every tool that
			<span class="underline-event">touches it</span>.
		</h1>
		<p class="mt-6 font-serif text-lg leading-relaxed text-ink-soft">
			Every surface in this project draws the same sheet from the same small file: the editor
			where a canvas is argued into shape, the command line that keeps it honest, the fence that
			draws it in your docs, the server that reads it to an agent. These pages cover each one
			end to end — install, the day-to-day, and the edges where it stops.
			<a href="{REPO}/blob/main/SPEC.md" class="underline underline-offset-2">SPEC.md</a> is the
			letter of the law underneath.
		</p>
	</div>

	<div class="mt-14 lg:grid lg:grid-cols-[11.5rem_minmax(0,1fr)] lg:gap-12">
		<nav aria-label="On this page" class="lg:sticky lg:top-8 lg:self-start">
			<p class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft max-lg:sr-only">
				On this page
			</p>
			<ul class="lg:mt-3 lg:space-y-1 max-lg:flex max-lg:flex-wrap max-lg:gap-2">
				{#each data.sections as s (s.id)}
					<li>
						<a
							href="#{s.id}"
							class="group flex items-center gap-2.5 text-sm max-lg:rounded-full max-lg:border max-lg:border-line max-lg:bg-sheet max-lg:px-3 max-lg:py-1.5 lg:py-1"
						>
							<span class="h-2.5 w-2.5 shrink-0 border {dot(s.chip)}" aria-hidden="true"></span>
							<span class="font-medium text-ink-soft group-hover:text-ink">{s.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="docs max-lg:mt-12">
			{#each data.sections as s (s.id)}
				<section id={s.id} class="scroll-mt-8">
					{@render chiphead(s)}
					<!-- The body is committed Markdown, rendered at prerender. -->
					{@html s.html}
				</section>
			{/each}
		</div>
	</div>

	<!-- Attribution: page chrome, not one of the eight bodies. It sits outside
	     `.docs` beside the masthead — inside, `.docs section`'s `flow-root`
	     caught it and its own `flex justify-center` never applied. -->
	<section class="mt-24 flex justify-center">
		<div class="max-w-md rotate-1 border border-term-ink bg-term px-6 py-5 text-center shadow-[2px_3px_0_rgb(26_30_32/0.12)]">
			<p class="font-mono text-[11px] font-medium tracking-wide text-term-ink">attribution</p>
			<p class="mt-1 text-sm leading-relaxed">
				The Bounded Context Canvas is by the
				<a href="https://github.com/ddd-crew/bounded-context-canvas" class="font-medium underline underline-offset-2">ddd-crew</a>,
				licensed CC BY 4.0. These docs just explain the paper.
			</p>
		</div>
	</section>
</div>

<style>
	/* The shell's own rules (ticket 071). Every selector here styles an element
	   this component renders, so Svelte's scoping reaches it — which is what
	   keeps `.underline-command` / `.underline-event` off the homepage, where
	   the same two class names carry a different implementation. The 22 rules
	   for the pipeline's output live in `$lib/docs/prose.css`. */

	/* The homepage's marker underlines, under the headline's load-bearing words. */
	.underline-command {
		box-shadow: inset 0 -0.18em 0 0 var(--color-command);
	}
	.underline-event {
		box-shadow: inset 0 -0.18em 0 0 var(--color-event);
	}

	/* Each section is headed by its tool's chip — the homepage chip stack,
	   reused as wayfinding. */
	.chip-label {
		display: inline-block;
		rotate: -1deg;
		padding: 0.3rem 0.65rem;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.025em;
		box-shadow: 2px 2px 0 rgb(26 30 32 / 0.12);
	}

	/* The eight section wrappers: the loop's, so these stay scoped. */
	.docs section {
		display: flow-root; /* a floated field note stays inside its section */
	}
	.docs section + section {
		margin-top: 6.5rem;
	}
</style>
