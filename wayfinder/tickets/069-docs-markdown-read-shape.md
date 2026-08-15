---
name: docs-markdown-read-shape
title: "Decision: how the Markdown is read at build, under csr = false"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [docs-furniture-boundary]
---

## Question

The mechanism. Blocked on [furniture-boundary](wayfinder/tickets/066-docs-furniture-boundary.md) because the load's data shape is whatever that ticket decides a section is.

1. **Which placement?** `+page.server.ts`, `+page.ts`, a prebuild script in the `build:*` family, or a Vite plugin. The research measured all but the last against this repo's real build (its §5): a universal load ships ~209 KB of parser and sources to the browser to redo work already done; a server load ships none. **Charting has since removed the strongest objection to the server load** — its duplicated `__data.json` payload is a hydration cost, and `csr = false` was measured as its own configuration with no such duplication. Re-read §5 and §8 with that in mind rather than taking §9's recommendation as given.
2. **What is the pipeline?** The research recommends `remarkParse → remarkRehype({ allowDangerousHtml: true }) → rehypeRaw → rehypeSlug → rehypeStringify` — four packages already pinned in `package.json`, plus `rehype-slug@6.0.0` and `rehype-raw@7.0.0`. Confirm each addition earns its place against the shape 066 chose: `rehype-raw` is only needed if raw HTML survives into the Markdown, and `rehype-slug` only matters for the `<h3>`s *inside* a section, since the section ids themselves stay in the shell. **[066 corrected this list twice, both measured](wayfinder/tickets/066-docs-furniture-boundary.md):** `remark-gfm` is missing and without it the `css` options table is a paragraph of pipes, and shape C adds `remark-directive` — so it is a seven-package pipeline, not five. `remark-directive`'s own place is [docs-directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md)'s to argue; the other six are this ticket's.
3. **No `rehype-sanitize`** — settled at charting; the reason is on the map. What replaces it is a test that fails if `<script` appears in any generated docs HTML. Decide where that test lives and what exactly it reads.
4. **Does `csr = false` cost anything beyond the marker?** Confirm what a script-free `/docs` means for navigation *into* it from the homepage's client router, for the edge-injected analytics beacon (`wayfinder/tickets/016-web-analytics.md:34,37` — it is not a repo file and not SvelteKit's to hash), and for the page's own `<svelte:head>` title. None of these is expected to break; none has been checked.
5. **What happens to the bundle-diffing habit?** `README.md:132–140` and `remark/build.js` establish that committed bundles are diffed against a fresh build of themselves. A prebuild script would join that family and inherit a staleness test; a load function would not. That is an argument for or against option 1 depending on which way you read it.

**Inherited from [source-set](wayfinder/tickets/068-docs-source-set.md) (closed 2026-08-15) — one question of this ticket's is now closed, the rest are untouched:**

- **Glob versus import is settled: eight named `?raw` imports**, following `web/src/lib/chrome/examples.ts:11–14`, with the body carried on a register row in `web/src/lib/docs/sections.ts`. Not a stylistic call — a renamed file becomes a Vite module-resolution error rather than an `undefined` reaching `{@html}`, which is the id contract's primary guard. So item 1's placement question is now *only* about where the unified pipeline runs, not about how the files are found.
- **Still entirely this ticket's:** whether the register row carries raw source or already-rendered HTML; whether the pipeline runs at module init (`processSync` — every plugin in the chain is synchronous), in a `load`, or in `+page.server.ts`; and whether `csr = false` rides along. Note that a register that carries *rendered* HTML and runs at module init makes items 1 and 5 nearly moot, and that is a live option worth pricing rather than assuming a load function.
- **Item 3's `<script` guard now has two siblings, not one.** 068 decision 8 landed a bijection test and a typed `DocsId` union; 072 item 3 owns the unknown-directive guard. 072's own note that "three guards is possibly one guard" now reads across four — worth settling before any of them is written.

Use `/grilling` and `/domain-modeling`.

## Resolution

**`+page.server.ts` with `csr = false` declared in `+page.ts`, a six-package pipeline, and the bodies behind `$lib/server/`.** Ratified by Mitchell on 2026-08-15 across two grilling rounds, each put after the measurements rather than before them. Six probe routes were built into `web/src/routes/probe-*`, driven with Chrome against `npm run preview`, and removed; `git status` clean afterwards. Corpus: the 066 prototype's real converted `#remark` section copied to eight ids — 19,983 bytes of Markdown, the right order for the page's running prose. Full table and scripts: `.scratch/069-read-shape/MEASURED.md`.

### The measurement that decided it

The ticket asked for module init to be *priced rather than assumed*. Priced, it is the worst of the four, and for a reason neither the research nor the ticket had in view:

| Shape | prerendered HTML | inline `<script>` | CSP hash | **fetched on hover** | parser in client build |
|---|---|---|---|---|---|
| *(reference)* today's `/docs` | 35,799 | 473 | yes | 30,634 | — |
| module init `processSync` | 26,065 | 473 | yes | **138,096** | yes, and loaded |
| module init + `csr = false` | 24,852 | **0** | **none** | **138,096** | yes, fetched then discarded |
| `+page.server.ts` + `csr = false` | 24,852 | **0** | **none** | **412** | no |
| build-time transform + `csr = false` | 24,852 | **0** | **none** | 23,448 | no |

1. **`csr = false` does not keep a module-init pipeline out of the client build.** The node still emits an import of the 137,685-byte chunk holding micromark *and* all eight raw sources. The page never runs it; the chunk is still built and deployed.
2. **`data-sveltekit-preload-data="hover"` is on the body site-wide** (`web/src/app.html:19`), which turns that chunk from dead weight into a live cost. SvelteKit has to load a page's node module to *learn* it is `csr = false` — so hovering "Docs" on the homepage downloads 138 KB, throws it away, and full-page-navigates anyway. `data-sveltekit-reload` on the inbound links removes it (measured: 0 bytes fetched) at the price of an attribute on each of 8 links (`web/src/routes/+page.svelte:197`, `:429`, and the six-entry tools grid at `:61–66`) that nothing enforces — a ninth link silently reintroduces the tax. **Rejected:** at 412 bytes the tax is noise, and the chore buys back a rounding error in exchange for an unenforced invariant. It is an argument against the shapes whose tax is 23 KB+, not an argument for the attribute.
3. **`+page.server.ts` is the only placement that keeps the parser and the sources out of the client graph entirely**, which is why its hover tax is 412 bytes rather than 23 KB.

### The decisions

1. **Placement: `+page.server.ts`.** The research's §9 recommendation survives, but on evidence it did not have. It is the only option that makes the question disappear rather than manage it: no parser in the client graph, no committed artifact, no per-link attribute rule. The two rejected-on-measurement alternatives: **module init** (finding 1 above), and a **prebuild script** in the `build:*` family — which would have joined the bundle-diffing habit (`README.md:139`) and inherited a staleness test, but at the price of the first committed generated artifact that is *prose*, so a copy editor's PR diff would show their Markdown **and** a machine-written HTML blob. A **Vite plugin** has the prebuild's client profile without the artifact, but it is bespoke machinery this repo has none of and is what `mdsvex` already is, rejected at charting.

2. **`csr = false`, declared in `+page.ts` — not in `+page.server.ts`.** Measured, and it inverts the cost: with the option exported only from the server module, the router cannot know the page is CSR-less without asking, so a hover fetches the node module **and `__data.json`** — 27 KB in the real case — then discards both. From `+page.ts` it stays at 412 bytes. This is a one-line file whose placement is load-bearing and would have been inferred wrong.

3. **The pipeline is six packages: `remark-parse → remark-gfm → remark-directive → remark-rehype → rehype-slug → rehype-stringify`.** Four are already pinned (`unified`, `remark-parse`, `remark-rehype`, `rehype-stringify`, used today only by `remark/src/plugin.test.ts`); `remark-gfm@4` and `rehype-slug@6` are added, and `remark-directive` is 072's to argue. Against the research's §9 list this **drops `rehype-raw`** and keeps the already-settled **no `rehype-sanitize`**.
   - **`rehype-raw` dropped.** It is needed only if raw HTML survives into the Markdown, and under shape C the furniture is directives — 068 decision 11 already established that a copy editor cannot even add an image. Dropping it makes "no raw HTML in the prose" a property of the pipeline instead of a rule in a style guide.
   - **`rehype-slug` kept.** 066 measured it adding ids to the three `<h3>`s, which have none today. The worry that it is a second id-minting mechanism on a page whose contract is that ids are *not* sluggable does not bite: the eight contract ids live on `<section>` elements in the shell, and `rehype-slug` only ever touches headings inside a body.

4. **The register splits three ways.** 068 decision 7 put the body "on a register row in `sections.ts`" and explicitly handed *raw-or-rendered* here. Decision 1 forces the split — `sections.ts` is imported by the shell, so bodies on its rows would drag 20 KB of Markdown into the client chunk and turn the 412-byte hover tax into a 20 KB one.
   - `web/src/lib/docs/sections.ts` — metadata only (order, chip, label, title), `as const`, exports `DocsId`. Client-safe.
   - `web/src/lib/server/docs/bodies.ts` — the eight named `?raw` imports, the pipeline, and 072's transformer.
   - `+page.server.ts` joins them and returns the **merged, ordered array** — not a `Record<DocsId, string>`, because 068 decision 8 specifically warned off a `bodies[s.id]` lookup that can go `undefined` into `{@html}`.

   The shell then loops `data.sections` and imports `sections.ts` not at all; the homepage imports only the `DocsId` *type*, which erases. That is why the hover tax measured 412 bytes rather than 20 KB. **`$lib/server/` was chosen because it is enforced by the build, not by etiquette** — measured: a client-side import of `$lib/server/bodies.ts` fails with `Cannot import $lib/server/bodies.ts into code that runs in the browser` and `npm run build` exits 1. This is the same move the whole ticket makes: convert rules into structure. It also gives 072's transformer a home with a unit test, which it will need.

5. **The `<script` guard the ticket asked to place is retired by construction, and one new assertion replaces it.** Without `rehype-raw`, `remark-rehype` **drops raw HTML tags and keeps the text between them** — measured, and not what the round-one framing assumed: `A paragraph with <script>alert(1)</script> inline.` renders as `<p>A paragraph with alert(1) inline.</p>`, and `Text with <b>bold</b>.` renders as `<p>Text with bold.</p>`. No script can ever execute, so the security guard genuinely has nothing left to catch. But the failure mode for an author who types HTML is **silent content corruption** — the pipeline succeeds, the build succeeds, the page renders, and the words are quietly wrong. So `sections.test.ts` gains one assertion: no `<` followed by a letter in any `docs/site/*.md`. Five lines, and it states the no-raw-HTML rule in the one place an author will meet it.

6. **The four guards do not consolidate, and that is a feature.** The inherited "three guards is possibly one guard" note, now read across five, resolves against consolidation: they fire at four different times — **Vite module resolution** (a renamed `.md`), **`npm run check`** (`DocsId` against the homepage's hrefs), **`npm test`** (the orphan test, the `REPO` URL test, and decision 5's new assertion), **`npm run build`** (a pipeline that throws — measured: a throwing load fails the prerender and `vite build` exits 1, so a `.md` the pipeline chokes on cannot ship) — plus 072's unknown-directive guard. Collapsing them into one test would move three of them *later*. Each catches its failure at the earliest moment it is visible.

7. **The `__data.json` residue is accepted.** `adapter-static` writes a 26,969-byte `/docs/__data.json` that, with decision 2 in place, nothing ever fetches. It is a second public URL serving the docs prose as rendered HTML; nothing links to it, and `adapter-static` has no config to suppress it. Deploy weight, not reader weight, and the content is already public at `/docs`. The research's objection 3 (§9, "120 KB of duplicated payload") was about the *inline* duplication, which `csr = false` removes outright.

### The `csr = false` fallout, checked rather than assumed

Item 4 named three things expected not to break and never checked. All three checked:

- **Navigation from the homepage's client router** — becomes a full page load. Cost is the 412-byte hover preload (finding 2); nothing else changes.
- **The edge-injected analytics beacon** — no pageview is lost. `beacon.min.js` patches `history.pushState` and mints a fresh navigation id, so today's client-side homepage→`/docs` hop is *already* counted; under `csr = false` it becomes a full document load, which the beacon also counts. The timings become real navigation timings instead of SPA route-change timings, which is better data, not worse. The beacon is an external `<script src>` injected at serve time (016's resolution) and is unaffected by anything here.
- **`<svelte:head><title>`** — emitted at prerender, unaffected. Confirmed the page carries **no `<script>` at all** and its CSP `<meta>` loses its `sha256-` entirely: `script-src 'self' https://static.cloudflareinsights.com`.

### The payoff, verified end to end

The thing the whole map is for: with the pipeline in a server load, **editing a `docs/site/*.md` under `npm run dev` shows up on the next reload with no restart** — driven live against a probe route. This needs `'../docs'` beside the existing `'../examples'` in `server.fs.allow` (`web/vite.config.ts:51`), the line 068 decision 2 already called for and 066 measured. The module-init shape would have needed HMR machinery to get the same loop.

### What this hands the other tickets

- **[directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md)** gains a home for its transformer — `web/src/lib/server/docs/bodies.ts`, server-only and unit-testable — and inherits decision 6's finding that its unknown-directive guard is the fifth mechanism in a set that deliberately does not consolidate.
- **[stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md)** is untouched by any of this; the placement decision does not reach the stylesheet.
- **[spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md)** must carry decisions 1, 2 and 3 as the mechanism, decision 4's three-module split as the shape, and decision 6's four-times guard set — in particular decision 2, which is a one-line file whose placement is worth stating explicitly because it is the kind of detail a builder would get wrong.
