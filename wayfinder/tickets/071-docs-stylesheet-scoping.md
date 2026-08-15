---
name: docs-stylesheet-scoping
title: "Decision: where the docs stylesheet lives once the prose leaves the template"
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: [docs-furniture-boundary]
---

## Question

Surfaced by [furniture-boundary](wayfinder/tickets/066-docs-furniture-boundary.md), which measured it rather than predicting it, and which nothing in `docs/research/markdown-derived-docs.md` anticipated.

Svelte scopes CSS by stamping a `svelte-<hash>` class onto elements **in the template**. Every non-`:global` rule in the docs page's 173-line `<style>` block compiles to the form `.docs.svelte-1xmjmrw p:where(.svelte-1xmjmrw)`. `{@html}` output is not in the template, is never stamped, and is therefore not reached by **22 of the 27 rules**. The prototype's `shots/a-scoped.png` shows the result: unstyled text.

The five rules already written `:global` are the furniture ones — `.chip-label`, `.docs .note`, `.docs .filecard`, its `figcaption`, its `pre`. Every rule that must change is a **prose** rule: `.lede`, `h3`, `p:not(.lede)`, `ul`, `li`, `li::marker`, `dt`, `dd`, `a`, `code`, `kbd`, `pre`, `pre.term`, `table`, `th`, `td` (`web/src/routes/docs/+page.svelte:607–778`).

1. **Where do the rewritten rules live?** Four candidates, and the choice is not obvious. A `<style>` block in `+page.svelte` where every rule is wrapped in `:global()` — closest to today, but the wrapping is noise on every line and the scoping guarantee is gone while the file still looks like it has one. A plain `.css` file imported by the route. `app.css`, where the site's tokens already live (`web/src/app.css`) — but that is global to three pages and the docs prose rules are not wanted on the homepage. Or a Tailwind `@layer` / `@utility`, since the project is on Tailwind 4 and the page already mixes utilities with the scoped block.
2. **What replaces the guarantee?** Today `.docs p` cannot leak, because the compiler says so. Globalised, `.docs` becomes an ordinary namespace and the only thing keeping the docs' `p` rules off the homepage is that every rule is written under `.docs`. Decide whether that convention is enough, or whether something enforces it.
3. **Does the boundary move?** An alternative worth pricing before settling: keep the prose rules scoped and have the *shell* wrap `{@html}` output in elements it owns. It does not work for descendants — that is the whole finding — but it may change where the `.docs` container sits, or argue for fewer, broader rules.
4. **What about the furniture rules that are already `:global`?** They were written that way for a reason nobody has recorded. Find out whether that reason survives, since under shape C the furniture is generated too and the two groups stop being different.
5. **Two rules the prototype found the page will need.** `pre > code { font-size: inherit }`, because Markdown fences nest a `<code>` today's bare `<pre>` does not have and `.docs code`'s `0.86em` compounds. And whatever `rehype-slug`'s new `<h3 id=…>`s want, if anything — they are an improvement, not a problem, but they are new DOM.

Independent of [source-set](wayfinder/tickets/068-docs-source-set.md) and [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md): this is true wherever the files live and however they are read.

Use `/grilling` and `/domain-modeling`.
