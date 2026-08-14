<script lang="ts">
	/**
	 * PROTOTYPE — throwaway. Variant C: "The workshop wall."
	 * Spatial and palette-forward: the pitch is written on the EventStorming
	 * chips themselves, so the visitor learns the canvas's color system while
	 * being sold on it. Tooling is a terminal block, examples are a shelf, and
	 * the ddd-crew tribute is a pinned note. Dual affordance: open the editor,
	 * or copy the npx line.
	 */
	import appointmentSvg from './assets/appointment-scheduling.bcc.svg?url';
	import notificationsSvg from './assets/notifications.bcc.svg?url';
	import orderSvg from './assets/order-fulfillment.bcc.svg?url';
	import royaltySvg from './assets/royalty-distribution.bcc.svg?url';

	const NPX_LINE = 'npx --yes github:mitchellvanw/bc-canvas-editor ls';
	let copied = $state(false);

	async function copyNpx() {
		await navigator.clipboard.writeText(NPX_LINE);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}

	// The chips carry the argument: each one is a real slot on the canvas.
	const chips = [
		{ bg: 'bg-command', ink: 'text-command-ink', border: 'border-command-ink', tilt: '-rotate-1', kind: 'command', text: 'What it is told to do' },
		{ bg: 'bg-event', ink: 'text-event-ink', border: 'border-event-ink', tilt: 'rotate-[1.5deg]', kind: 'event', text: 'What it announces happened' },
		{ bg: 'bg-query', ink: 'text-query-ink', border: 'border-query-ink', tilt: 'rotate-[-0.5deg]', kind: 'query', text: 'What it will answer' },
		{ bg: 'bg-policy', ink: 'text-policy-ink', border: 'border-policy-ink', tilt: 'rotate-1', kind: 'policy', text: 'The rules it enforces' },
		{ bg: 'bg-collaborator', ink: 'text-collaborator-ink', border: 'border-collaborator-ink', tilt: 'rotate-[-1.5deg]', kind: 'collaborator', text: 'Who is on the other end' }
	];

	const cards = [
		{ head: 'The sheet is the document', body: 'Edits happen inline on the rendered canvas. What you see is what exports — HTML artifact, PNG, SVG, or Markdown.' },
		{ head: 'The file stays yours', body: 'A small .bcc.json on your machine, in your repo. No accounts, no server, nothing to sync.' },
		{ head: 'It behaves like source', body: 'bcc check reads through the editor’s own parser; bcc fmt writes canonical bytes. Diffs stay honest.' }
	];

	const shelf = [
		{ src: orderSvg, name: 'Order Fulfillment', line: 'Coordinates picking, packing and shipping once an order is paid.' },
		{ src: notificationsSvg, name: 'Notifications', line: 'Delivers order updates to customers on their preferred channel.' },
		{ src: appointmentSvg, name: 'Appointment Scheduling', line: 'Books patients into clinic slots and keeps no-shows down.' },
		{ src: royaltySvg, name: 'Royalty Distribution', line: 'Splits streaming revenue among rights holders. Captured mid-workshop.' }
	];

	/** Scroll reveal, shared easing with the chip pin-in. */
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
			{ rootMargin: '0px 0px -8% 0px' }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

<div class="mx-auto max-w-6xl px-5 pt-6 pb-24 sm:px-8">
	<header class="flex items-baseline justify-between">
		<span class="text-lg font-bold tracking-tight">BC Canvas</span>
		<a href="/" class="rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper">
			Open the editor
		</a>
	</header>

	<!-- The wall: headline left, the chip stack right. -->
	<section class="mt-14 grid items-start gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-8">
		<div>
			<h1 class="text-5xl leading-[1.04] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
				Put the system <span class="underline-event">on the wall</span>, one context
				<span class="underline-command">at a time</span>.
			</h1>
			<p class="mt-6 max-w-xl font-serif text-lg leading-relaxed text-ink-soft">
				The Bounded Context Canvas gives every part of a system one loud page: what it is for,
				what it listens to, what it promises. This is an editor, a CLI, an MCP server and a
				markdown fence for exactly that page — and the file never leaves your repo.
			</p>
			<div class="mt-8 flex flex-wrap items-center gap-3">
				<a
					href="/"
					class="rounded-[4px] bg-ink px-6 py-3 text-sm font-semibold text-sheet transition-transform duration-200 hover:-translate-y-0.5"
				>
					Open the editor
				</a>
				<button
					type="button"
					onclick={copyNpx}
					class="group flex items-center gap-3 rounded-[4px] border border-line bg-sheet px-4 py-3 font-mono text-xs hover:bg-paper sm:text-sm"
				>
					<span class="text-ink-faint">$</span>
					{NPX_LINE}
					<span class="font-sans text-xs font-semibold text-ink-soft group-hover:text-ink">
						{copied ? 'Copied' : 'Copy'}
					</span>
				</button>
			</div>
		</div>

		<figure class="chip-stack mx-auto w-full max-w-sm lg:mt-2">
			<ul class="space-y-3">
				{#each chips as chip, i (chip.kind)}
					<li
						class="chip {chip.bg} {chip.tilt} border {chip.border} px-4 py-3 shadow-[2px_3px_0_rgb(26_30_32/0.12)]"
						style="--i: {i}"
					>
						<span class="font-mono text-[11px] font-medium tracking-wide {chip.ink}">{chip.kind}</span>
						<span class="mt-0.5 block font-medium">{chip.text}</span>
					</li>
				{/each}
			</ul>
			<figcaption class="mt-4 text-sm text-ink-soft">
				Each of these has a fixed place on the sheet. Filling them in is the workshop.
			</figcaption>
		</figure>
	</section>

	<!-- The band: what the project does, and the terminal to prove it. -->
	<section use:reveal class="mt-24 grid gap-6 lg:grid-cols-3">
		{#each cards as card (card.head)}
			<div class="border border-line bg-sheet p-6">
				<h2 class="font-semibold">{card.head}</h2>
				<p class="mt-2 text-sm leading-relaxed text-ink-soft">{card.body}</p>
			</div>
		{/each}
	</section>

	<section use:reveal class="mt-6 overflow-x-auto rounded-[4px] bg-ink p-6 font-mono text-[13px] leading-relaxed text-paper">
		<p><span class="text-ink-faint">$</span> npx --yes github:mitchellvanw/bc-canvas-editor ls</p>
		<p class="mt-2 whitespace-pre">order-fulfillment.bcc.json      Order Fulfillment        11/11 sections</p>
		<p class="whitespace-pre">notifications.bcc.json          Notifications             9/11 sections</p>
		<p class="whitespace-pre">royalty-distribution.bcc.json   Royalty Distribution      6/11 sections</p>
		<p class="mt-2"><span class="text-ink-faint">$</span> npx --yes github:mitchellvanw/bc-canvas-editor check</p>
		<p class="text-query">all canvases read; images current</p>
	</section>

	<!-- The shelf: four real canvases. -->
	<section use:reveal class="mt-24">
		<h2 class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">
			Taken off a real wall
		</h2>
		<div class="-mx-5 mt-5 flex snap-x gap-5 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8">
			{#each shelf as ex (ex.name)}
				<figure class="w-72 shrink-0 snap-start">
					<div class="border border-line bg-sheet p-1 transition-transform duration-200 hover:-translate-y-1">
						<img src={ex.src} alt="The {ex.name} canvas as a rendered sheet" class="h-auto w-full" width="1440" height="1292" loading="lazy" />
					</div>
					<figcaption class="mt-2 text-sm">
						<span class="font-medium">{ex.name}</span>
						<span class="block text-xs leading-snug text-ink-soft">{ex.line}</span>
					</figcaption>
				</figure>
			{/each}
		</div>
		<p class="mt-2 text-sm text-ink-soft">All four ship in the editor's Examples menu.</p>
	</section>

	<!-- The pinned credit. -->
	<section use:reveal class="mt-24 flex justify-center">
		<div class="max-w-md rotate-1 border border-term-ink bg-term px-6 py-5 text-center shadow-[2px_3px_0_rgb(26_30_32/0.12)]">
			<p class="font-mono text-[11px] font-medium tracking-wide text-term-ink">attribution</p>
			<p class="mt-1 text-sm leading-relaxed">
				The Bounded Context Canvas is by the
				<a href="https://github.com/ddd-crew/bounded-context-canvas" class="font-medium underline underline-offset-2">ddd-crew</a>,
				licensed CC BY 4.0. This wall just holds the paper.
			</p>
		</div>
	</section>
</div>

<style>
	/* Marker underlines: a thick palette stroke under the load-bearing words. */
	.underline-event {
		box-shadow: inset 0 -0.18em 0 0 var(--color-event);
	}
	.underline-command {
		box-shadow: inset 0 -0.18em 0 0 var(--color-command);
	}

	@media (prefers-reduced-motion: no-preference) {
		/* Chips pin onto the wall one after another on load. */
		.chip {
			animation: pin 400ms cubic-bezier(0.2, 0, 0, 1) both;
			animation-delay: calc(180ms + var(--i) * 90ms);
		}

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
	}

	@keyframes pin {
		from {
			opacity: 0;
			transform: translateY(6px) scale(1.03) rotate(0deg);
		}
	}
</style>
