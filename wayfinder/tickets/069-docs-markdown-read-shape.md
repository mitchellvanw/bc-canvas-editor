---
name: docs-markdown-read-shape
title: "Decision: how the Markdown is read at build, under csr = false"
labels: [wayfinder:grilling]
status: open
assignee:
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
