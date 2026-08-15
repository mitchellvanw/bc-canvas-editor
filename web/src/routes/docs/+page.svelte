<script lang="ts">
	/**
	 * The docs: every tool in this project, end to end, on one page — set in
	 * the same wall language as the homepage. The chip stack that pitches the
	 * canvas there returns here as wayfinding: each section is headed by a
	 * small tilted chip in its tool's color, the sticky nav mirrors them as a
	 * legend, and the homepage's tools grid links into the section anchors.
	 * The ids are a contract — change one and the grid changes with it.
	 *
	 * The substance is the same set of facts README.md, SPEC.md and the
	 * per-tool READMEs hold; this page is the reader-facing arrangement of
	 * them, not a second source of truth. Caveats ride in the margin as
	 * field notes — the homepage's own aside form — and multi-line code with
	 * braces lives in template-literal consts so the template never escapes
	 * a `{`.
	 */
	import orderSvg from '../../../../examples/order-fulfillment.bcc.svg?url';

	const REPO = 'https://github.com/mitchellvanw/bc-canvas-editor';

	const sections = [
		{ id: 'editor', chip: 'bg-event border-event-ink text-event-ink', label: 'editor', title: 'The editor' },
		{ id: 'canvas-file', chip: 'bg-sheet border-ink text-ink-soft', label: 'file', title: 'The Canvas file' },
		{ id: 'exports', chip: 'bg-command border-command-ink text-command-ink', label: 'exports', title: 'Exports' },
		{ id: 'cli', chip: 'bg-ink border-ink text-paper', label: 'bcc', title: 'The command line' },
		{ id: 'fence', chip: 'bg-term border-term-ink text-term-ink', label: 'fence', title: 'The bcc fence' },
		{ id: 'remark', chip: 'bg-query border-query-ink text-query-ink', label: 'remark', title: 'The remark plugin' },
		{ id: 'vscode', chip: 'bg-policy border-policy-ink text-policy-ink', label: 'vscode', title: 'The VS Code extension' },
		{ id: 'mcp', chip: 'bg-collaborator border-collaborator-ink text-collaborator-ink', label: 'mcp', title: 'The MCP server & plugin' }
	];

	/** The nav's legend dot: the chip's background and border, none of its text. */
	const dot = (chip: string) => chip.split(' ').slice(0, 2).join(' ');

	/** Scroll-spy: the nav marks the section under the reading line. */
	let active = $state('editor');
	function spy(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) active = entry.target.id;
				}
			},
			{ rootMargin: '-8% 0px -78% 0px' }
		);
		for (const section of node.querySelectorAll('section[id]')) observer.observe(section);
		return { destroy: () => observer.disconnect() };
	}

	const ASTRO_CONFIG = `import remarkBcc from 'bc-canvas-editor/remark';

export default defineConfig({ markdown: { remarkPlugins: [remarkBcc] } });`;

	const DOCUSAURUS_CONFIG = `// inside the docs/blog preset options
remarkPlugins: [[remarkBcc, { css: 'imported' }]],
rehypePlugins: [[rehypeRaw, { passThrough: ['mdxjsEsm', 'mdxFlowExpression',
  'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression'] }]]`;

	const DOCUSAURUS_CSS = `@import 'bc-canvas-editor/sheet.css';`;

	const DESKTOP_CONFIG = `{
  "mcpServers": {
    "bc-canvas": {
      "command": "node",
      "args": [
        "/path/to/bc-canvas-editor/mcp/dist/server.js",
        "--root", "/path/to/your-project"
      ]
    }
  }
}`;
</script>

{#snippet note(text: string, tilt: string)}
	<aside class="note {tilt}">
		<p class="font-mono font-medium tracking-wide text-ink-faint">field note</p>
		<p>{text}</p>
	</aside>
{/snippet}

{#snippet chiphead(section: (typeof sections)[number])}
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
				{#each sections as s (s.id)}
					<li>
						<a
							href="#{s.id}"
							aria-current={active === s.id ? 'true' : undefined}
							class="group flex items-center gap-2.5 text-sm max-lg:rounded-full max-lg:border max-lg:border-line max-lg:bg-sheet max-lg:px-3 max-lg:py-1.5 lg:py-1"
						>
							<span class="h-2.5 w-2.5 shrink-0 border {dot(s.chip)} transition-transform {active === s.id ? 'lg:scale-125' : ''}" aria-hidden="true"></span>
							<span class="font-medium {active === s.id ? 'lg:text-ink' : 'text-ink-soft'} group-hover:text-ink">{s.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="docs max-lg:mt-12" use:spy>
			<!-- the editor -->
			<section id="editor" class="scroll-mt-8">
				{@render chiphead(sections[0])}
				<p class="lede">
					One canvas, edited in place. There is no form beside a preview and no Save ahead of
					an export: the sheet on the projector during the workshop is the file in the repo
					after it. Blur commits a field, Esc reverts it, and everything else materializes on
					approach.
				</p>

				<h3>Three views of one canvas</h3>
				<p>
					<strong>Sheet · JSON · Markdown</strong> are tabs over the same document, not three
					documents. The Sheet is where editing happens. The JSON view shows the exact bytes an
					export would write, and is editable with an explicit <strong>Apply</strong> — one
					commit, one undo step, validated by the same parser as import, so a pasted canvas
					never replaces a good one halfway. The Markdown view is read-only, and only ever an
					export.
				</p>

				<h3>Nothing leaves the browser</h3>
				{@render note(
					'Two tabs of the same browser share one autosave slot. The last tab to write wins, and both say so the moment there are two.',
					'rotate-[1.2deg]'
				)}
				<p>
					No account, no server. The canvas autosaves to localStorage on every commit, but that
					slot is a safety net, not storage — the durable form is the Canvas file you export.
					The chrome keeps one score, <strong>unexported changes</strong>: has this canvas left
					the browser in a form that can come back? Exporting or importing a Canvas file or
					HTML artifact clears it; PNG, SVG and Markdown never do, because none of them could
					bring the canvas back. Anything that would replace a canvas still carrying
					unexported changes — an import, an example, a blank sheet — asks first. That is the
					app's only dialog.
				</p>

				<h3>Undo, by commit</h3>
				<p>
					Every accepted change — a field committed on blur, one add, one removal, one
					reorder — is one undo step. <kbd>⌘Z</kbd> undoes, <kbd>⇧⌘Z</kbd> redoes; mid-edit,
					<kbd>⌘Z</kbd> reverts the field first. Importing or replacing the canvas is a
					session boundary, not an edit: it clears history.
				</p>

				<h3>Keyboard &amp; the Reference</h3>
				<p>
					The whole sheet is operable from the keyboard — every add, removal, pick and
					reorder. <kbd>⌘/</kbd> (Ctrl+/ on Windows and Linux) opens the
					<strong>Reference</strong>: the shortcut list, and the ddd-crew's own material on
					the method. Everything else the editor teaches in place — picker descriptions, the
					placeholder questions in an empty section, the footer legend.
				</p>

				<h3>Examples</h3>
				<p>
					Four invented domains ship in the <strong>Examples</strong> menu, from every section
					filled to mid-workshop with the open questions still winning. The same files are
					committed under <a href="{REPO}/tree/main/examples">examples/</a> and re-import
					as-is.
				</p>
			</section>

			<!-- the canvas file -->
			<section id="canvas-file" class="scroll-mt-8">
				{@render chiphead(sections[1])}
				<p class="lede">
					Everything on this page reads or writes one format:
					<code>&lt;name&gt;.bcc.json</code>, a small, flat JSON file meant to be committed
					beside the code it describes. It is deliberately boring — one key order, one indent,
					one trailing newline — because boring is what diffs well.
				</p>
				<ul>
					<li>
						<strong>The schema is this project's own, and versioned.</strong> The root
						<code>version</code> is currently <code>2</code>; an older file is migrated up on
						read, in the editor and everywhere else, because everything reads through the one
						parser.
					</li>
					<li>
						<strong>Eleven sections in a canonical order</strong> — name, purpose, strategic
						classification, domain roles, inbound communication, ubiquitous language,
						business decisions, outbound communication, assumptions, verification metrics,
						open questions. The ddd-crew canvas, as data.
					</li>
					<li>
						<strong>A canvas survives the round trip byte-identical.</strong> Export → import
						→ export writes the same bytes, and <code>bcc fmt</code> restores them for a file
						edited by hand. Honest diffs are the point: a canvas that churns bytes it does
						not mean cannot live next to code.
					</li>
					<li>
						<strong>The name has to end <code>.bcc.json</code>.</strong> That is what
						<code>bcc ls</code> globs on and what the editor's Import… accepts; a canvas
						saved as <code>shipping.json</code> is invisible to both. The directory and the
						rest of the name are yours.
					</li>
				</ul>
				<p>
					The full schema, shape rules and migration story are in
					<a href="{REPO}/blob/main/SPEC.md">SPEC.md §3</a>, with a complete reference
					example.
				</p>
			</section>

			<!-- exports -->
			<section id="exports" class="scroll-mt-8">
				{@render chiphead(sections[2])}
				<p class="lede">
					Five ways out of the browser; two of them come back. The split is the one that
					matters, because the editor's only dirty state is a canvas that has not left in a
					form that can return — and the editor's export and <code>bcc render</code> call the
					same function, so the files are byte-identical whichever wrote them.
				</p>

				<div class="mt-6 grid gap-5 sm:grid-cols-2">
					<div class="border border-line bg-sheet p-5 sm:self-start">
						<p class="font-mono font-medium tracking-wide text-ink-faint">comes back</p>
						<dl>
							<dt><code>.bcc.json</code> — Canvas file</dt>
							<dd>The canvas itself. The durable form; everything else is derived from it.</dd>
							<dt><code>.bcc.html</code> — HTML artifact</dt>
							<dd>
								One self-contained file for sharing: all three views pre-rendered so none
								needs script, with the Canvas file embedded inside — importing the artifact
								recovers the canvas whole.
							</dd>
						</dl>
					</div>
					<div class="border border-dashed border-ink-faint bg-sheet p-5">
						<p class="font-mono font-medium tracking-wide text-ink-faint">one way out</p>
						<dl>
							<dt><code>.bcc.svg</code> — image</dt>
							<dd>
								The sheet as one self-contained image — the one meant to be
								<em>committed</em> beside its canvas, so any markdown host that will never
								draw a fence can still point an <code>&lt;img&gt;</code> at it.
								<code>bcc check</code> re-renders committed images and compares bytes, so a
								stale picture fails a check instead of being believed.
							</dd>
							<dt><code>.bcc.png</code> — image</dt>
							<dd>The sheet as pixels, for chat and slides.</dd>
							<dt><code>.bcc.md</code> — Markdown</dt>
							<dd>
								The canvas as prose. There is no Markdown import — keep the Canvas file if
								you mean to edit again.
							</dd>
						</dl>
					</div>
				</div>
			</section>

			<!-- the command line -->
			<section id="cli" class="scroll-mt-8">
				{@render chiphead(sections[3])}
				<p class="lede">
					<code>bcc</code> treats canvases the way a toolchain treats source: list them, check
					them, format them, build artifacts from them. It runs in plain Node, straight off
					this repo — nothing is published, and there is nothing to install:
				</p>
				<pre class="term"><span class="text-ink-faint">$</span> alias bcc='npx --yes github:mitchellvanw/bc-canvas-editor'</pre>
				{@render note(
					'Inside a checkout of this repo, run npm run bcc -- ls instead — the npx alias would fetch a second copy of the repo rather than the bundle you just built.',
					'-rotate-1'
				)}
				<p>
					The first call clones and installs; later ones come out of npm's cache and start in
					about a second. <code>npx</code> resolves <code>main</code> at the moment it runs —
					pin a commit (<code>…bc-canvas-editor#&lt;sha&gt;</code>) if you need
					reproducibility.
				</p>
				<pre class="term"><span class="text-ink-faint">$</span> bcc ls                        <span class="text-ink-faint"># what canvases are here, what each is for, how full each one is</span>
<span class="text-ink-faint">$</span> bcc check                     <span class="text-ink-faint"># do they all still read, and are the images beside them current</span>
<span class="text-ink-faint">$</span> bcc fmt                       <span class="text-ink-faint"># canonical bytes, in place</span>
<span class="text-ink-faint">$</span> bcc render orders.bcc.json    <span class="text-ink-faint"># the HTML artifact, beside the canvas</span>
<span class="text-ink-faint">$</span> bcc render --svg orders.bcc.json</pre>
				<p>
					<code>check</code> and <code>fmt</code> are what make a canvas behave like source
					code rather than an attachment. <code>check</code> reads every canvas through the
					parser the editor's Import… uses — a canvas that passes here opens there — and exits
					1 if anything does not check out, stale images included. <code>fmt</code> rewrites a
					canvas in its canonical bytes; <code>fmt --check</code> names what would change and
					writes nothing, for CI. <code>render</code> writes the <code>.bcc.html</code>
					artifact, or a <code>.bcc.svg</code> with <code>--svg</code> —
					<code>--out &lt;file&gt;</code> redirects a single render, and only
					<code>render --svg</code> ever needs a browser, and only to measure a height that
					<code>--height &lt;pixels&gt;</code> can supply instead.
				</p>
				<h3>The root, and what counts as a canvas</h3>
				<p>
					Every command takes <code>--root &lt;directory&gt;</code>: where <code>bcc</code>
					looks, and the furthest it goes. It defaults to the working directory, and no
					path — symlinks resolved first — ever reaches outside it. A canvas is any
					<code>*.bcc.json</code>, or the canvas embedded in a <code>*.bcc.html</code>
					artifact, found by walking the root and skipping hidden directories,
					<code>node_modules</code>, <code>dist</code> and <code>build</code>. A directory the
					walk cannot open stops that branch and nothing else; <code>bcc ls</code> names it at
					the end rather than losing every canvas already found.
				</p>
			</section>

			<!-- the fence -->
			<section id="fence" class="scroll-mt-8">
				{@render chiphead(sections[4])}
				<p class="lede">
					A fence is how documentation stops lying: point it at the canvas, and the sheet is
					drawn where the fence stands every time the file is built or previewed. The canvas
					stays the single source, and the picture can no longer fall behind it.
				</p>

				<div class="mt-6 grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
					<figure class="filecard">
						<figcaption>orders.md</figcaption>
						<pre><span class="text-ink-faint">```bcc</span>
../canvases/order-fulfillment.bcc.json
<span class="text-ink-faint">```</span></pre>
					</figure>
					<div class="overflow-hidden rounded-[4px] border border-line bg-sheet shadow-sm">
						<p class="border-b border-line px-3 py-2 font-mono text-ink-soft">what the fence draws</p>
						<img src={orderSvg} alt="The Order Fulfillment canvas as a rendered sheet" class="h-40 w-full object-cover object-top" width="1440" height="1292" loading="lazy" />
					</div>
				</div>

				{@render note(
					'A leading / reads as the repo root to some tools and a filesystem path to others. Relative paths only — ../ is fine.',
					'rotate-[1.2deg]'
				)}
				<p>
					One path, resolved relative to the markdown file holding it. Nothing else goes in
					the fence — no JSON, no options. Everywhere the fence is <em>not</em> drawn, the
					path is what a reader sees, which is why it holds a pointer rather than a canvas.
				</p>
				<p>
					Two adapters draw it — the <a href="#remark">remark plugin</a> when a site builds,
					the <a href="#vscode">VS Code extension</a> while you write — over one shared
					contract, with the same renderer inlined into both: a fence means the same thing on
					both, and the sheet it draws cannot drift from the one the editor exports. A fence
					that cannot be drawn leaves <strong>a visible placeholder saying why</strong>, never
					a blank, and the build or preview carries on.
				</p>
			</section>

			<!-- the remark plugin -->
			<section id="remark" class="scroll-mt-8">
				{@render chiphead(sections[5])}
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

			<!-- the vs code extension -->
			<section id="vscode" class="scroll-mt-8">
				{@render chiphead(sections[6])}
				<p class="lede">
					The extension puts the drawn sheet in VS Code's built-in markdown preview, live:
					edit the canvas, and every preview holding a fence to it redraws — including a fence
					pointing at a file you have not written yet, which heals the moment you write it.
				</p>
				{@render note(
					'Reload any window that was already open (Developer: Reload Window) — a window builds its markdown engine at startup and keeps it.',
					'rotate-[1.2deg]'
				)}
				<p>
					There is no marketplace listing. Build a <code>.vsix</code> from a checkout of the
					repo and install it by hand:
				</p>
				<pre class="term"><span class="text-ink-faint">$</span> cd vscode &amp;&amp; npx --yes @vscode/vsce package --no-dependencies
<span class="text-ink-faint">$</span> code --install-extension bc-canvas-fence-0.0.1.vsix</pre>
				<p>
					A fence that cannot be drawn gets the same visible placeholder as everywhere else;
					the full detail, which names paths on your machine, goes to an output channel
					instead — <strong>BC Canvas: Show fence log</strong> in the command palette. A
					problem is reported once, not once per keystroke.
				</p>
				<h3>Where it does not reach</h3>
				<ul>
					<li>
						<strong>Notebook cells.</strong> The notebook markdown renderer runs in a webview
						with no filesystem; a <code>bcc</code> fence there stays a code block.
					</li>
					<li>
						<strong>Web hosts</strong> (vscode.dev, github.dev) have no filesystem for a
						synchronous render to read, so the extension does not load there.
					</li>
					<li>
						<strong>A file opened outside any workspace folder</strong> resolves against its
						own directory — a pointer beside it reads, <code>../</code> does not.
					</li>
				</ul>
			</section>

			<!-- the mcp server & plugin -->
			<section id="mcp" class="scroll-mt-8">
				{@render chiphead(sections[7])}
				<p class="lede">
					The server's whole job is getting a canvas into a conversation, as prose. It never
					writes — changing files is <code>bcc</code>'s job — and that split is the design:
					reading is a server, writing is a command line, and the plugin is what knows the
					choreography. stdio only; nothing leaves the machine.
				</p>

				<h3>Install</h3>
				<p>
					The server ships inside the <strong>bc-canvas</strong> plugin, together with two
					skills and a reviewer agent. There is nothing to build — the plugin carries the
					server ready to run, and Node is its only requirement:
				</p>
				<pre class="term">/plugin marketplace add mitchellvanw/bc-canvas-editor
/plugin install bc-canvas@bc-canvas-editor</pre>
				<p>
					The plugin does not carry <code>bcc</code>; set up the
					<a href="#cli"><code>npx</code> alias</a> in the project you are working in.
				</p>

				<h3>What the server offers</h3>
				<ul>
					<li>
						<strong><code>bcc_read_canvas</code></strong> — one canvas as prose: the sheet in
						words, a third to a half shorter than the file. It reads a
						<code>.bcc.json</code> or the canvas embedded in a <code>.bcc.html</code>, and
						brings an older file up to date on the way through.
					</li>
					<li>
						<strong><code>bcc_explain</code></strong> — what a section is for, in the
						ddd-crew's own questions, with the vocabulary it draws on and a row to calibrate
						against.
					</li>
					<li>
						<strong>Resources</strong> — every canvas under the root, at
						<code>bcc://canvas/&lt;path&gt;</code>. Attach one from the host's own UI to give
						a conversation a context to work against.
					</li>
				</ul>

				<h3>What the plugin adds</h3>
				<p>The facilitation layer, findable by typing <code>/</code> and the name:</p>
				<ul>
					<li>
						<strong>canvas-workshop</strong> — a facilitated session. The model asks, one
						section at a time; you answer; the sheet fills in your words, and what you defer
						lands under Open questions instead of staying silently blank.
					</li>
					<li>
						<strong>draft-canvas-from-code</strong> — a draft drawn from what the code shows,
						handed back for correction. The judgments a codebase cannot answer arrive as open
						questions rather than invented rows.
					</li>
					<li>
						<strong>canvas-reviewer</strong> — an agent that reviews by asking: it names what
						is missing or thin and puts the open questions back to you, answering none of
						them.
					</li>
				</ul>

				<h3>Claude Code, and Claude Desktop</h3>
				{@render note(
					'Export or close an editor tab before you let an agent write — an export from that tab lands on top of the agent’s file, silently.',
					'-rotate-1'
				)}
				<p>
					In Claude Code the plugin is the whole setup: the server's root defaults to the
					project the session started in, and <code>bcc</code> runs over Bash like any other
					command. Claude Desktop has no shell, so it has no <code>bcc</code> — Desktop gets
					reading and explaining, and the skills cannot write there. Desktop also starts
					servers at the filesystem root, so <code>--root</code> is required — the plugin's
					own server entry leaves it out and is refused at launch rather than walking your
					disk. Connect the server yourself, naming the directory your canvases live under:
				</p>
				<figure class="filecard">
					<figcaption>claude_desktop_config.json</figcaption>
					<pre>{DESKTOP_CONFIG}</pre>
				</figure>
				<p>
					<code>--root</code> is the only directory the server reads — a path that resolves
					outside it is refused, symlinks followed out of it included — and it is fixed for
					the life of the config, whichever project you happen to be standing in.
				</p>

				<h3>Conflicts</h3>
				<p>
					There is no conflict check — no mtime, no revision hash. Canvases are committed
					files, so git is already the conflict detector and git is already the undo;
					anything here would be a second, weaker history. The rest — protocol revision,
					development setup, what the resource listing leaves out and why — is in
					<a href="{REPO}/blob/main/mcp/README.md">mcp/README.md</a>.
				</p>
			</section>

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
