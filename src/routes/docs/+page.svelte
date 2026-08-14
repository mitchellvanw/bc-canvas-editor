<script lang="ts">
	/**
	 * The docs: every tool in this project, end to end, on one page. The
	 * homepage's tools grid links into the section anchors here, so the ids
	 * are a contract — change one and the grid changes with it.
	 *
	 * The substance is the same set of facts README.md, SPEC.md and the
	 * per-tool READMEs hold; this page is the reader-facing arrangement of
	 * them, not a second source of truth. Multi-line code with braces lives
	 * in template-literal consts so the Svelte template never has to escape
	 * a `{`.
	 */
	const REPO = 'https://github.com/mitchellvanw/bc-canvas-editor';

	const sections = [
		{ id: 'editor', n: '01', title: 'The editor' },
		{ id: 'canvas-file', n: '02', title: 'The Canvas file' },
		{ id: 'exports', n: '03', title: 'Exports' },
		{ id: 'cli', n: '04', title: 'The command line' },
		{ id: 'fence', n: '05', title: 'The bcc fence' },
		{ id: 'remark', n: '06', title: 'The remark plugin' },
		{ id: 'vscode', n: '07', title: 'The VS Code extension' },
		{ id: 'mcp', n: '08', title: 'The MCP server & plugin' }
	];

	const ASTRO_CONFIG = `// astro.config.mjs
import remarkBcc from 'bc-canvas-editor/remark';

export default defineConfig({ markdown: { remarkPlugins: [remarkBcc] } });`;

	const DOCUSAURUS_CONFIG = `// docusaurus.config.js — inside the docs/blog preset options
remarkPlugins: [[remarkBcc, { css: 'imported' }]],
rehypePlugins: [[rehypeRaw, { passThrough: ['mdxjsEsm', 'mdxFlowExpression',
  'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression'] }]]`;

	const DOCUSAURUS_CSS = `/* src/css/custom.css */
@import 'bc-canvas-editor/sheet.css';`;

	const DESKTOP_CONFIG = `{
  "mcpServers": {
    "bc-canvas": {
      "command": "node",
      "args": [
        "/path/to/bc-canvas-editor/mcp/dist/server.js",
        "--root",
        "/path/to/your-project"
      ]
    }
  }
}`;
</script>

<svelte:head>
	<title>Docs — BC Canvas</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-5 pt-6 pb-24 sm:px-8">
	<header class="flex items-baseline justify-between">
		<a href="/" class="text-lg font-bold tracking-tight">BC Canvas</a>
		<a href="/edit" class="rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium hover:bg-paper">
			Open the editor
		</a>
	</header>

	<div class="mt-14 max-w-3xl">
		<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Docs</h1>
		<p class="mt-5 font-serif text-lg leading-relaxed text-ink-soft">
			Everything here draws the same sheet from the same file: the editor in the browser, the
			Canvas file it exports, the command line, the fence a markdown file draws it with, and the
			MCP server that reads it aloud. Each tool on this page, end to end.
			<a href="{REPO}/blob/main/SPEC.md" class="underline underline-offset-2">SPEC.md</a> is the
			full specification underneath all of it.
		</p>
	</div>

	<div class="mt-12 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-14">
		<nav aria-label="On this page" class="max-lg:border max-lg:border-line max-lg:bg-sheet max-lg:p-5 lg:sticky lg:top-8 lg:self-start">
			<p class="text-sm font-semibold tracking-[0.08em] uppercase text-ink-soft">On this page</p>
			<ul class="mt-3 space-y-1.5 text-sm max-lg:columns-2 max-lg:gap-8 max-sm:columns-1">
				{#each sections as s (s.id)}
					<li class="break-inside-avoid">
						<a href="#{s.id}" class="group flex items-baseline gap-2 py-0.5 hover:text-ink">
							<span class="font-mono text-[11px] text-ink-faint">{s.n}</span>
							<span class="font-medium text-ink-soft group-hover:text-ink">{s.title}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="docs max-w-3xl max-lg:mt-12">
			<!-- 01 · the editor -->
			<section id="editor" class="scroll-mt-8">
				<p class="font-mono text-xs text-ink-faint">01</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">The editor</h2>
				<p class="lede">
					The editor at <a href="/edit">/edit</a> is one canvas, edited inline on the rendered
					sheet. There is no form beside a preview: every value is editable in place, blur
					commits it, Esc reverts it, and the sheet you are editing is the sheet everyone else
					will see.
				</p>

				<h3>Three views of one canvas</h3>
				<p>
					<strong>Sheet · JSON · Markdown</strong> are tabs over the same document, not three
					documents. The Sheet is where editing happens. The JSON view shows the exact bytes an
					export would write; it is editable with an explicit <strong>Apply</strong>, which runs
					the same parser as import — one commit, one undo step — so a hand-fixed or pasted
					canvas is validated before it replaces anything. The Markdown view is read-only, and
					only ever an export.
				</p>

				<h3>Nothing leaves the browser</h3>
				<p>
					There is no account and no server. The canvas autosaves to the browser's localStorage
					on every commit, but that slot is a safety net, not storage — the durable format is
					the Canvas file you export. The chrome keeps score as <strong>unexported changes</strong>:
					exporting or importing a Canvas file or HTML artifact clears it; the lossy exports —
					PNG, SVG, Markdown — do not, because none of them could bring the canvas back.
					Anything that would replace a canvas carrying unexported changes — an import, an
					example, a blank sheet — asks first. That is the app's one confirmation.
				</p>
				<p>
					Two tabs of the same browser share the one autosave slot: the last tab to write wins,
					and both tabs show a persistent notice the moment there are two, rather than
					pretending otherwise.
				</p>

				<h3>Undo</h3>
				<p>
					Every accepted change — a field committed on blur, one structural action like an add,
					a removal or a reorder — is one undo step. <kbd>⌘Z</kbd> undoes, <kbd>⇧⌘Z</kbd>
					redoes; inside a text field mid-edit, <kbd>⌘Z</kbd> reverts the field first.
					Importing or replacing the canvas is a session boundary, not an edit: it clears
					history.
				</p>

				<h3>Keyboard &amp; the Reference</h3>
				<p>
					The whole sheet is operable from the keyboard — every add, removal, pick and reorder.
					<kbd>⌘/</kbd> (Ctrl+/ on Windows and Linux) opens the <strong>Reference</strong>: the
					shortcut list, plus links to the ddd-crew's method material for the canvas itself.
					Everything else the editor teaches in place — picker descriptions, the placeholder
					questions in an empty section, the footer legend.
				</p>

				<h3>Examples</h3>
				<p>
					Four invented domains ship in the <strong>Examples</strong> menu, from every section
					filled to mid-workshop with the open questions still winning. The same files are
					committed in the repo under
					<a href="{REPO}/tree/main/examples">examples/</a> and re-import as-is.
				</p>
			</section>

			<!-- 02 · the canvas file -->
			<section id="canvas-file" class="scroll-mt-8">
				<p class="font-mono text-xs text-ink-faint">02</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">The Canvas file</h2>
				<p class="lede">
					A canvas exports as <code>&lt;name&gt;.bcc.json</code> — a small, flat JSON file meant
					to be committed beside the code it describes. It is the durable, re-importable form of
					the canvas; everything else on this page reads or writes it.
				</p>
				<ul>
					<li>
						<strong>The schema is this project's own, and versioned.</strong> The root
						<code>version</code> is currently <code>2</code>; an older file is migrated up on
						import, in the editor and everywhere else that reads through the same parser.
					</li>
					<li>
						<strong>Eleven sections in a canonical order</strong> — name, purpose, strategic
						classification, domain roles, inbound communication, ubiquitous language, business
						decisions, outbound communication, assumptions, verification metrics, open
						questions — the ddd-crew canvas as data.
					</li>
					<li>
						<strong>One set of canonical bytes.</strong> One key order, one indent, one trailing
						newline: the bytes an export writes and <code>bcc fmt</code> restores. A canvas
						survives export → import → export byte-identical, which is what keeps diffs honest.
					</li>
					<li>
						<strong>The name has to end <code>.bcc.json</code>.</strong> That is what
						<code>bcc ls</code> globs on and what the editor's Import… accepts; a canvas saved
						as <code>shipping.json</code> is invisible to both. The directory and the rest of
						the filename are yours.
					</li>
				</ul>
				<p>
					The full schema, shape rules and migration story are in
					<a href="{REPO}/blob/main/SPEC.md">SPEC.md §3</a>, with a complete reference example.
				</p>
			</section>

			<!-- 03 · exports -->
			<section id="exports" class="scroll-mt-8">
				<p class="font-mono text-xs text-ink-faint">03</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Exports</h2>
				<p class="lede">
					Five ways out of the editor; two of them come back. The editor's export and
					<code>bcc render</code> call the same function, so the files are byte-identical
					whichever wrote them.
				</p>
				<ul>
					<li>
						<strong>Canvas file (<code>.bcc.json</code>)</strong> — the canvas itself, as above.
						Re-importable.
					</li>
					<li>
						<strong>HTML artifact (<code>.bcc.html</code>)</strong> — one self-contained file
						for sharing: all three views pre-rendered so none depends on script, with the
						Canvas file embedded inside, so importing the artifact recovers the canvas whole.
						Re-importable.
					</li>
					<li>
						<strong>SVG image (<code>.bcc.svg</code>)</strong> — the sheet as one
						self-contained image. This is the one meant to be committed beside its canvas, so
						a README or any markdown host that will never draw a fence can still point an
						<code>&lt;img&gt;</code> at it. <code>bcc check</code> re-renders committed images
						and compares the bytes, so an image left behind by its canvas fails a check
						instead of being believed.
					</li>
					<li>
						<strong>PNG image (<code>.bcc.png</code>)</strong> — the sheet as pixels, for chat
						and slides. Presentation only.
					</li>
					<li>
						<strong>Markdown (<code>.bcc.md</code>)</strong> — the canvas as prose. One-way:
						there is no Markdown import, so keep the Canvas file if you mean to edit again.
					</li>
				</ul>
			</section>

			<!-- 04 · the command line -->
			<section id="cli" class="scroll-mt-8">
				<p class="font-mono text-xs text-ink-faint">04</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">The command line</h2>
				<p class="lede">
					<code>bcc</code> is the same canvases from a terminal: what is here, does it still
					read, are the bytes canonical, draw it. It runs in plain Node and is unpublished —
					no registry package; <code>npx</code> resolves this repo's <code>main</code> at the
					moment it runs.
				</p>
				<pre class="term"><span class="text-ink-faint">$</span> alias bcc='npx --yes github:mitchellvanw/bc-canvas-editor'</pre>
				<p>
					The first call clones and installs; later ones come out of npm's cache and start in
					about a second. Pin a commit (<code>…bc-canvas-editor#&lt;sha&gt;</code>) if you need
					reproducibility.
				</p>
				<pre class="term"><span class="text-ink-faint">$</span> bcc ls                        <span class="text-ink-faint"># what canvases are here, what each is for, how full each one is</span>
<span class="text-ink-faint">$</span> bcc check                     <span class="text-ink-faint"># do they all still read, and are the images beside them current</span>
<span class="text-ink-faint">$</span> bcc fmt                       <span class="text-ink-faint"># canonical bytes, in place</span>
<span class="text-ink-faint">$</span> bcc render orders.bcc.json    <span class="text-ink-faint"># the HTML artifact, beside the canvas</span>
<span class="text-ink-faint">$</span> bcc render --svg orders.bcc.json</pre>
				<p>
					<code>check</code> and <code>fmt</code> are what make a canvas behave like source code
					rather than an attachment: <code>check</code> reads every canvas through the parser
					the editor's Import… uses, so a canvas that passes here opens there, and it exits 1
					if anything does not check out — images beside their canvases included.
					<code>fmt</code> rewrites a canvas in its canonical bytes, and <code>fmt --check</code>
					names what would change without writing, for CI. <code>render</code> writes the
					<code>.bcc.html</code> artifact, or a <code>.bcc.svg</code> with <code>--svg</code>;
					only <code>render --svg</code> ever needs a browser, and only to measure a height that
					<code>--height &lt;pixels&gt;</code> can supply instead. <code>--out &lt;file&gt;</code>
					redirects a single render somewhere other than beside the canvas.
				</p>
				<h3>The root, and what counts as a canvas</h3>
				<p>
					Every command takes <code>--root &lt;directory&gt;</code>: where <code>bcc</code>
					looks, and the furthest it goes. It defaults to the working directory, and no path —
					symlinks resolved first — ever reaches outside it. A canvas is any
					<code>*.bcc.json</code>, or the canvas embedded in a <code>*.bcc.html</code>
					artifact, found by walking the root and skipping hidden directories,
					<code>node_modules</code>, <code>dist</code> and <code>build</code>. A directory the
					walk cannot open stops that branch and nothing else; <code>bcc ls</code> names it at
					the end rather than losing every canvas already found.
				</p>
				<p>
					One caveat inside a checkout of this repo: run it as <code>npm run bcc -- ls</code>
					there, because the <code>npx</code> alias would fetch a fresh copy of the repo rather
					than run the bundle you just built.
				</p>
			</section>

			<!-- 05 · the fence -->
			<section id="fence" class="scroll-mt-8">
				<p class="font-mono text-xs text-ink-faint">05</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">The bcc fence</h2>
				<p class="lede">
					A <code>bcc</code> fence in a markdown file points at a canvas, and the sheet is drawn
					in its place wherever the file is built or previewed.
				</p>
				<pre class="filecode"><span class="text-ink-faint">```bcc</span>
../canvases/order-fulfillment.bcc.json
<span class="text-ink-faint">```</span></pre>
				<p>
					One path, resolved relative to the markdown file holding it. <code>../</code> is
					fine; a leading <code>/</code> is not, because it reads as the repo root to some
					tools and as a filesystem path to others. Nothing else goes in the fence — no JSON,
					no options. Everywhere the fence is <em>not</em> drawn, the path is what a reader
					sees, which is why it holds a pointer rather than a canvas.
				</p>
				<p>
					Two adapters draw it — the <a href="#remark">remark plugin</a> when a site builds,
					the <a href="#vscode">VS Code extension</a> while you write — over one shared
					contract, with the same renderer inlined into both. A fence means the same thing on
					both, and the sheet it draws cannot drift from the one the editor exports. A fence
					that cannot be drawn leaves <strong>a visible placeholder saying why</strong>, never
					a blank, and the build or preview carries on.
				</p>
			</section>

			<!-- 06 · the remark plugin -->
			<section id="remark" class="scroll-mt-8">
				<p class="font-mono text-xs text-ink-faint">06</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">The remark plugin</h2>
				<p class="lede">
					<code>bc-canvas-editor/remark</code> is a <a href="https://remark.js.org">remark</a>
					plugin, so it covers every site generator built on unified. Install this repo — there
					is no registry package; <code>#&lt;sha&gt;</code> pins a commit:
				</p>
				<pre class="term"><span class="text-ink-faint">$</span> npm i github:mitchellvanw/bc-canvas-editor</pre>

				<h3>Astro</h3>
				<p>Needs nothing else:</p>
				<pre class="filecode">{ASTRO_CONFIG}</pre>

				<h3>Docusaurus</h3>
				<p>
					Needs two things, and neither is guessable. It compiles both <code>.md</code> and
					<code>.mdx</code> through MDX, which fails the build on a raw HTML node unless
					<code>rehype-raw</code> is in the pipeline; and it renders through React, whose
					server pass escapes the text inside a <code>&lt;style&gt;</code> element — an inlined
					stylesheet arrives mangled and the sheet draws in Times. So the CSS comes from a file
					instead:
				</p>
				<pre class="filecode">{DOCUSAURUS_CONFIG}</pre>
				<pre class="filecode">{DOCUSAURUS_CSS}</pre>

				<h3>Anywhere else</h3>
				<p>
					The rule is that raw HTML has to survive — <code>remark-rehype</code> and
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
								<td>React-rendered sites, and any site with fences on many pages: the fonts are ~190&nbsp;KB and a stylesheet is fetched once</td>
							</tr>
						</tbody>
					</table>
				</div>
				<p>
					The sheet brings its own fonts, its own reset and its own design tokens, all under
					one <code>.bcc-canvas</code> wrapper, so it neither picks up your site's styles nor
					pushes anything onto the page around it.
				</p>
				<p>
					When a fence cannot be drawn, the placeholder lands in the page and the plugin puts a
					warning on the VFile; escalating is your site's call through its own fail-on-warn.
					Most generators discard those messages, so the placeholder is usually the whole
					story. <code>root</code> is the other option the plugin takes: paths never resolve
					outside it, and it defaults to the directory the build runs in.
				</p>
			</section>

			<!-- 07 · the vs code extension -->
			<section id="vscode" class="scroll-mt-8">
				<p class="font-mono text-xs text-ink-faint">07</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">The VS Code extension</h2>
				<p class="lede">
					The extension draws the fence in VS Code's built-in markdown preview and redraws it
					the moment the canvas beside it changes — including a canvas that is not there yet,
					so a fence pointing at a file you have not written heals when you write it.
				</p>
				<p>
					There is no marketplace listing. Build a <code>.vsix</code> from a checkout of the
					repo and install it by hand:
				</p>
				<pre class="term"><span class="text-ink-faint">$</span> cd vscode &amp;&amp; npx --yes @vscode/vsce package --no-dependencies
<span class="text-ink-faint">$</span> code --install-extension bc-canvas-fence-0.0.1.vsix</pre>
				<p>
					Then reload any window that was already open (<em>Developer: Reload Window</em>) — a
					window builds its markdown engine at startup and keeps it.
				</p>
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

			<!-- 08 · the mcp server & plugin -->
			<section id="mcp" class="scroll-mt-8">
				<p class="font-mono text-xs text-ink-faint">08</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">The MCP server &amp; plugin</h2>
				<p class="lede">
					The MCP server is how a canvas gets into a conversation: it reads one as prose and
					explains what each section is for. It does not write — that is <code>bcc</code>'s
					job — and the split is deliberate: the server is how a canvas enters a conversation,
					the command line is how one changes on disk. stdio only; nothing leaves the machine.
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
						words, a third to a half shorter than the file. It reads a <code>.bcc.json</code>
						or the canvas embedded in a <code>.bcc.html</code>, and brings an older file up to
						date on the way through.
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
				<p>Beside the server, the facilitation layer — findable by typing <code>/</code> and the name:</p>
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
				<p>
					In Claude Code the plugin is the whole setup: the server's root defaults to the
					project the session started in, and <code>bcc</code> runs over Bash like any other
					command. Claude Desktop has no shell, so it has no <code>bcc</code> — Desktop gets
					reading and explaining, and the skills cannot write there. Desktop also starts
					servers at the filesystem root, so <code>--root</code> is required — the plugin's own
					server entry leaves it out and is refused at launch rather than walking your disk.
					Connect the server yourself in
					<code>claude_desktop_config.json</code>, naming the directory your canvases live
					under:
				</p>
				<pre class="filecode">{DESKTOP_CONFIG}</pre>
				<p>
					<code>--root</code> is the only directory the server reads — a path that resolves
					outside it is refused, symlinks followed out of it included — and it is fixed for the
					life of the config, whichever project you happen to be standing in.
				</p>

				<h3>Conflicts, and the tab you left open</h3>
				<p>
					There is no conflict check — no mtime, no revision hash. Canvases are committed
					files, so git is already the conflict detector and git is already the undo. One gap
					is worth knowing about: a browser tab with the editor open holds its own autosaved
					copy of whatever you last had in it, and an export from that tab lands on top of
					whatever an agent wrote to the same file, silently. Export or close the tab before
					you let an agent write.
				</p>
				<p>
					The rest — protocol revision, development setup, what the resource listing leaves out
					and why — is in <a href="{REPO}/blob/main/mcp/README.md">mcp/README.md</a>.
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
	/* The docs' running prose: serif body, sans mechanics, mono facts —
	   the homepage's registers, held steady over a longer read. */
	.docs section + section {
		margin-top: 5.5rem;
	}
	.docs .lede {
		margin-top: 1.25rem;
		font-family: var(--font-serif);
		font-size: 1.125rem;
		line-height: 1.65;
		color: var(--color-ink-soft);
	}
	.docs h3 {
		margin-top: 2rem;
		font-size: 1.05rem;
		font-weight: 600;
	}
	.docs p:not(.lede),
	.docs ul {
		margin-top: 0.875rem;
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
	.docs kbd {
		font-family: var(--font-mono);
		font-size: 0.8em;
		padding: 0.1rem 0.35rem;
		border: 1px solid var(--color-line);
		border-radius: 3px;
		background: var(--color-sheet);
		box-shadow: 0 1px 0 var(--color-line);
	}

	/* Code blocks: the homepage's two card styles. `term` is a shell, dark;
	   `filecode` is file contents, on sheet. Both scroll sideways rather
	   than wrap, so a long line never breaks the page. */
	.docs pre {
		margin-top: 1rem;
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
	.docs pre.filecode {
		border: 1px solid var(--color-line);
		background: var(--color-sheet);
		box-shadow: 0 1px 2px rgb(26 30 32 / 0.06);
	}

	.docs table {
		margin-top: 1rem;
		width: 100%;
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
