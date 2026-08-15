---
name: docs-spec-amendment
title: "Decision: what SPEC.md says, and what exactly is handed off"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [docs-css-section-marker, docs-source-set, docs-markdown-read-shape, docs-stylesheet-scoping, docs-directive-vocabulary]
---

## Question

The map's gate. This map **decides and does not build**, so the way is clear only when the decisions are written where a builder can pick them up without re-deriving them.

1. **What does `SPEC.md` §2 say?** Today it states the three prerendered pages, the static 404, and the eight docs anchor ids "the homepage links into, which makes those ids a contract" (`SPEC.md:35`). It must gain: that `/docs` renders from committed Markdown, and that it carries no client script — or, if [css-section-marker](wayfinder/tickets/067-docs-css-section-marker.md) came back yes, that the section marker is CSS. Restate the anchor-id contract as the thing that **survives** the move, since that is the invariant every other decision was shaped around.
2. **Does the prose stay outside the spec?** `SPEC.md:35` declares the docs copy documentary and outside itself. Moving it into files does not obviously change that, but it is now *committed source with a path*, which is exactly the kind of thing a spec usually names. Decide, and say why.
3. **Does `CONTEXT.md` gain anything?** Charting said no: the section marker is website furniture, and `CONTEXT.md` is the canvas domain's glossary. Confirm that still holds once 066–069 have landed, and in particular that nothing in the source set has invented a term the glossary should own.
4. **What is the hand-off, precisely?** The Markdown authoring and the pipeline code are not this map's to write. Name what the builder receives: which tickets hold which decisions, what `SPEC.md` now asserts, what the two guard tests must check, and what is deliberately left to their judgement. A hand-off that says "see the map" has not been written.
5. **Anything the route revealed as out of scope?** Rule it out here rather than resolving it — a scope boundary is not a step on the route, and it belongs in the map's Out of scope with the closed ticket linked.

Use `/grilling` and `/domain-modeling`; `writing-copy` for the spec prose itself.

## Resolution

**`SPEC.md` gains §2.1, one sentence of §2 is retracted as false, and the map closes with both fog patches ruled out of scope.** Ratified by Mitchell on 2026-08-15 across two grilling rounds. The ticket asked five questions; a sixth surfaced that it had not named and that had to be answered first, because it *forbade* the mechanism the map spent five tickets choosing.

### The finding the ticket did not name

**`SPEC.md:34` said "Strictly client-side; no server code", and [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) had made that false.** The decision adds `web/src/routes/docs/+page.server.ts` and `web/src/lib/server/docs/bodies.ts`. A builder reading line 34 would have rejected that placement outright — and it is the placement whose three alternatives were each rejected *on measurement*, so the spec would have argued a builder back into the shape that costs 138 KB on hover.

The reconciling facts were already in the repo and simply never written down together: `prerender = true` sits at the root (`web/src/routes/+layout.ts`), `adapter-static` emits only static files, and no server exists at runtime. The spec also already carried the build-time sense of the word — `SPEC.md:324` says "headless **server** compile … in plain Node with no browser". So the sentence was narrowed rather than deleted: **"strictly client-side at runtime"**, with the one exception named inline and its `$lib/server/` boundary described as build-enforced. Rejected: leaving line 34 and letting §2.1 explain, which asks a builder to reconcile a contradiction at exactly the moment they are deciding whether to trust the spec.

### The decisions

1. **§2.1, not a longer bullet.** The material — path, placement, `csr = false`'s file, six packages, the three-module split, an unlayered stylesheet, eight words, five guards, two hazards — does not fit in a bullet, and §2's Site-shell bullet already carries the homepage and `/edit`. §3.5 "Bundled examples" is the exact precedent: a shipped-asset family with a path, a contract and a decision-record pointer, as a subsection. A new top-level section was rejected as over-weighting one page against §3–§9, which are the product. The anchor-id contract sentence **stays** in the §2 bullet where the homepage's link relationship lives; §2.1 restates it as the invariant that survives the move, and the bullet gains one pointer.

2. **The prose stays outside the spec, and the spec names its path anyway.** The ticket's item 2 asked whether moving copy into files changes its status. It does not — [source-set](wayfinder/tickets/068-docs-source-set.md) confirmed the move is byte-for-byte with no `writing-copy` pass — but the spec names *where things live* without owning *what they say*, exactly as §3.5 names `examples/*.bcc.json` and §1 names `cli/`. §2.1 therefore names `docs/site/*.md` and states the line explicitly: **this spec owns the contract, not the copy.** That sentence is what every future "should this go in SPEC?" question gets decided against.

3. **Both of [directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md)'s nominated hazards go in, framed as constraints rather than instructions** — which is what dissolves that ticket's own tension. Its decision 10 rejected `SPEC.md` as the *vocabulary's* home on register grounds, while its hand-off note asked for two facts to land here. Both hold at once: "no `.md` can carry a build-resolved asset" is a limit of the pipeline, and the colon hazard is a property of the parser the page runs. Both are what a **builder** must know before designing around them; the **copy editor** meets both through the guard's error message, which stays the vocabulary's only reference. The eight words are named in §2.1 for orientation, but §2.1 states that the guard is where they live — it is not a second list to keep in step.

4. **§2.1 cites its six tickets; §14 gains this map's provenance only.** The citation idiom is established at `SPEC.md:20–21` and §2 carried none, which made it the section most in need of it. §14 gains `css-only-scroll-spy.md`, `markdown-derived-docs.md` and the 066 prototype branch. **Noted and deliberately not fixed:** §14 is stale for two earlier maps — `docs/research/canonical-canvas-v5.md` and `mcp-server.md` were never added, nor were the later prototypes. Repairing that is a different effort's work and was not smuggled in under this map.

5. **`proto/066-docs-furniture-boundary` was pushed before being cited.** It was local-only; every other branch §14 cites is on `origin`, so as drafted the entry would have been a dead pointer for anyone but Mitchell. Pushed. Its name breaks the `prototype/*` convention the other four follow — known, not worth renaming.

6. **`CONTEXT.md` gains nothing, and the test is recorded rather than the verdict.** The route coined *shell* / *body*, *register*, *word*, *shell rules* / *body rules*, *section marker*, *filecard* / *field note* / *term block*, and *lede*. Every one names website furniture. The reason is not that they are minor: `CONTEXT.md` is the **canvas domain's** glossary, and the test is "does this name something in the canvas domain?" — not "did we coin it?". Worth stating once, because the map has now had to answer this four separate times ([css-section-marker](wayfinder/tickets/067-docs-css-section-marker.md), [stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md), [directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md), here). Also checked: nothing in the eight-file source set invented a canvas-domain term — the files are named for site sections.

7. **§8 needs no companion edit.** Dropping the section marker removes an `aria-current`, which looks like it should touch §8 "Keyboard model & accessibility". Checked: §8 is editor-scoped throughout ("the editor commits to full keyboard operability") and never mentions the docs nav or its sticky list. The removal is recorded in §2.1 alone and ripples nowhere.

### The hand-off

`SPEC.md` §2.1 is normative and durable — what the page **is**. This resolution carries the sequence and the judgement calls — how to get there. A separate hand-off document was rejected: a third place that rots, and nothing else in this repo works that way.

**Build order.** One hard constraint, everything else resequenceable:

1. `server.fs.allow` gains `'../docs'` beside `'../examples'` (`web/vite.config.ts:51`); the eight `docs/site/*.md` authored as a byte-for-byte move.
2. Declare `remark-gfm@4.0.1`, `remark-directive@4.0.0` and `rehype-slug@6.0.0` in the root `package.json`. All three sit in `node_modules` today only as residue from the 066 prototype install — `npm test` passes on undeclared packages, and a fresh clone fails on a machine that never ran the prototype.
3. **Delete the 49 dead utility declarations across the 18 markup sites** ([stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md) decision 9). **This is the ordering constraint:** 15 of those 18 sites sit in markup step 5 moves into the transformer, so a dead class not deleted first is a dead class copied into a `.ts` file where nobody finds it again.
4. `sections.ts` + `DocsId`; the shell becomes the `{#each}` loop; the homepage's hrefs typed.
5. `web/src/lib/server/docs/bodies.ts` — raw imports, pipeline, transformer, guard.
6. `+page.server.ts`; `+page.ts` carrying `csr = false`.
7. `prose.css` split; the attribution card moves outside `.docs`.
8. The five guards' tests.

**Left to the builder's judgement:** file and function names inside `$lib/server/docs/`, the transformer's internal structure, test-file layout beyond `sections.test.ts`, commit sequencing within the constraint above, and the guard message's exact wording beyond naming the eight words.

**Not theirs to revisit** — each decided on measurement, each silently wrong if changed: `csr = false` in `+page.ts` and not `+page.server.ts`; `$lib/server/` as a build-enforced boundary; `prose.css` unlayered; hast over HTML strings; the eight ids.

**One correction to the ticket's own framing:** it says "the two guard tests". The count is **five**, firing at four different times, and [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) decision 6 settled that they deliberately do not consolidate — collapsing them moves three of them later.

### Item 5: the sweep, and the map's fog

Both remaining **Not yet specified** patches are ruled **out of scope**, so the map closes with none. A map cannot end with fog on it: the frontier stopped at the destination.

- **The homepage's prose.** Four tickets turned "not yet sharp" into "sharp, and the answer is no". It goes out of scope with that argument recorded, and returns only as a fresh effort with its own destination — not as a resumption.
- **Per-page CSP directives.** Same reasoning already applied to the browser-support matrix two lines away in the map's Out of scope: a site-wide question surfaced by a one-page map. [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) narrowed it — SvelteKit already writes a per-page *policy* and `/docs` already loses its `sha256-`; what does not exist is per-page *directives* in `web/vite.config.ts`. One page still does not make the case.

Nothing else the route revealed sits past the destination. [directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md)'s own sweep came back empty, and no existing ticket turned out to be mis-scoped in.
