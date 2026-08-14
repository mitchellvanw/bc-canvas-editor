<script lang="ts">
	/**
	 * The homepage: what the Bounded Context Canvas is for, what this project
	 * does about it, and every door into the editor at /edit. Grown from the
	 * /prototype-home variant D prototype (primary source on the
	 * proto/homepage-variants branch): C's wall hero over A's sheet hero, the
	 * deciding-statement, the life of one file in five stations, the example
	 * grid with real per-canvas stats, a blank-canvas card, the ddd-crew
	 * attribution, and a "You made it to the end." finale.
	 *
	 * Every door runs through enterEditor(): ride to the end of the page so
	 * the reader sees it complete, a beat on the finale, then navigate.
	 * Example and blank-canvas doors load the document first — replace()
	 * autosaves synchronously, so the editor's restore() on /edit picks it
	 * up — behind the same replace dialog the editor's chrome uses when the
	 * current canvas has unexported changes.
	 */
	import { goto } from '$app/navigation';
	import { EXAMPLES, type ExampleEntry } from '$lib/chrome/examples';
	import { canvas } from '$lib/editor/document.svelte';
	import { blankCanvas, stampIds, type CanvasDoc } from '$lib/model/canvas';
	import orderSvg from '../../../examples/order-fulfillment.bcc.svg?url';

	// The chip stack: the palette legend doubling as the pitch. A tidy column
	// beside the headline from md up; below that, a loose two-column wall
	// cluster (`wall`) — a stacked list of wide bars read as boring.
	const chips = [
		{ bg: 'bg-command', ink: 'text-command-ink', border: 'border-command-ink', tilt: 'md:-rotate-1', wall: 'max-md:-rotate-2 max-md:translate-y-1', kind: 'command', text: 'What it is told to do' },
		{ bg: 'bg-event', ink: 'text-event-ink', border: 'border-event-ink', tilt: 'md:rotate-[1.5deg]', wall: 'max-md:rotate-[2.5deg] max-md:translate-y-6', kind: 'event', text: 'What it announces happened' },
		{ bg: 'bg-query', ink: 'text-query-ink', border: 'border-query-ink', tilt: 'md:rotate-[-0.5deg]', wall: 'max-md:rotate-[-1.5deg] max-md:-translate-y-1', kind: 'query', text: 'What it will answer' },
		{ bg: 'bg-policy', ink: 'text-policy-ink', border: 'border-policy-ink', tilt: 'md:rotate-1', wall: 'max-md:rotate-[1.8deg] max-md:translate-y-4', kind: 'policy', text: 'The rules it enforces' },
		{ bg: 'bg-collaborator', ink: 'text-collaborator-ink', border: 'border-collaborator-ink', tilt: 'md:rotate-[-1.5deg]', wall: 'max-md:rotate-[-2deg] max-md:col-span-2 max-md:w-3/4 max-md:translate-y-3 max-md:justify-self-center', kind: 'collaborator', text: 'Who is on the other end' }
	];

	const NPX_LINE = 'npx --yes github:mitchellvanw/bc-canvas-editor ls';
	let copied = $state(false);

	async function copyNpx() {
		await navigator.clipboard.writeText(NPX_LINE);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}

	// The example grid: name, purpose and stats read off the real canvas
	// files, through the same registry as the editor's Examples menu.
	const examples = EXAMPLES.map((entry) => ({
		entry,
		domain: entry.file.strategicClassification.domain,
		stats: [
			{ dot: 'bg-command', count: entry.file.inboundCommunication.reduce((n, l) => n + l.messages.length, 0), label: 'in' },
			{ dot: 'bg-event', count: entry.file.outboundCommunication.reduce((n, l) => n + l.messages.length, 0), label: 'out' },
			{ dot: 'bg-term', count: entry.file.ubiquitousLanguage.length, label: 'terms' },
			{ dot: 'bg-hotspot', count: entry.file.openQuestions.length, label: 'open' }
		]
	}));

	// The tools grid: one card per tool, each linking to its section of the
	// docs. The dots reuse the journey's station colors, so the grid reads
	// as the index of the story above it.
	const tools = [
		{ href: '/docs#editor', dot: 'bg-event border-event-ink', name: 'The editor', text: 'The sheet, edited in place in the browser. Nothing leaves the machine until you export.' },
		{ href: '/docs#cli', dot: 'bg-ink border-ink', name: 'The command line', text: 'bcc lists, checks, formats and renders the canvases in a repo — through npx, nothing to install.' },
		{ href: '/docs#fence', dot: 'bg-term border-term-ink', name: 'The bcc fence', text: 'One fence, one path: the sheet drawn inside any markdown file that gets built or previewed.' },
		{ href: '/docs#remark', dot: 'bg-query border-query-ink', name: 'The remark plugin', text: 'Draws the fence when a site builds — Astro, Docusaurus, anything on unified.' },
		{ href: '/docs#vscode', dot: 'bg-policy border-policy-ink', name: 'The VS Code extension', text: 'Draws the fence in the markdown preview, and redraws it the moment the canvas changes.' },
		{ href: '/docs#mcp', dot: 'bg-collaborator border-collaborator-ink', name: 'The MCP server & plugin', text: 'Reads a canvas into a conversation; the plugin adds the workshop, the drafting pass and a reviewer.' }
	];

	// Confetti for the finale: the palette as little chips around the heading.
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

	let party = $state(false);
	let entering = false;

	/** Replace dialog, same shape as the editor chrome's confirm-example. */
	let pending = $state<{ what: string; doc: () => CanvasDoc } | null>(null);
	let dialogEl = $state<HTMLDialogElement>();
	const currentName = $derived(canvas.doc.name.trim());

	function openAsModal(node: HTMLDialogElement) {
		node.showModal();
	}

	function tweenScroll(to: number, ms: number): Promise<void> {
		return new Promise((resolve) => {
			const from = window.scrollY;
			const t0 = performance.now();
			const ease = (t: number) => 1 - Math.pow(1 - t, 3);
			function frame(now: number) {
				const t = Math.min(1, (now - t0) / ms);
				window.scrollTo(0, from + (to - from) * ease(t));
				if (t < 1) requestAnimationFrame(frame);
				else resolve();
			}
			requestAnimationFrame(frame);
		});
	}

	/** Every door lands here: ride to the end so the reader sees the page
	 * complete, the shortest beat on the finale, then navigate. */
	async function enterEditor(prepare?: () => void) {
		if (entering) return;
		entering = true;
		try {
			prepare?.();
			if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				const max = document.documentElement.scrollHeight - window.innerHeight;
				const distance = Math.abs(max - window.scrollY);
				if (distance > 2) {
					await tweenScroll(max, Math.min(900, 300 + distance * 0.2));
				}
				party = true;
				await new Promise((r) => setTimeout(r, 250));
			}
			await goto('/edit');
		} finally {
			entering = false;
		}
	}

	function openEditor(event: Event) {
		event.preventDefault();
		void enterEditor();
	}

	/** A door that replaces the canvas asks first when there is unexported
	 * work — the same gate the editor's Examples menu holds. */
	function openWith(what: string, doc: () => CanvasDoc) {
		if (canvas.unexported) {
			pending = { what, doc };
			return;
		}
		void enterEditor(() => canvas.replace(doc()));
	}

	function proceed() {
		const { doc } = pending!;
		dialogEl?.close();
		void enterEditor(() => canvas.replace(doc()));
	}

	const openExample = (entry: ExampleEntry) => openWith('an example', () => stampIds(entry.file));
	const openBlank = () => openWith('a blank canvas', blankCanvas);

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
			{ rootMargin: '0px 0px -8% 0px' }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}

	/** The confetti pops the first time the finale scrolls into view. */
	function armParty(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					party = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '0px 0px -20% 0px' }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

<svelte:head>
	<title>BC Canvas</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-5 pt-6 sm:px-8">
	<header class="flex items-baseline justify-between">
		<span class="text-lg font-bold tracking-tight">BC Canvas</span>
		<div class="flex items-baseline gap-5">
			<a href="/docs" class="text-sm font-medium text-ink-soft hover:text-ink">Docs</a>
			<a href="/edit" onclick={openEditor} class="rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper">
				Open the editor
			</a>
		</div>
	</header>

	<!-- The wall: headline left, the chip stack right. -->
	<section class="mt-14 grid items-start gap-12 md:grid-cols-[1.2fr_1fr] md:gap-10 lg:gap-8">
		<div>
			<h1 class="text-5xl leading-[1.04] font-bold tracking-tight text-balance sm:text-6xl md:text-5xl lg:text-6xl xl:text-7xl">
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
					href="/edit"
					onclick={openEditor}
					class="rounded-[4px] bg-ink px-6 py-3 text-sm font-semibold text-sheet transition-transform duration-200 hover:-translate-y-0.5"
				>
					Open the editor
				</a>
				<button
					type="button"
					onclick={copyNpx}
					class="group flex max-w-full items-center gap-3 rounded-[4px] border border-line bg-sheet px-4 py-3 font-mono text-xs hover:bg-paper xl:text-sm"
				>
					<span class="text-ink-faint">$</span>
					{NPX_LINE}
					<span class="shrink-0 text-ink-soft group-hover:text-ink" aria-hidden="true">
						{#if copied}
							<svg class="h-4 w-4 text-query-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
								<path d="M20 6 9 17l-5-5" />
							</svg>
						{:else}
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
								<rect x="9" y="9" width="13" height="13" rx="2" />
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
							</svg>
						{/if}
					</span>
					<span class="sr-only" aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
				</button>
			</div>
		</div>

		<figure class="mx-auto w-full max-w-sm max-md:max-w-lg md:mt-2">
			<ul class="max-md:grid max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-5 md:space-y-3">
				{#each chips as chip, i (chip.kind)}
					<li
						class="chip {chip.bg} {chip.tilt} {chip.wall} border {chip.border} px-4 py-3 shadow-[2px_3px_0_rgb(26_30_32/0.12)]"
						style="--i: {i}"
					>
						<span class="font-mono text-[11px] font-medium tracking-wide {chip.ink}">{chip.kind}</span>
						<span class="mt-0.5 block font-medium">{chip.text}</span>
					</li>
				{/each}
			</ul>
			<figcaption class="mt-8 text-sm text-ink-soft max-md:text-center md:mt-4">
				Each of these has a fixed place on the sheet. Filling them in is the workshop.
			</figcaption>
		</figure>
	</section>
</div>

<div class="mx-auto max-w-6xl px-5 sm:px-8">
	<!-- Why write it down: the statement, with margin notes. -->
	<section use:reveal class="mt-32 grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:gap-16">
		<div>
			<p class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">Why write it down</p>
			<p class="mt-6 font-serif text-3xl leading-snug italic sm:text-[2.6rem]">
				Documentation is not the point — <span class="font-sans font-bold not-italic">deciding</span>
				is.
			</p>
			<p class="mt-8 max-w-2xl font-serif text-lg leading-relaxed text-ink-soft">
				Every field on the sheet is a small verdict: the purpose has to fit in one sentence,
				every message needs a named sender, and <span class="term-mark">Shipment</span> gets the
				one definition the whole team will use. What a wiki page lets you leave vague, the
				canvas makes you put in writing — where everyone can point at it.
			</p>
		</div>
		<div class="flex flex-row gap-5 lg:mt-10 lg:flex-col">
			<div class="max-w-60 -rotate-1 border border-line bg-sheet p-5 shadow-[2px_3px_0_rgb(26_30_32/0.10)]">
				<p class="font-mono text-[11px] font-medium tracking-wide text-ink-faint">field note</p>
				<p class="mt-1 text-sm leading-relaxed">
					Names get sharp the moment they are written where the whole team can see them.
				</p>
			</div>
			<div class="max-w-60 rotate-[1.2deg] border border-line bg-sheet p-5 shadow-[2px_3px_0_rgb(26_30_32/0.10)] lg:ml-10">
				<p class="font-mono text-[11px] font-medium tracking-wide text-ink-faint">field note</p>
				<p class="mt-1 text-sm leading-relaxed">
					The gaps you leave showing are the agenda for the next workshop.
				</p>
			</div>
		</div>
	</section>

	<!-- The life of one file: the tooling story told as a journey. -->
	<section class="mt-32">
		<p class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">
			The life of one file
		</p>
		<p class="mt-4 max-w-2xl font-serif text-lg leading-relaxed">
			Most canvases die as whiteboard photos. This one is a small <span class="font-mono text-base">.bcc.json</span>
			that keeps working after the workshop ends — the same sheet drawn by every tool that touches it.
		</p>

		<div class="relative mt-12">
			<div class="absolute top-2 bottom-2 left-[1.18rem] border-l-2 border-dashed border-line" aria-hidden="true"></div>

			<!-- 01 · the workshop -->
			<div use:reveal class="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-5 pb-14 sm:gap-x-6 lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.05fr)]">
				<span class="station-dot bg-event border-event-ink"></span>
				<div>
					<p class="font-mono text-xs text-ink-faint">01</p>
					<h3 class="mt-1 text-xl font-semibold">Born on a workshop wall</h3>
					<p class="mt-2 text-sm leading-relaxed text-ink-soft">
						The sheet starts in the editor — projected, argued over, filled in live. Command,
						event, query: the workshop's grammar is already printed on it.
					</p>
				</div>
				<div class="col-start-2 max-w-xl overflow-hidden rounded-[4px] border border-line bg-sheet shadow-sm lg:col-start-3 lg:row-start-1 lg:max-w-none">
					<div class="flex items-center gap-1.5 border-b border-line px-3 py-2">
						<span class="h-2 w-2 rounded-full bg-line"></span>
						<span class="h-2 w-2 rounded-full bg-line"></span>
						<span class="h-2 w-2 rounded-full bg-line"></span>
						<span class="ml-3 rounded-full bg-paper px-3 py-0.5 font-mono text-[10px] text-ink-soft">bc-canvas.pages.dev</span>
					</div>
					<img src={orderSvg} alt="" class="h-44 w-full object-cover object-top" width="1440" height="1292" loading="lazy" />
				</div>
			</div>

			<!-- 02 · the repo -->
			<div use:reveal class="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-5 pb-14 sm:gap-x-6 lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.05fr)]">
				<span class="station-dot bg-ink border-ink"></span>
				<div>
					<p class="font-mono text-xs text-ink-faint">02</p>
					<h3 class="mt-1 text-xl font-semibold">Committed beside the code</h3>
					<p class="mt-2 text-sm leading-relaxed text-ink-soft">
						In the repo it behaves like source: <span class="font-mono">check</span> reads through
						the editor's own parser, <span class="font-mono">fmt</span> writes canonical bytes,
						diffs stay honest.
					</p>
				</div>
				<div class="col-start-2 max-w-xl rounded-[4px] bg-ink p-4 font-mono text-xs leading-relaxed text-paper shadow-sm lg:col-start-3 lg:row-start-1 lg:max-w-none">
					<p><span class="text-ink-faint">$</span> npx --yes github:mitchellvanw/bc-canvas-editor check</p>
					<p class="mt-1 text-query">4 canvases check out.</p>
					<p class="text-query">4 images match the canvas beside them.</p>
				</div>
			</div>

			<!-- 03 · the docs -->
			<div use:reveal class="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-5 pb-14 sm:gap-x-6 lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.05fr)]">
				<span class="station-dot bg-query border-query-ink"></span>
				<div>
					<p class="font-mono text-xs text-ink-faint">03</p>
					<h3 class="mt-1 text-xl font-semibold">Drawn in the docs</h3>
					<p class="mt-2 text-sm leading-relaxed text-ink-soft">
						A fence in any markdown file points at the canvas, and the remark plugin draws the
						sheet when the site builds. One path in the fence, nothing else.
					</p>
				</div>
				<div class="col-start-2 max-w-xl rounded-[4px] border border-line bg-sheet p-4 font-mono text-xs leading-relaxed shadow-sm lg:col-start-3 lg:row-start-1 lg:max-w-none">
					<p class="text-ink-faint">```bcc</p>
					<p class="pl-4">../canvases/order-fulfillment.bcc.json</p>
					<p class="text-ink-faint">```</p>
				</div>
			</div>

			<!-- 04 · while you write -->
			<div use:reveal class="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-5 pb-14 sm:gap-x-6 lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.05fr)]">
				<span class="station-dot bg-policy border-policy-ink"></span>
				<div>
					<p class="font-mono text-xs text-ink-faint">04</p>
					<h3 class="mt-1 text-xl font-semibold">Live while you write</h3>
					<p class="mt-2 text-sm leading-relaxed text-ink-soft">
						The VS Code extension draws the same fence in the markdown preview and redraws it the
						moment the canvas beside it changes.
					</p>
				</div>
				<div class="col-start-2 max-w-xl overflow-hidden rounded-[4px] border border-line bg-[#22262a] shadow-sm lg:col-start-3 lg:row-start-1 lg:max-w-none">
					<p class="border-b border-white/10 px-3 py-2 font-mono text-[10px] text-paper/70">orders.md — Preview</p>
					<div class="grid grid-cols-2">
						<div class="space-y-1.5 p-3 font-mono text-[10px] leading-relaxed text-paper/80">
							<p class="text-paper/50"># Order flow</p>
							<p>The fulfillment context</p>
							<p>owns this handoff:</p>
							<p class="text-query">```bcc</p>
							<p class="pl-2">./orders.bcc.json</p>
							<p class="text-query">```</p>
						</div>
						<div class="border-l border-white/10 bg-sheet p-2">
							<img src={orderSvg} alt="" class="h-full w-full object-cover object-top" width="1440" height="1292" loading="lazy" />
						</div>
					</div>
				</div>
			</div>

			<!-- 05 · the conversation -->
			<div use:reveal class="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-5 sm:gap-x-6 lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.05fr)]">
				<span class="station-dot bg-collaborator border-collaborator-ink"></span>
				<div>
					<p class="font-mono text-xs text-ink-faint">05</p>
					<h3 class="mt-1 text-xl font-semibold">Read aloud in a conversation</h3>
					<p class="mt-2 text-sm leading-relaxed text-ink-soft">
						The MCP server reads the canvas as prose and explains what each section is for, so the
						whole context fits in a conversation with an agent.
					</p>
				</div>
				<div class="col-start-2 max-w-xl space-y-2 text-sm lg:col-start-3 lg:row-start-1 lg:max-w-none">
					<p class="ml-auto w-fit max-w-[85%] rounded-[4px] bg-ink px-4 py-2.5 text-paper">
						What does Order Fulfillment promise downstream?
					</p>
					<p class="w-fit max-w-[90%] rounded-[4px] border border-line bg-sheet px-4 py-2.5 leading-relaxed">
						It announces <span class="rounded-[3px] border border-event-ink bg-event px-1.5 py-0.5 font-mono text-xs text-ink">Order Shipped</span>
						to Notifications and the Carriers — and it stops owning the order once picking starts.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- The tools: the journey's stations as an index, each card a door
	     into its section of the docs. -->
	<section use:reveal class="mt-32">
		<p class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">The tools</p>
		<p class="mt-4 max-w-2xl font-serif text-lg leading-relaxed">
			Each station above is a tool you can pick up on its own. <a href="/docs" class="underline underline-offset-2">The docs</a>
			cover every one end to end — install, the day-to-day commands, and the edges where it stops.
		</p>

		<div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each tools as tool (tool.href)}
				<a
					href={tool.href}
					class="group flex flex-col border border-line bg-sheet p-5 transition-transform duration-200 hover:-translate-y-0.5"
				>
					<div class="flex items-center gap-2.5">
						<span class="h-2.5 w-2.5 border {tool.dot}" aria-hidden="true"></span>
						<h3 class="font-semibold">{tool.name}</h3>
					</div>
					<p class="mt-2 flex-1 font-serif text-sm leading-relaxed text-ink-soft">
						{tool.text}
					</p>
					<span class="mt-4 text-sm font-medium text-ink-soft group-hover:text-ink">
						Read the docs <span aria-hidden="true">→</span>
					</span>
				</a>
			{/each}
		</div>
	</section>

	<!-- The examples: real canvases, opened into the real editor. -->
	<section use:reveal class="mt-32">
		<p class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">The examples</p>
		<p class="mt-4 max-w-2xl font-serif text-lg leading-relaxed">
			Four invented domains ship with the editor — from every section filled to mid-workshop,
			open questions still winning. Open the closest one and rewrite it into yours.
		</p>

		<div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
			{#each examples as ex (ex.entry.name)}
				<article class="flex flex-col border border-line bg-sheet p-5">
					<div class="flex items-baseline justify-between gap-3">
						<h3 class="font-semibold">{ex.entry.name}</h3>
						{#if ex.domain}
							<span class="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wide text-ink-soft">
								{ex.domain}
							</span>
						{/if}
					</div>
					<p class="mt-2 flex-1 font-serif text-sm leading-relaxed text-ink-soft">
						{ex.entry.file.purpose}
					</p>
					<dl class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[11px] text-ink-soft">
						{#each ex.stats as stat (stat.label)}
							<div class="flex items-center gap-1.5">
								<dt><span class="block h-2 w-2 rounded-full {stat.dot}" aria-hidden="true"></span><span class="sr-only">{stat.label}</span></dt>
								<dd>{stat.count} {stat.label}</dd>
							</div>
						{/each}
					</dl>
					<button
						type="button"
						class="mt-5 self-start rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper"
						onclick={() => openExample(ex.entry)}
					>
						Open in editor
					</button>
				</article>
			{/each}
		</div>

		<!-- The other door: none of these — a blank sheet. Dashed like the
		     editor's own empty-state affordances. -->
		<div use:reveal class="mt-12">
			<p class="text-center font-mono text-sm text-ink-faint">or</p>
			<div class="mx-auto mt-4 max-w-sm border border-dashed border-ink-faint bg-sheet p-6 text-center">
				<h3 class="font-semibold">Blank canvas</h3>
				<p class="mt-1.5 font-serif text-sm leading-relaxed text-ink-soft">
					Eleven empty sections and a name to pick.
				</p>
				<button
					type="button"
					onclick={openBlank}
					class="mt-4 rounded-[4px] bg-ink px-5 py-2.5 text-sm font-semibold text-sheet transition-transform duration-200 hover:-translate-y-0.5"
				>
					Open blank canvas
				</button>
				<p class="mt-3 text-xs text-ink-soft">Nothing leaves your machine.</p>
			</div>
		</div>
	</section>

	<!-- The attribution, pinned. -->
	<section use:reveal class="mt-32 flex justify-center">
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

<!-- The finale: the page is over, and says so. -->
<section use:armParty class="relative mx-auto max-w-2xl px-5 pt-24 pb-28 text-center" class:party>
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
	<a
		href="/edit"
		onclick={openEditor}
		class="mt-7 inline-block rounded-[4px] bg-ink px-7 py-3 text-sm font-semibold text-sheet transition-transform duration-200 hover:-translate-y-0.5"
	>
		Enter the editor
	</a>
</section>

{#if pending}
	<dialog
		bind:this={dialogEl}
		use:openAsModal
		onclose={() => (pending = null)}
		class="m-auto w-[26rem] rounded-[6px] border border-line bg-sheet p-6 text-ink shadow-lg backdrop:bg-ink/30"
	>
		<h2 class="font-bold">
			Replace {currentName === '' ? 'this canvas' : `"${currentName}"`}?
		</h2>
		<p class="mt-2 text-sm text-ink/75">
			Its latest changes haven't been exported. Opening {pending.what} replaces the canvas and
			clears undo history.
		</p>
		<div class="mt-6 flex justify-end gap-2">
			<button
				type="button"
				class="rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-paper"
				onclick={() => dialogEl?.close()}
			>
				Cancel
			</button>
			<button
				type="button"
				class="rounded-[4px] bg-ink px-3 py-1.5 text-sm font-medium text-sheet hover:bg-ink/85"
				onclick={proceed}
			>
				Replace
			</button>
		</div>
	</dialog>
{/if}

<style>
	/* Marker underlines: a thick palette stroke under the load-bearing words.
	   Drawn as a bottom-aligned gradient so on load each stroke can swipe in
	   left to right, one after the other, once the chip stack has pinned. */
	.underline-event,
	.underline-command {
		background-repeat: no-repeat;
		background-position: left bottom;
		background-size: 100% 0.18em;
	}
	.underline-event {
		background-image: linear-gradient(var(--color-event), var(--color-event));
	}
	.underline-command {
		background-image: linear-gradient(var(--color-command), var(--color-command));
	}
	/* The sheet's own ubiquitous-term treatment (CanvasSheet .terms dt):
	   mono over a highlighter stroke through the glyphs' lower half. */
	.term-mark {
		padding: 0 0.15rem;
		font-family: var(--font-mono);
		font-size: 0.85em;
		font-weight: 500;
		color: var(--color-ink);
		background: linear-gradient(
			transparent 45%,
			var(--color-term) 45%,
			var(--color-term) 92%,
			transparent 92%
		);
	}

	.station-dot {
		position: relative;
		z-index: 1;
		margin-top: 0.3rem;
		display: block;
		height: 1.05rem;
		width: 1.05rem;
		border-width: 1px;
		box-shadow: 1px 2px 0 rgb(26 30 32 / 0.12);
	}

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
		.chip {
			animation: pin 400ms cubic-bezier(0.2, 0, 0, 1) both;
			animation-delay: calc(180ms + var(--i) * 90ms);
		}

		/* The last chip settles at ~940ms; the marker strokes follow it. */
		.underline-event,
		.underline-command {
			background-size: 0% 0.18em;
			animation: swipe 480ms cubic-bezier(0.2, 0, 0, 1) both;
		}
		.underline-event {
			animation-delay: 1020ms;
		}
		.underline-command {
			animation-delay: 1290ms;
		}
		@keyframes swipe {
			to {
				background-size: 100% 0.18em;
			}
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

	@keyframes pin {
		from {
			opacity: 0;
			transform: translateY(6px) scale(1.03);
		}
	}
</style>
