---
name: docs-furniture-boundary
title: "Prototype: where the Markdown ends and the Svelte furniture begins"
labels: [wayfinder:prototype]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

The crux of the whole map, and the one thing the research could not settle by reading: **the docs page's prose is not contiguous.** Field notes float into the right rail *past the measure*, filecards sit between paragraphs, term transcripts carry hand-placed `<span>`s. So "Markdown supplies each section's body" is not obviously a shape the page can take.

Counted from `web/src/routes/docs/+page.svelte`: 40 `<p>`, 15 `<h3>`, 14 `<li>` and 1 `<table>` that Markdown expresses directly, against 10 `<pre>`, 5 `<figure>`, 2 `<dl>`, 6 `note()` invocations and 173 lines of scoped `<style>` that it does not (`docs/research/markdown-derived-docs.md` §2).

Three shapes, and the prototype exists to make the seams visible rather than argue them:

1. **One contiguous body per section.** Markdown supplies the whole `<section>` interior; every piece of furniture is pushed to the section's edges or dropped. Simplest pipeline, most violent to the layout.
2. **Named fragments per section.** A section's Markdown is several named slices the Svelte shell interleaves with furniture. Preserves the layout exactly; makes the source set structural, and someone editing copy has to know which slice they are in.
3. **A directive vocabulary.** Markdown gains words for `field note`, `filecard`, `term`. Preserves the layout *and* keeps the source one file — at the price that the Markdown is a bespoke DSL and the maintenance has moved rather than fallen (the §2 warning).

**Convert one real section end to end** and look at where the seams land. Pick `#remark` or `#fence`: both carry a filecard, a config block and a field note, so they exercise the hard cases rather than the easy prose. `#editor` is the wrong choice — it is nearly all running prose and would flatter every option equally.

The prototype is throwaway and lands on a branch; **this map decides and does not build**, so what comes back is a shape and a recommendation, not a migration. Use `/prototype`.

Feeds [docs-source-set](wayfinder/tickets/068-docs-source-set.md) and [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md), both of which are blocked on the answer: file granularity and the load's data shape both fall out of which of the three shapes wins.

## Resolution

**Shape 3 — the directive vocabulary.** Ratified by Mitchell on 2026-08-15 against the prototype, which converted `#remark` end to end under all three shapes and drove them through a real build.

Prototype: branch `proto/066-docs-furniture-boundary`. Sources at `docs-proto/{a,b,c}/`, route at `web/src/routes/proto-docs-seam/`, driver and screenshots at `.scratch/docs-furniture-boundary/`. `npm run proto:seam` opens it; the bottom bar switches shape, toggles the stylesheet between scoped and `:global()`, and shows the source a copy editor would write.

### The finding the reading could not have produced

**Svelte's CSS scoping is the real seam, and it cuts against the prose.** The docs page's 173-line `<style>` block compiles every non-`:global` rule to the form `.docs.svelte-1xmjmrw p:where(.svelte-1xmjmrw)` (measured in `build/_app/immutable/assets/3.DPHUBk5A.css`). Svelte stamps that class onto elements in the **template**; `{@html}` output is not in the template, so it is never stamped, so the rule never matches. **22 of the 27 rules stop applying.** `shots/a-scoped.png` is what that looks like: the section renders as unstyled text — no measure, no serif lede, no dark term block, no cards.

The inversion is the sharp part. The five rules already written `:global` are exactly the **furniture** ones — `.chip-label`, `.docs .note`, `.docs .filecard`, its `figcaption`, its `pre`. Every rule that has to be rewritten is a **prose** rule: `.lede`, `h3`, `p:not(.lede)`, `ul`, `li`, `li::marker`, `dt`, `dd`, `a`, `code`, `kbd`, `pre`, `pre.term`, `table`, `th`, `td`. So the move does not just relocate the prose — it takes the prose's styling out of Svelte's scoping guarantee and leaves the furniture's inside it.

**This cost is identical under all three shapes.** It is a floor, not a discriminator, and it is absent from `docs/research/markdown-derived-docs.md` §2. It is now its own decision: [docs-stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md).

### What the three shapes did

Element census of the rendered `<section>`, taken in WebKit off the real build:

| | today | A · one body | B · fragments | C · directives |
|---|---|---|---|---|
| `p.lede` | 1 | **0** | 1 (shell) | 1 |
| `pre.term` | 1 | **0** | 1 (shell) | 1 |
| `figure.filecard` | 3 | **0** | 3 (shell) | 3 |
| `aside.note` | 1 | **0** — a `blockquote` | 1 (shell) | 1 |
| `div.overflow-x-auto` | 1 | **0** | 1 (shell) | 1 |
| carries the scope class | all | none | **furniture only** | none |
| source files for one section | 1 | 1 | **5** | 1 |

- **A is not a candidate.** Even with the stylesheet globalised (`shots/a-global.png`) the page is visibly worse: no serif lede, no dark term shell, filecards flattened to a bold line above a plain `<pre>`, the field note inline in the measure instead of floated into the rail. "Push the furniture to the section's edges" turns out to mean "delete the page's visual argument".
- **B works and costs five seams for one section.** The fragment count is the furniture count plus one — five prose files, six shell insertions, and the shell holds the order. It also leaves the page **half-scoped**: furniture from the template carries `svelte-3rjr1k`, prose from `{@html}` does not, so the stylesheet has to be globalised anyway and the intermediate state is harder to reason about than either endpoint.
- **C reproduces today's DOM.** Normalised diff of C against today: one spurious `div.contents` wrapper (an artefact of the prototype's `:::lede`, not inherent), **`+3` heading ids** from `rehype-slug` — an improvement, today's `<h3>`s have none — and **`−1`** coloured `$` prompt span in the term block. `shots/c-global.png` is visually indistinguishable from `shots/today-scoped.png`.

### What C costs, stated plainly

The prototype's transformer is **129 lines** (`web/src/routes/proto-docs-seam/pipeline.ts`) for five directive kinds. The whole page needs roughly seven or eight: counted across `web/src/routes/docs/+page.svelte`, 6 `note()`, 5 `filecard`, 5 `pre.term`, 2 `dl` card grids, 3 layout grid divs, 1 `overflow-x-auto`, plus inline `<kbd>` (3), which container directives cannot express and which needs the text-directive form. Concretely:

- **The furniture's markup moves from `.svelte` to `.ts`.** The field note's four Tailwind utility strings are now string-concatenated in a transformer rather than written in a `{#snippet}`. Two homes for markup, and the `.ts` one is not typechecked against the template.
- **The class names are duplicated** — once in the `<style>` block, once in the transformer.
- **An unknown directive fails silently.** A typo renders as an empty `<div>`, warns nowhere, and is invisible until someone reads the page. The DSL has no compiler. This wants a guard.
- **The note cannot contain a link.** The prototype flattens the directive's body to text. All six of today's notes are plain text, so nothing breaks — but it is a real ceiling on the vocabulary.
- **One new dependency**, `remark-directive`. Evaluated at its best rather than hand-rolled, deliberately: a hand parser would have misrepresented the shape. It is remarkjs-collective, unlike `mdsvex`.

These are the vocabulary's own questions and they get their own ticket: [docs-directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md).

### Two corrections to the research's recommended pipeline

Both measured, both against `docs/research/markdown-derived-docs.md` §9:

1. **`remark-gfm` is missing.** `remark-parse` is CommonMark; it has no tables. Without `remark-gfm@4`, the `css` options table renders as a paragraph of pipe characters — verified in `.scratch/docs-furniture-boundary/probe.mjs`. §9's five-package list is a six-package list.
2. **Markdown fences emit `<pre><code>`, not today's bare `<pre>`.** So `.docs code { font-size: 0.86em }` compounds against `.docs pre { font-size: 0.75rem }` and the code shrinks twice. One new rule, but it has to be written; the prototype carries it as `pre > code { font-size: inherit }`.

### One §10 open item closed for free

**The dev-server path for a repo-root Markdown directory works.** `npm run dev` against `import.meta.glob('../../../../docs-proto/**/*.md', { query: '?raw', eager: true })` returns 200 with the content present and no fs error, given one line added to `server.fs.allow` alongside the existing `../examples` (`web/vite.config.ts`). `docs/research/markdown-derived-docs.md` §10 listed this as measured only for the build. It is now measured for both. Note this does **not** decide `docs/site/` over `web/src/docs/` — it removes the dev-server objection to the repo-root option, which is [docs-source-set](wayfinder/tickets/068-docs-source-set.md)'s call.

### Not settled here

The prototype ran the pipeline in a `+page.server.ts` because it needed *a* placement to run at all. That is not a vote — the placement question, and whether `csr = false` rides with it, stays entirely with [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md). No CSP violation appeared in WebKit against the built page under the site's real policy, which is a fact that ticket can use.
