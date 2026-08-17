---
name: docs-stylesheet-scoping
title: "Decision: where the docs stylesheet lives once the prose leaves the template"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
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

## Resolution

**The stylesheet splits along the seam the DOM splits along: 5 shell rules stay scoped in `+page.svelte`, 22 body rules go global in `web/src/lib/docs/prose.css`, and the block stays unlayered because 49 utility declarations depend on it.** Ratified by Mitchell on 2026-08-15 across four grilling rounds. The ticket asked five questions; the answer to the first of them was decided by a measurement the ticket had not anticipated, and one further question surfaced that it had not named.

### The measurement that reframed the ticket

The ticket treats "where do the rules live" as a question of taste between four homes. It is not. Measured against the real built page in Chrome, by disabling the docs route's own stylesheet and diffing computed styles:

1. **Svelte emits the block *unlayered*, and Tailwind 4 emits everything in `@layer theme, base, components, utilities, properties`.** Unlayered declarations beat every layer regardless of specificity, so today the docs block outranks **every Tailwind utility on the page**. The route chunk is `assets/3.*.css`, 3.3 KB, loaded on `/docs` alone; `app.css` is a 32.9 KB chunk shared by all three pages.

2. **49 utility declarations across 18 markup sites are misrepresented as a result — 40 of them dead outright** ([decision 9](#the-attribution-card-and-the-enumeration) has the split; the count was corrected on 2026-08-17) — the page does not render as its markup reads. The attribution `<section class="mt-24 flex justify-center">` computes `display: flow-root` and sits hard against the left edge of the column (x=407 in a 408→1264 column) instead of centred; nine labels asking for `text-[11px]` or `text-[10px]` render at **15px** with their `tracking-wide` computed against the wrong font size; seven field-note paragraphs asking for `mt-1 text-sm leading-relaxed` render at 14px margin / 15px / 25.5px.

**This is what makes the four homes non-equivalent.** Any home that puts these rules into a Tailwind layer — `@layer components`, `@utility`, or anything else the Tailwind 4 idiom offers — changes all 49 at once, silently and page-wide, switching 40 on and re-basing the other 9. That disqualifies the ticket's fourth candidate on measurement rather than on taste, and it turns "which home" into "which home preserves the cascade position", where three of the four do.

### The decisions

1. **The cascade contract moves with the rules, and then the page gets cleaned.** The new home stays unlayered so the rendering is byte-for-byte what it is today, *and* the dead utility classes are deleted from the markup so what is written is what renders. Preserving alone would carry a lie forward that the next reader re-discovers; letting the utilities win would change the page's appearance inside a map whose whole premise is that the prose moves and the page looks the same. The deletion is not optional housekeeping: under shape C those Tailwind strings move **into the transformer** ([directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md) item 5), so a dead class not deleted first is a dead class copied into a `.ts` file.

2. **The boundary does not move.** `.docs` stays exactly where it is. Wrapping each `{@html}` body in a shell-owned element was priced and rejected: it still cannot reach descendants — that is 066's whole finding — so it buys a narrower namespace, not a guarantee, at the price of changing the DOM 066 worked to preserve. Rewriting to fewer, broader rules was rejected as mixing a redesign into a migration.

3. **The stylesheet splits, and the seam is the same one as everywhere else in this map: who renders it.** Rules for what the **shell** renders keep the compiler's guarantee; rules for what the **pipeline** generates go global. Counted exactly, the 27 rule blocks are **5 shell** and **22 body**:

   - **Shell (stay scoped in `+page.svelte`):** `.underline-command`, `.underline-event` (the masthead `<h1>`, kept in the shell by [source-set](wayfinder/tickets/068-docs-source-set.md) decision 9), `.chip-label` (drawn by `chiphead` inside the `{#each}` loop), `.docs section` and `.docs section + section` (the `<section>` elements are the loop's). **`.chip-label` is de-globalised** — its element is shell-rendered, so it gets its scoping back.
   - **Body (move to `prose.css`):** the other 22, of which 5 already carry a `:global()` wrapper they no longer need and 17 shed a scoping they had.

   **This is not bookkeeping — the split prevents a live regression.** `.underline-command` and `.underline-event` **also exist on the homepage with a different implementation**: homepage `+page.svelte:587–598` draws them as an animated `background-image` gradient, docs `:609–614` as `box-shadow: inset`. Two same-named classes, different bodies, one file apart, and Svelte's scoping is the only thing keeping them apart today. Globalising the docs pair puts a second stroke under the homepage headline. Renaming one pair was considered and rejected: the rename would land on the *homepage's* marker idiom, which [source-set](wayfinder/tickets/068-docs-source-set.md) decision 9 already declined to teach a directive vocabulary.

4. **The 22 body rules live in `web/src/lib/docs/prose.css`, imported by `+page.svelte`.** Beside `sections.ts` ([source-set](wayfinder/tickets/068-docs-source-set.md) decision 6), so the class names the transformer emits and the rules that style them are neighbours — the concrete answer to [directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md) item 5's "two homes, and nothing keeps them in step". Verified rather than assumed:

   - A plain `.css` imported from a route lands in its **own route-only chunk**, **unlayered**, and beats the utilities — measured at the same 15px / 14px the scoped block produces today.
   - **Under `csr = false` Vite merges it with the component's scoped `<style>` into one chunk** (probed: both rules in a single file, `prose.css` first, both unlayered). **So the split costs zero extra requests** — the round-two claim that it costs one was wrong.
   - The prerendered page carries **zero `<script>` tags** with the CSS import in place, so the JS-free destination holds through it.
   - `prose.css` needs no Tailwind processing: `@theme` emits real custom properties on `:root`, so `var(--color-ink-soft)` and friends resolve from a plain file.

   **Two rejected homes.** A `:global { … }` block in the existing `<style>` is cheaper than the ticket assumed — Svelte 5.56.8 (this repo) supports the **block** form, so it is one wrapper, not the per-line noise item 1 describes, and that objection should be considered retired. It was still rejected: it puts the styling for pipeline-generated DOM inside the component that merely `{@html}`s it, while the code generating that DOM lives in `$lib/server/docs/`. `app.css` was rejected on measurement — it is the 32.9 KB shared chunk, so `/`, `/edit` and every future page would download the docs' prose typography.

5. **What replaces the guarantee: convention plus one test.** Every selector in `prose.css` is written under `.docs`, and a test parses the file and asserts it. Cheap, and it catches exactly the failure the `.underline-*` pair proves is real rather than theoretical. **This is a fifth guard, and unlike the other four it genuinely does not consolidate** — [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) decision 6 already settled that the guards fire at four different times and collapsing them moves three of them later; this one inspects a **stylesheet**, not generated HTML or a register, so it has nothing to fold into. Whoever reads [directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md) item 3's "three guards is possibly one guard" should stop counting at four.

6. **Two rules the page gains, and one it does not.** `pre > code { font-size: inherit }` goes into `prose.css` — forced, because Markdown fences nest a `<code>` today's bare `<pre>` lacks and `.docs code`'s `0.86em` would compound to 0.74em. `rehype-slug`'s new `<h3 id=…>`s get **no styling and no suppression**: they are free deep links, and [source-set](wayfinder/tickets/068-docs-source-set.md)'s contract is about the eight ids existing and not moving, which unrelated `<h3>` ids do not threaten. A visible anchor affordance was rejected as a new affordance this map never scoped.

7. **The five furniture `:global`s had no reason, and the ticket's item 4 dissolves.** Probed rather than reasoned: de-globalising all five in a copy of the route compiles clean — no unused-selector warning, and the selectors come out matching today's DOM exactly (`.docs.svelte-x .filecard:where(.svelte-x)`). There is no compiler constraint behind them. Under decision 3 the question disappears anyway: four of the five (`.docs .note` ×2, `.docs .filecard` ×3) are **body** rules that go global by construction, and the fifth (`.chip-label`) is a **shell** rule that gets scoped. The pre-existing split was real but drawn on the wrong axis — it split *furniture from prose*, and after this map the axis that matters is *shell from pipeline*, because under shape C most furniture is pipeline-generated.

### The attribution card, and the enumeration

8. **The attribution card moves outside `.docs`, and three things change on it.** The card is the only thing inside `.docs` that is not one of the eight section bodies, and that anomaly is what caused the whole cascade finding: `.docs section { display: flow-root }` catches it, so `flex justify-center` never applied. The masthead — the same category of chrome — is **already** outside `.docs` (`.docs` opens at `:138`, the masthead sits at `:101–115`), so the card joins it. Consequences, all intended: the card **centres**; its `attribution` label goes 15px → 11px with correct tracking; its body paragraph goes 15px/14px-margin → 14px/4px. The alternative — keeping the card inside `.docs` and narrowing `.docs section` to the eight — was rejected because `.docs p:not(.lede)` would keep catching its two paragraphs, leaving 6 of the 8 shell declarations dead and the checklist with a permanent exception. The payoff beyond the card: **`.docs` becomes a name with exactly one meaning — the pipeline's output** — which is what makes decision 5's test say something true, and it lets `.docs section` stay correct with no new class.

9. **The 49 are enumerated here because nowhere else can produce them.** The list took a headless browser and a stylesheet-disabling diff; nobody re-derives it from the rule alone. **18 markup sites, split 15 body / 3 shell — and the 49 are two things, not one: 40 declarations the block kills outright, and 9 it leaves standing but computes against the wrong font size.** Only the 40 are dead. **Amended 2026-08-17** — see below.

   | side | site | dead declarations |
   |---|---|---|
   | body | 6 × field-note body `<p class="mt-1 text-sm leading-relaxed">` — `#editor`, `#cli`, `#fence`, `#remark`, `#vscode`, `#mcp` | `mt-1`→margin-top, `text-sm`→font-size, `text-sm`→line-height, `leading-relaxed`→line-height |
   | body | 6 × field-note label `<p class="font-mono text-[11px] … tracking-wide">` — same six sections | `text-[11px]`→font-size |
   | body | 2 × `#exports` card labels — "comes back", "one way out" | `text-[11px]`→font-size |
   | body | 1 × `#fence` image-card caption "what the fence draws" | `text-[10px]`→font-size |
   | shell | `#(attribution)` `<section class="mt-24 flex justify-center">` | `mt-24`→margin-top, `flex`→display |
   | shell | `#(attribution)` label `<p>` "attribution" | `text-[11px]`→font-size |
   | shell | `#(attribution)` body `<p>` | `mt-1`→margin-top, `text-sm`→font-size ×2, `leading-relaxed`→line-height |

   **The 9 `tracking-wide` declarations are live, and this table used to say they were dead.** Found while building step 3 of [spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md)'s build order: deleting them moved eight elements, `letter-spacing: 0.375px → normal`, on the six field-note labels and the two `#exports` labels. Nothing in the block sets `letter-spacing`, so `tracking-wide`'s `0.025em` lands — it is the *base* it multiplies that the block hijacks, which is exactly what this ticket's own measurement said ("with their `tracking-wide` computed against the wrong font size"). The prose was right and the table flattened two failure modes into one column. The ninth is the attribution label's, which decision 8 already fixes by moving the card. **Consequence for the cleanup: 33 body declarations get deleted, not 41** — the nine `tracking-wide`s stay in the markup and must be carried into the transformer, or the labels lose their tracking. Verified: with the 33 gone and the `tracking-wide`s kept, all 339 elements of the built page match byte-for-byte across two viewports and 55 computed properties.

   **Ownership follows the seam.** The 15 body sites sit in markup [directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md) moves into the transformer, so deleting them there is the same edit as writing it. The 3 shell sites are this ticket's, resolved by decision 8 — resolved by the card *moving*, not by deletion: the 7 dead shell declarations become live at that moment, which is what makes decision 8's three visible changes happen, so deleting them would silently cancel them. A browser test that keeps the property true was considered and rejected: it needs a real browser for computed styles, and it guards a property that stops being interesting once the 40 are gone — the trap exists because the classes are already written, not because new ones keep arriving.

### Vocabulary

**Shell rules** and **body rules** — named after the seam they mirror rather than getting a vocabulary of their own, matching how [furniture-boundary](wayfinder/tickets/066-docs-furniture-boundary.md) and [source-set](wayfinder/tickets/068-docs-source-set.md) already say *shell* and *body*. Deliberately **not** "furniture rules": under shape C most furniture is pipeline-generated, so furniture/prose is no longer the axis that decides anything. Neither term reaches `CONTEXT.md` — the stylesheet is website furniture, the same ruling the map already made for the section marker, and `CONTEXT.md` is the canvas domain's glossary.

### What this hands the other tickets

- **[directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md)** gets its item 5 answered from one side: the stylesheet is `web/src/lib/docs/prose.css`, next to `sections.ts`, and every class the transformer emits must be `.docs`-rooted to pass decision 5's test. It also inherits 15 of the 18 cleanup sites, and its item 3 guard count goes to five.
- **[spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md)** gets a fact worth stating in `SPEC.md` §2: the docs page's prose rules are **not** scoped by the compiler and cannot be, so `.docs` is a namespace held by convention and one test. It also gets decision 8's three visible changes, which are the only intended appearance change in the whole map.
