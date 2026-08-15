<script lang="ts">
	/**
	 * PROTOTYPE — throwaway. Ticket 066, "where the Markdown ends and the Svelte
	 * furniture begins."
	 *
	 * One real section — `#remark`, the richest on /docs — rendered four ways:
	 * as it is today, and under each of the three candidate seams. The point is
	 * to see where the seam lands, so switch shapes and watch which furniture
	 * survives and what the source costs to write.
	 *
	 * The `<style>` block below is copied VERBATIM from web/src/routes/docs/
	 * +page.svelte:607–778, scoping and all. That is deliberate: Svelte scopes
	 * CSS by stamping a class onto elements in the TEMPLATE, and {@html} content
	 * never gets stamped. `?css=global` re-declares the same rules under
	 * :global() so the difference is visible rather than argued.
	 *
	 * Delete this route with the branch.
	 */
	let { data } = $props();

	type Shape = 'today' | 'a' | 'b' | 'c';
	let shape = $state<Shape>('today');
	let globalCss = $state(false);
	let showSource = $state(true);

	const SHAPES: { id: Shape; label: string; blurb: string }[] = [
		{ id: 'today', label: 'today', blurb: 'hand-authored Svelte — the reference' },
		{ id: 'a', label: 'A · one body', blurb: 'Markdown supplies the whole section interior' },
		{ id: 'b', label: 'B · fragments', blurb: 'named slices the shell interleaves with furniture' },
		{ id: 'c', label: 'C · directives', blurb: 'one file, a vocabulary for the furniture' }
	];

	const section = {
		id: 'remark',
		chip: 'bg-query border-query-ink text-query-ink',
		label: 'remark',
		title: 'The remark plugin'
	};

	const ASTRO_CONFIG = `import remarkBcc from 'bc-canvas-editor/remark';

export default defineConfig({ markdown: { remarkPlugins: [remarkBcc] } });`;

	const DOCUSAURUS_CONFIG = `// inside the docs/blog preset options
remarkPlugins: [[remarkBcc, { css: 'imported' }]],
rehypePlugins: [[rehypeRaw, { passThrough: ['mdxjsEsm', 'mdxFlowExpression',
  'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression'] }]]`;

	const DOCUSAURUS_CSS = `@import 'bc-canvas-editor/sheet.css';`;

	/** Source shown in the right pane, per shape. */
	const sourceFor = $derived.by(() => {
		if (shape === 'a') return [{ name: 'docs-proto/a/remark.md', text: data.a.src }];
		if (shape === 'c') return [{ name: 'docs-proto/c/remark.md', text: data.c.src }];
		if (shape === 'b')
			return data.b.order.map((n) => ({
				name: `docs-proto/b/remark/${n}.md`,
				text: data.b.srcs[n]
			}));
		return [{ name: 'web/src/routes/docs/+page.svelte:380–452', text: TODAY_SOURCE }];
	});

	const TODAY_SOURCE = `<section id="remark" class="scroll-mt-8">
  {@render chiphead(sections[5])}
  <p class="lede">…</p>
  <pre class="term"><span class="text-ink-faint">$</span> npm i …</pre>
  <h3>Astro</h3>
  <figure class="filecard">
    <figcaption>astro.config.mjs</figcaption>
    <pre>{ASTRO_CONFIG}</pre>
  </figure>
  …73 lines in all, plus 3 template-literal consts in <script>
</section>`;
</script>

{#snippet note(text: string, tilt: string)}
	<aside class="note {tilt}">
		<p class="font-mono text-[11px] font-medium tracking-wide text-ink-faint">field note</p>
		<p class="mt-1 text-sm leading-relaxed">{text}</p>
	</aside>
{/snippet}

{#snippet chiphead()}
	<span class="chip-label {section.chip} border">{section.label}</span>
	<h2 class="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{section.title}</h2>
{/snippet}

<svelte:head><title>PROTOTYPE · docs furniture boundary</title></svelte:head>

<div class="mx-auto max-w-[110rem] px-5 pt-6 pb-32">
	<p class="font-mono text-[11px] tracking-wide text-hotspot-ink">
		PROTOTYPE · ticket 066 · throwaway
	</p>
	<h1 class="mt-2 text-2xl font-bold tracking-tight">Where does the seam land?</h1>
	<p class="mt-2 max-w-3xl text-sm text-ink-soft">
		The <code class="font-mono">#remark</code> section of <a href="/docs" class="underline">/docs</a>,
		rendered under each candidate shape. The rendered column should look identical in all four;
		everywhere it does not is a seam. The source column is what someone editing this copy has to
		write.
	</p>

	<div class="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
		<div class="docs" class:globalized={globalCss}>
			{#if shape === 'today'}
				<section id="remark-today" class="scroll-mt-8">
					{@render chiphead()}
					<p class="lede">
						One plugin covers every site generator built on
						<a href="https://remark.js.org">unified</a>. Two lines for Astro; two paragraphs for
						Docusaurus, because two of its choices fight raw HTML and inline styles. Install
						this repo — there is no registry package; <code>#&lt;sha&gt;</code> pins a commit:
					</p>
					<pre class="term"><span class="text-ink-faint">$</span> npm i github:mitchellvanw/bc-canvas-editor</pre>

					<h3>Astro</h3>
					<figure class="filecard">
						<figcaption>astro.config.mjs</figcaption>
						<pre>{ASTRO_CONFIG}</pre>
					</figure>

					<h3>Docusaurus</h3>
					<p>
						Docusaurus compiles both <code>.md</code> and <code>.mdx</code> through MDX, which
						fails the build on a raw HTML node unless <code>rehype-raw</code> is in the
						pipeline. And it renders through React, whose server pass escapes the text inside a
						<code>&lt;style&gt;</code> element — an inlined stylesheet arrives mangled and the
						sheet draws in Times. So the CSS comes from a file instead:
					</p>
					<figure class="filecard">
						<figcaption>docusaurus.config.js</figcaption>
						<pre>{DOCUSAURUS_CONFIG}</pre>
					</figure>
					<figure class="filecard">
						<figcaption>src/css/custom.css</figcaption>
						<pre>{DOCUSAURUS_CSS}</pre>
					</figure>

					<h3>Anywhere else</h3>
					<p>
						Two rules. Raw HTML has to survive the pipeline — <code>remark-rehype</code> and
						<code>rehype-stringify</code> both take <code>allowDangerousHtml: true</code> — and
						the sheet's CSS has to reach the page one of two ways:
					</p>
					<div class="overflow-x-auto">
						<table>
							<thead>
								<tr><th><code>css</code></th><th>what it does</th><th>when</th></tr>
							</thead>
							<tbody>
								<tr>
									<td><code>'inline'</code> (default)</td>
									<td>a <code>&lt;style&gt;</code> in the page, once, ahead of the first fence</td>
									<td>one or two pages; nothing to configure</td>
								</tr>
								<tr>
									<td><code>'imported'</code></td>
									<td>nothing — you import <code>bc-canvas-editor/sheet.css</code></td>
									<td>React-rendered sites, and fences on many pages: the fonts are ~190&nbsp;KB and a stylesheet is fetched once</td>
								</tr>
							</tbody>
						</table>
					</div>
					{@render note(
						'Most generators discard VFile warnings, so the placeholder in the page is usually the whole story a reader gets.',
						'-rotate-1'
					)}
					<p>
						The sheet brings its own fonts, its own reset and its own design tokens, all under
						one <code>.bcc-canvas</code> wrapper — it neither picks up your site's styles nor
						pushes anything onto the page around it. When a fence cannot be drawn, the
						placeholder lands in the page and the plugin puts a warning on the VFile;
						escalating is your site's call, through its own fail-on-warn. <code>root</code> is
						the other option the plugin takes: paths never resolve outside it, and it defaults
						to the directory the build runs in.
					</p>
				</section>
			{:else if shape === 'a'}
				<section id="remark-a" class="scroll-mt-8">
					{@render chiphead()}
					<!-- Shape A: the whole interior is one {@html}. The shell contributes
					     the section wrapper and the chip head, nothing else. -->
					{@html data.a.html}
				</section>
			{:else if shape === 'b'}
				<section id="remark-b" class="scroll-mt-8">
					{@render chiphead()}
					<!-- Shape B: five prose fragments, six furniture insertions. Every
					     seam below is a place the shell has to know the section's shape. -->
					{@html data.b.html.lede}
					<pre class="term"><span class="text-ink-faint">$</span> npm i github:mitchellvanw/bc-canvas-editor</pre>
					{@html data.b.html.astro}
					<figure class="filecard">
						<figcaption>astro.config.mjs</figcaption>
						<pre>{ASTRO_CONFIG}</pre>
					</figure>
					{@html data.b.html.docusaurus}
					<figure class="filecard">
						<figcaption>docusaurus.config.js</figcaption>
						<pre>{DOCUSAURUS_CONFIG}</pre>
					</figure>
					<figure class="filecard">
						<figcaption>src/css/custom.css</figcaption>
						<pre>{DOCUSAURUS_CSS}</pre>
					</figure>
					{@html data.b.html.anywhere}
					<div class="overflow-x-auto">
						<table>
							<thead>
								<tr><th><code>css</code></th><th>what it does</th><th>when</th></tr>
							</thead>
							<tbody>
								<tr>
									<td><code>'inline'</code> (default)</td>
									<td>a <code>&lt;style&gt;</code> in the page, once, ahead of the first fence</td>
									<td>one or two pages; nothing to configure</td>
								</tr>
								<tr>
									<td><code>'imported'</code></td>
									<td>nothing — you import <code>bc-canvas-editor/sheet.css</code></td>
									<td>React-rendered sites, and fences on many pages: the fonts are ~190&nbsp;KB and a stylesheet is fetched once</td>
								</tr>
							</tbody>
						</table>
					</div>
					{@render note(
						'Most generators discard VFile warnings, so the placeholder in the page is usually the whole story a reader gets.',
						'-rotate-1'
					)}
					{@html data.b.html.closing}
				</section>
			{:else}
				<section id="remark-c" class="scroll-mt-8">
					{@render chiphead()}
					<!-- Shape C: one {@html}, like A. The furniture came back — but it
					     came back out of pipeline.ts, not out of this file. -->
					{@html data.c.html}
				</section>
			{/if}
		</div>

		{#if showSource}
			<aside class="min-w-0">
				<p class="font-mono text-[11px] tracking-wide text-ink-faint">
					what the copy editor writes
				</p>
				{#each sourceFor as f (f.name)}
					<figure class="src">
						<figcaption>{f.name}</figcaption>
						<pre>{f.text}</pre>
					</figure>
				{/each}
				<p class="mt-4 font-mono text-[11px] text-ink-faint">
					{sourceFor.length} file{sourceFor.length === 1 ? '' : 's'} ·
					{sourceFor.reduce((n, f) => n + f.text.split('\n').length, 0)} lines
				</p>
			</aside>
		{/if}
	</div>
</div>

<div class="bar">
	{#each SHAPES as s (s.id)}
		<button
			class="pill"
			aria-pressed={shape === s.id}
			title={s.blurb}
			onclick={() => (shape = s.id)}>{s.label}</button
		>
	{/each}
	<span class="sep"></span>
	<button class="pill" aria-pressed={globalCss} onclick={() => (globalCss = !globalCss)}>
		:global() CSS
	</button>
	<button class="pill" aria-pressed={showSource} onclick={() => (showSource = !showSource)}>
		source
	</button>
</div>

<style>
	/* ─────────────────────────────────────────────────────────────────────
	   VERBATIM from web/src/routes/docs/+page.svelte:616–778. Not edited.
	   Svelte scopes each of these to elements in THIS template; {@html}
	   output is not in this template, so it is not scoped, so these do not
	   reach it. That is the finding — look at shapes A and C with this on.
	   ───────────────────────────────────────────────────────────────────── */
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
	.docs section {
		display: flow-root;
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
	.docs a {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.docs code {
		font-family: var(--font-mono);
		font-size: 0.86em;
	}
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

	/* ─────────────────────────────────────────────────────────────────────
	   The same rules again, escaped to :global() and gated on .globalized.
	   This block is what the migration costs the stylesheet: every selector
	   above, rewritten, with the scoping guarantee traded for a class.
	   ───────────────────────────────────────────────────────────────────── */
	:global(.docs.globalized section) { display: flow-root; }
	:global(.docs.globalized .lede) {
		margin-top: 1.25rem; max-width: 42rem; font-family: var(--font-serif);
		font-size: 1.125rem; line-height: 1.65; color: var(--color-ink-soft);
	}
	:global(.docs.globalized h3) {
		margin-top: 2.25rem; max-width: 42rem; font-size: 1.05rem; font-weight: 600;
	}
	:global(.docs.globalized p:not(.lede)),
	:global(.docs.globalized ul),
	:global(.docs.globalized dl) {
		margin-top: 0.875rem; max-width: 42rem; font-size: 0.9375rem; line-height: 1.7;
	}
	:global(.docs.globalized ul) { padding-left: 1.1rem; list-style: disc; }
	:global(.docs.globalized li) { margin-top: 0.5rem; }
	:global(.docs.globalized li::marker) { color: var(--color-ink-faint); }
	:global(.docs.globalized a) { text-decoration: underline; text-underline-offset: 2px; }
	:global(.docs.globalized code) { font-family: var(--font-mono); font-size: 0.86em; }
	:global(.docs.globalized pre) {
		margin-top: 1rem; max-width: 42rem; overflow-x: auto; border-radius: 4px;
		padding: 1rem; font-family: var(--font-mono); font-size: 0.75rem; line-height: 1.7;
	}
	:global(.docs.globalized pre.term) {
		background: var(--color-ink); color: var(--color-paper);
		box-shadow: 0 1px 2px rgb(26 30 32 / 0.08);
	}
	:global(.docs.globalized table) {
		margin-top: 1rem; width: 100%; max-width: 42rem; border-collapse: collapse;
		font-size: 0.875rem;
	}
	:global(.docs.globalized th) {
		text-align: left; font-weight: 600; padding: 0.5rem 1rem 0.5rem 0;
		border-bottom: 1px solid var(--color-ink);
	}
	:global(.docs.globalized td) {
		vertical-align: top; padding: 0.6rem 1rem 0.6rem 0;
		border-bottom: 1px solid var(--color-line);
	}
	/* A rule today's page does not need, because today nothing wraps a <pre>
	   in a <code>. Markdown fences always do. */
	:global(.docs.globalized pre > code) { font-size: inherit; }

	/* ── prototype chrome, not part of the finding ── */
	.src { margin-top: 0.75rem; border: 1px solid var(--color-line); background: var(--color-sheet); border-radius: 4px; overflow: hidden; }
	.src figcaption { border-bottom: 1px solid var(--color-line); padding: 0.4rem 0.6rem; font-family: var(--font-mono); font-size: 10px; color: var(--color-ink-soft); }
	.src pre { padding: 0.75rem; font-family: var(--font-mono); font-size: 11px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
	.bar { position: fixed; inset: auto 0 0 0; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.4rem; padding: 0.6rem; background: var(--color-ink); }
	.pill { border: 1px solid var(--color-ink-soft); border-radius: 999px; padding: 0.25rem 0.8rem; font-family: var(--font-mono); font-size: 11px; color: var(--color-paper); }
	.pill[aria-pressed='true'] { background: var(--color-paper); color: var(--color-ink); border-color: var(--color-paper); }
	.sep { width: 1px; height: 1.2rem; background: var(--color-ink-soft); margin: 0 0.4rem; }
</style>
