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

			<!-- attribution -->
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
	</div>
</div>

<style>
	/* The homepage's marker underlines, under the headline's load-bearing words. */
	.underline-command {
		box-shadow: inset 0 -0.18em 0 0 var(--color-command);
	}
	.underline-event {
		box-shadow: inset 0 -0.18em 0 0 var(--color-event);
	}

	/* Each section is headed by its tool's chip — the homepage chip stack,
	   reused as wayfinding. */
	:global(.chip-label) {
		display: inline-block;
		rotate: -1deg;
		padding: 0.3rem 0.65rem;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.025em;
		box-shadow: 2px 2px 0 rgb(26 30 32 / 0.12);
	}

	/* The docs' running prose: serif ledes, sans mechanics, mono facts —
	   the homepage's registers held steady over a longer read. Text caps at
	   a measure; field notes float past it into the right rail on wide
	   screens, the homepage's margin-note collage. */
	.docs section {
		display: flow-root; /* a floated field note stays inside its section */
	}
	.docs section + section {
		margin-top: 6.5rem;
	}
	.docs .lede {
		margin-top: 1.25rem;
		max-width: 42rem;
		font-family: var(--font-serif);
		font-size: 1.125rem;
		line-height: 1.65;
		color: var(--color-ink-soft);
	}
	.docs h3 {
		margin-top: 2.25rem;
		max-width: 42rem;
		font-size: 1.05rem;
		font-weight: 600;
	}
	.docs p:not(.lede),
	.docs ul,
	.docs dl {
		margin-top: 0.875rem;
		max-width: 42rem;
		font-size: 0.9375rem;
		line-height: 1.7;
	}
	.docs ul {
		padding-left: 1.1rem;
		list-style: disc;
	}
	.docs li {
		margin-top: 0.5rem;
	}
	.docs li::marker {
		color: var(--color-ink-faint);
	}
	.docs dt {
		font-weight: 600;
	}
	.docs dt:not(:first-of-type) {
		margin-top: 0.875rem;
	}
	.docs dd {
		margin-top: 0.2rem;
		color: var(--color-ink-soft);
	}
	.docs a {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.docs code {
		font-family: var(--font-mono);
		font-size: 0.86em;
	}
	.docs kbd {
		font-family: var(--font-mono);
		font-size: 0.8em;
		padding: 0.1rem 0.35rem;
		border: 1px solid var(--color-line);
		border-radius: 3px;
		background: var(--color-sheet);
		box-shadow: 0 1px 0 var(--color-line);
	}

	/* Field notes: the homepage's tilted asides, carrying the caveats you
	   learn in the field. Inline cards on small screens; floated into the
	   right rail once there is one. */
	:global(.docs .note) {
		margin: 1.25rem 0;
		max-width: 15rem;
		border: 1px solid var(--color-line);
		background: var(--color-sheet);
		padding: 1rem 1.1rem;
		box-shadow: 2px 3px 0 rgb(26 30 32 / 0.1);
	}
	@media (min-width: 64rem) {
		:global(.docs .note) {
			float: right;
			clear: right;
			width: 14rem;
			margin: 0.25rem 0 1rem 1.75rem;
		}
	}

	/* Code blocks: `term` is a shell, dark; `filecard` is file contents on
	   sheet, with the filename as its tab. Both scroll sideways rather than
	   wrap, so a long line never breaks the page. */
	.docs pre {
		margin-top: 1rem;
		max-width: 42rem;
		overflow-x: auto;
		border-radius: 4px;
		padding: 1rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.7;
	}
	.docs pre.term {
		background: var(--color-ink);
		color: var(--color-paper);
		box-shadow: 0 1px 2px rgb(26 30 32 / 0.08);
	}
	:global(.docs .filecard) {
		margin-top: 1rem;
		max-width: 42rem;
		overflow: hidden;
		border-radius: 4px;
		border: 1px solid var(--color-line);
		background: var(--color-sheet);
		box-shadow: 0 1px 2px rgb(26 30 32 / 0.06);
	}
	:global(.docs .filecard figcaption) {
		border-bottom: 1px solid var(--color-line);
		padding: 0.5rem 0.75rem;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-ink-soft);
	}
	:global(.docs .filecard pre) {
		margin-top: 0;
		border: none;
		border-radius: 0;
		box-shadow: none;
	}

	.docs table {
		margin-top: 1rem;
		width: 100%;
		max-width: 42rem;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.docs th {
		text-align: left;
		font-weight: 600;
		padding: 0.5rem 1rem 0.5rem 0;
		border-bottom: 1px solid var(--color-ink);
	}
	.docs td {
		vertical-align: top;
		padding: 0.6rem 1rem 0.6rem 0;
		border-bottom: 1px solid var(--color-line);
	}
</style>
