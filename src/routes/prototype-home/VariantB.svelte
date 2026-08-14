<script lang="ts">
	/**
	 * PROTOTYPE — throwaway. Variant B: "The field manual."
	 * A single reading column, serif-led — the leaflet that would ship folded
	 * inside a pad of blank canvases. Examples are numbered plates, tooling is
	 * a definition list, the ddd-crew credit is a colophon. No cards, no grid
	 * of features: the argument carries the page, and the only persistent
	 * affordance is a quiet "Open the editor" in the top rule.
	 */
	import appointmentSvg from './assets/appointment-scheduling.bcc.svg?url';
	import notificationsSvg from './assets/notifications.bcc.svg?url';
	import orderSvg from './assets/order-fulfillment.bcc.svg?url';
	import royaltySvg from './assets/royalty-distribution.bcc.svg?url';

	const plates = [
		{ numeral: 'I', src: orderSvg, name: 'Order Fulfillment', line: 'coordinates picking, packing and shipping once an order is paid; every section of the canvas filled.' },
		{ numeral: 'II', src: notificationsSvg, name: 'Notifications', line: 'what a generic context looks like, receiving Order Fulfillment’s Order Shipped event.' },
		{ numeral: 'III', src: appointmentSvg, name: 'Appointment Scheduling', line: 'a supporting context with falsifiable metrics.' },
		{ numeral: 'IV', src: royaltySvg, name: 'Royalty Distribution', line: 'captured mid-workshop, open questions still outnumbering decisions.' }
	];

	const tools = [
		{ term: 'the editor', def: 'edits happen inline on the rendered sheet, entirely in your browser. The canvas stays on your machine until you export it — a re-importable file, a self-contained HTML artifact, an image, or Markdown.' },
		{ term: 'bcc', def: 'the same canvases from a terminal: ls, check, fmt, render. check reads through the parser the editor uses, fmt writes the bytes an export would have written — a canvas behaves like source code, not an attachment.' },
		{ term: 'mcp server', def: 'reads a canvas as prose and offers it to a conversation, with a workshop skill and a reviewer agent beside it. It never writes; that is bcc’s job.' },
		{ term: '```bcc fence', def: 'a fence in any markdown file points at a canvas, and the sheet is drawn there — in the VS Code preview while you write, and by a remark plugin when your site builds.' }
	];

	/** Scroll reveal: sections fade up 12px once, the first time they enter. */
	function reveal(node: HTMLElement) {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		node.classList.add('pending');
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add('in');
					observer.unobserve(entry.target);
				}
			},
			{ rootMargin: '0px 0px -10% 0px' }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

<header class="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur-sm">
	<div class="mx-auto flex h-12 max-w-[72ch] items-center justify-between px-5">
		<span class="text-sm font-semibold tracking-[0.14em] uppercase">BC Canvas</span>
		<a href="/" class="text-sm font-medium underline-offset-4 hover:underline">
			Open the editor →
		</a>
	</div>
</header>

<article class="mx-auto max-w-[72ch] px-5 pt-16 pb-24 font-serif text-lg leading-relaxed">
	<p class="font-sans text-xs font-semibold tracking-[0.14em] uppercase text-ink-soft">
		A field manual for the Bounded Context Canvas
	</p>
	<h1 class="mt-4 text-5xl leading-[1.08] text-balance italic sm:text-6xl">
		Write the boundary down.
	</h1>
	<p class="mt-8">
		Every system has a context that only one person can explain, a service whose name means three
		things in three meetings, a boundary everyone draws differently from memory. The Bounded
		Context Canvas — a one-page template by the ddd-crew — ends that: a context's name, its
		reason to exist, and every message it accepts, announces and answers, on a single sheet the
		whole team can point at.
	</p>

	<section use:reveal class="mt-16">
		<h2 class="flex items-baseline gap-4 font-sans text-sm font-semibold tracking-[0.08em] uppercase">
			Why documenting a context works
			<span class="rule h-px flex-1 bg-line" aria-hidden="true"></span>
		</h2>
		<p class="mt-6">
			Not because documentation is virtuous — because the sheet forces decisions. A purpose has
			to fit in a sentence. Every inbound message needs a named collaborator on the other end.
			The strategic classification is a checkbox, so "it's kind of core" stops being an answer.
			What a wiki page lets you leave vague, the canvas makes you commit to — and the gaps left
			showing are the agenda for the next conversation.
		</p>
		<blockquote class="mt-10 border-l-2 border-line pl-6 text-xl italic">
			The filled sheet is useful. The arguments it starts are the point.
		</blockquote>
	</section>

	<section use:reveal class="mt-16">
		<h2 class="flex items-baseline gap-4 font-sans text-sm font-semibold tracking-[0.08em] uppercase">
			What this project is
			<span class="rule h-px flex-1 bg-line" aria-hidden="true"></span>
		</h2>
		<p class="mt-6">
			An attempt to make the canvas cost nothing to keep. Most canvases die as whiteboard
			photos; this one is a small file that lives in your repository, renders as the sheet
			everywhere it is read, and behaves like the source code beside it — checked, formatted,
			diffed. Four surfaces, one sheet:
		</p>
		<dl class="mt-8 space-y-6">
			{#each tools as tool (tool.term)}
				<div class="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-6">
					<dt class="font-mono text-sm font-medium not-italic">{tool.term}</dt>
					<dd class="text-base leading-relaxed text-ink-soft">{tool.def}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section use:reveal class="mt-16">
		<h2 class="flex items-baseline gap-4 font-sans text-sm font-semibold tracking-[0.08em] uppercase">
			The plates
			<span class="rule h-px flex-1 bg-line" aria-hidden="true"></span>
		</h2>
		<p class="mt-6">
			Four invented domains, from a canvas with every section filled to one captured
			mid-workshop. All four ship in the editor's Examples menu, ready to be rewritten into
			yours.
		</p>
		{#each plates as plate (plate.numeral)}
			<figure use:reveal class="mt-10">
				<div class="border border-line bg-sheet p-1.5">
					<img src={plate.src} alt="The {plate.name} canvas as a rendered sheet" class="h-auto w-full" width="1440" height="1292" loading="lazy" />
				</div>
				<figcaption class="mt-3 text-sm text-ink-soft">
					<span class="font-sans font-semibold text-ink">Plate {plate.numeral}</span> —
					<span class="text-ink">{plate.name}</span>: {plate.line}
				</figcaption>
			</figure>
		{/each}
	</section>

	<section use:reveal class="mt-20 border border-line bg-sheet p-8 text-center sm:p-12">
		<p class="text-2xl italic">The pad is blank.</p>
		<a
			href="/"
			class="mt-6 inline-block rounded-[4px] bg-ink px-6 py-2.5 font-sans text-sm font-semibold not-italic text-sheet transition-transform duration-200 hover:-translate-y-0.5"
		>
			Open the editor
		</a>
		<p class="mt-4 font-sans text-sm not-italic text-ink-soft">
			No account. The canvas stays on your machine until you export it.
		</p>
	</section>

	<footer use:reveal class="mt-20 border-t border-line pt-6 text-center text-sm italic text-ink-soft">
		The Bounded Context Canvas is by the
		<a href="https://github.com/ddd-crew/bounded-context-canvas" class="underline underline-offset-2 hover:text-ink">ddd-crew</a>,
		licensed CC BY 4.0.<br />
		The example canvases are invented domains, published under the same attribution.
	</footer>
</article>

<style>
	@media (prefers-reduced-motion: no-preference) {
		:global(.pending) {
			opacity: 0;
			transform: translateY(12px);
		}
		:global(.pending.in) {
			opacity: 1;
			transform: translateY(0);
			transition:
				opacity 500ms cubic-bezier(0.2, 0, 0, 1),
				transform 500ms cubic-bezier(0.2, 0, 0, 1);
		}
		/* The section rules draw in from the heading once revealed. */
		:global(.pending) .rule {
			transform: scaleX(0);
			transform-origin: left;
		}
		:global(.pending.in) .rule {
			transform: scaleX(1);
			transition: transform 600ms cubic-bezier(0.2, 0, 0, 1) 150ms;
		}
	}
</style>
