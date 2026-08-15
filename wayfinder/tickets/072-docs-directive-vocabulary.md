---
name: docs-directive-vocabulary
title: "Decision: the directive vocabulary — which words, and what catches a typo"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [docs-furniture-boundary]
---

## Question

[furniture-boundary](wayfinder/tickets/066-docs-furniture-boundary.md) chose shape 3, the directive vocabulary, on the evidence that it reproduces today's DOM almost exactly. It also priced the shape: a 129-line transformer for five directive kinds, with the furniture's markup living in a `.ts` file and a typo rendering as nothing. This ticket decides the vocabulary itself.

1. **Which words?** Counted across `web/src/routes/docs/+page.svelte`: 6 `note()`, 5 `filecard`, 5 `pre.term`, 2 `dl` card grids (the `comes back` / `one way out` export pair at `:253–287`), 3 layout grid divs, 1 `overflow-x-auto`, 3 inline `<kbd>`, 1 `<img>` figure (`:355–358`). That is seven or eight kinds. Decide which earn a word, which stay raw HTML through `rehype-raw`, and which are rare enough that the shell should keep them — the fence section's image-beside-filecard two-column grid appears **once** and may not want a vocabulary entry at all.
2. **Container or text?** `<kbd>` is inline and container directives cannot express it; `remark-directive`'s text form (`:kbd[⌘Z]`) can. Decide whether the vocabulary spans both forms or whether inline furniture stays raw HTML.
3. **What catches a typo?** The sharpest cost the prototype found: an unknown directive renders as an empty element, warns nowhere, and is invisible until a human reads the page. The DSL has no compiler. Options include failing the build on an unrecognised directive name, a test asserting a per-section element census, or accepting it. Note this is the *same class of problem* as the `<script` guard [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) item 3 owns and the id guard [source-set](wayfinder/tickets/068-docs-source-set.md) item 4 owns — three guards is possibly one guard, and someone should notice that before three tests get written.
4. **How rich is a directive's body?** The prototype flattens `:::note`'s body to plain text, so a note cannot contain a link or `<code>`. All six of today's notes are plain text so nothing breaks today — but that is a ceiling, and generating HTML from a string is what imposed it. Decide whether the transformer builds hast (richer, more code) or strings (simpler, flatter).
5. **Where does the furniture's markup live, and does it stay in step?** Under shape C the field note's four Tailwind utility strings move out of a `{#snippet}` and into the transformer. Two homes for markup, with the class names duplicated between the transformer and the stylesheet ([stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md)), and the `.ts` home is not typechecked against anything. Decide what keeps them honest.
6. **`remark-directive` as a dependency.** One new package, remarkjs-collective rather than single-maintainer. Confirm the version and its unified-11 compatibility the way `docs/research/markdown-derived-docs.md` §4.5 did for the others, and note that `remark-gfm` is a second addition the research's §9 list omits (see 066's resolution).
7. **Do the term blocks want a language, and therefore a highlighter?** Graduated here from the map's fog, which parked it until 066 decided whether the transcripts were Markdown at all. They are: a `:::term` wraps a fence. But the prototype's transformer throws the fence's `lang` away and emits a bare `<pre class="term">` with escaped text — so there is nothing for a highlighter to attach to. Decide whether `lang` survives into a `<code class="language-…">`. If it does not, the highlighter question is closed by construction; if it does, the research already named `rehype-starry-night@2.2.0` and `rehype-highlight@7.0.2` as the class-based options and ruled out `@shikijs/rehype`'s inline styles (§4.5). Today's colouring is hand-placed `<span>`s inside `pre.term` (`:309–313`) and the prototype loses them.

**Inherited from [source-set](wayfinder/tickets/068-docs-source-set.md) (closed 2026-08-15):**

- **Item 1 loses one of its three options.** 068 decision 5 collapses the eight hand-written `<section>` blocks into a single `{#each sections as s (s.id)}`, so **the shell can no longer hand-place anything inside a section body**. "Rare enough that the shell should keep them" remains available only for what sits *outside* the eight — the masthead and the attribution card. Everything mid-section is either a directive or raw HTML.
- **The `<img>` figure is settled as furniture and needs a word.** 068 decision 11: `orderSvg` is a Vite `?url` import that gets hashed at build, and Vite never sees `{@html}` output, so a Markdown image emits a literal unhashed path that 404s. It must be a directive with the imported URL passed into the transformer; its alt string becomes the label. Item 1's "may not want a vocabulary entry at all" is therefore answered — it does, even appearing once. The general ceiling, which belongs in the amendment: **no `.md` file can ever carry a Vite-resolved asset.**
- **A standing rule from 068 decision 10:** the vocabulary does not grow a word to save a repeated string. The four `{REPO}` links are hardcoded in full with a consistency test rather than given a placeholder directive. Weigh item 1's candidates the same way.

Independent of where the files live; feeds the hand-off. Use `/grilling` and `/domain-modeling`.

## Resolution

**Eight words, built as hast, with a build-time guard that validates names and attributes and names the vocabulary in its own error message.** Ratified by Mitchell on 2026-08-15 across three grilling rounds, each put after the measurements rather than before them. Every number below comes from five probe scripts and a census run against the real page; full tables and the scripts: `.scratch/072-directive-vocabulary/MEASURED.md`.

### The finding that reframed the ticket

**Three of the four costs 066 attributed to shape C are artefacts of the prototype, not properties of the shape.** The prototype reached its furniture by setting `node.type = 'html'` and concatenating strings. Rebuilt with `data.hName` / `data.hProperties`, and children left alone:

| 066 said | measured |
|---|---|
| "The note cannot contain a link" | `:::note` with a link and `` `code` `` renders `<aside class="note"><p class="note-label">field note</p><p>See <a href="…">SPEC.md</a> and <code>bcc fmt</code>…</p></aside>` |
| the transformer "throws the fence's `lang` away" | `lang` survives **by default** — `<pre><code class="language-console">` |
| an unknown directive "renders as an empty `<div>`" | it renders `<div><p>body</p></div>` — the **body survives**, unstyled; what is silently lost is the **attributes**, so a typo'd `:::filecard` loses the filename, not the code |

Only the fourth — the class names duplicated between two homes — survives, and decision 8 closes it. The hast form is also *less* code than the prototype's 129 lines: no `escapeHtml`, no `stringify` walker, escaping stays the pipeline's job.

### The decisions

1. **Hast, never HTML strings.** Where one directive yields two elements (note, filecard, card), the label is a node unshifted into `node.children` rather than a string prepended to a template. This is what makes decisions 2, 4 and 6 possible at all.

2. **Eight words.** Raw HTML is gone ([markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) decision 3) and the shell can no longer hand-place anything mid-section ([source-set](wayfinder/tickets/068-docs-source-set.md) decision 5), so item 1's three-way choice was already a one-way street: every construct below is a directive or it does not exist.

   | word | uses | renders |
   |---|---|---|
   | `:::note` | 6 | `aside.note` |
   | `:::term` | 5 | `pre.term` |
   | `:::filecard{name}` | 5 | `figure.filecard` |
   | `:::grid{…}` | 2 | the two two-column rows |
   | `:::card{label,tone}` | 3 | both `#exports` cards **and** the `#fence` image card |
   | `:::scroller` | 1 | `div.overflow-x-auto` |
   | `::figure{alt}` | 1 | leaf; the hashed `orderSvg` URL is injected by the transformer |
   | `:kbd[…]` | 4 | inline `kbd` |

   **The two one-off grids unify rather than getting words named after their pages.** Nesting works (`::::grid` → `:::card` → `::figure`, measured), and the unification is available only because of [stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md) decision 1: the `#fence` image caption and the two `#exports` labels all carry dead `text-[10px]`/`text-[11px]` and already render identically. Deleting the dead classes is what makes one `card` honest.

3. **`:::lede` is not a word, and the lede is positional.** All eight bodies open with a paragraph; the transformer tags the first one. The prototype's `:::lede` was three lines of ceremony per file to say "this one is first", and it produced the one spurious `div.contents` wrapper in 066's otherwise-clean DOM diff. **If a body ever opens with something other than a paragraph, the transformer throws** — the lede is the page's one piece of positional typography, which is exactly why losing it should be loud rather than silent.

4. **The two `<dl>`s are transformed from a list, not parsed.** `remark-gfm` has no definition lists — measured: `` `.bcc.json` — Canvas file `` / `: The canvas itself.` renders as one paragraph with a literal `: ` in it. Inside `:::card`, a `<ul>` becomes `<dl>`, each `<li>`'s first paragraph becomes `<dt>` and the rest `<dd>`. ~12 lines. **Rejected: `remark-definition-list@2.0.0`** — 6 KB and less code, but **single-maintainer** (`wataru-chocola`), which is the exact provenance objection that ruled out `mdsvex` at charting and that decision 9 holds `remark-directive` to. Also rejected: dropping `<dl>` for a plain list, which loses the bold term and `ink-soft` description `.docs dt` / `.docs dd` give.

5. **`:kbd[…]` is the eighth word, and the landmine it is accused of arming was already armed.** Raw HTML is gone, shell placement is gone, and `` `⌘Z` `` demotes a key-cap to inline code — so the text form is the only route left for the four `<kbd>`s (the ticket says three; there are four, all in `#editor`). The reason this costs nothing extra is the sharpest thing the session measured:

   **`remark-directive` deletes the word after a colon in ordinary prose.** A colon followed immediately by an ASCII letter or digit parses as a text directive and the word is consumed:

   | written | rendered |
   |---|---|
   | `The time is 9:30 today.` | `The time is 9<div></div> today.` |
   | `Run npm:test now.` | `Run npm<div></div> now.` |
   | `See SPEC.md §3:2 for the rule.` | `See SPEC.md §3<div></div> for the rule.` |

   Twelve real sentences from the eight sections were parsed and **none trigger** — `Sheet · JSON · Markdown: three views.` is safe, because a space after the colon disarms it. So this is a landmine for a future copy editor, not a live break. Crucially it arrives with the **plugin**, not with the vocabulary's use of the text form, so declining `:kbd[…]` would have kept the risk and lost the element. It is a second instance of the silent-content-corruption class [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) decision 5 added its no-raw-HTML assertion for — and decision 7 catches it for free.

6. **The 15 hand-placed spans are reproduced by a rule in the transformer, not a highlighter.** Inside `:::term`, `$ ` at line start and `#…` to end of line; inside a `markdown` fence, the fence lines. ~25–30 lines. The constraint underneath: **nothing an author writes can colour inside a `:::term`** — a fence body is an opaque text node, directives do not parse in there — so the spans can only come from a highlighter or from the transformer, and there is no third option.

   Both candidates the research named (§4.5) were installed and run against the five real term blocks:

   - **`rehype-starry-night@2.2.0` cannot do this job.** It registers no `console` or `shell-session` grammar — **zero spans on all five blocks**. Only `bash` works, and `bash` does not know what a `$` prompt is; it colours `ls` and `cd` as keywords instead. `@wooorm/starry-night` is 14.6 MB.
   - **`rehype-highlight@7.0.2` at `lang=console` is exact on the term blocks** — on the five-line `bcc` block it emits 5 `hljs-meta prompt_` and 4 `hljs-comment` against today's 5 `$` and 4 `#`, 13 for 13 across all five blocks. But it emits 16 spans to get those 9, and the other 7 are colouring the page has never had, sitting in the markup unstyled for the next person to discover.

   **The decisive fact is that neither reproduces the filecard.** `orders.md` greys its ```` ```bcc ```` and closing ```` ``` ```` so the *path* is what stands out — the card's whole teaching device. `rehype-highlight` gives one `hljs-code` span wrapping everything; starry-night gives three that do not align. So the bespoke rule is needed either way, which makes the highlighter option "a 5.5 MB dependency **plus** the bespoke rule". Rejected on that, not on weight. Dropping the colour outright was also rejected: a visible change on four term blocks and the fence card, inside a map whose premise is that the page looks the same.

7. **The guard throws at build on an unknown directive *name or attribute*, and names the vocabulary in the message.** [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) decision 6 already measured that a throwing pipeline fails `vite build` with exit 1, so the mechanism costs nothing new. What it buys:

   - the typo'd `:::flecard` — which otherwise renders its body unstyled and drops the filename;
   - every accidental text directive from decision 5, because `9:30` and `npm:test` parse as directives named `30` and `test`, both unknown;
   - the typo'd attribute, `:::filecard{nmae="orders.md"}`, which otherwise gives an empty `<figcaption>` silently. The guard already walks every directive against a table of known names; giving that table an allowed/required column closes this for the same money.

   **Rejected: a per-section element census test** — more code, fires at `npm test` rather than `npm run build`, and catches nothing in prose that has no census row.

   **This is the fifth guard and it does not consolidate**, consistent with [markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) decision 6 and [stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md) decision 5. Item 3's "three guards is possibly one guard" is answered: it was never one guard, and the count stops at five.

8. **`tilt` is dropped; the transformer alternates.** Measured across the six call sites in page order — `#editor`, `#cli`, `#fence`, `#remark`, `#vscode`, `#mcp` — the tilts run `rotate-[1.2deg]`, `-rotate-1`, `rotate-[1.2deg]`, `-rotate-1`, `rotate-[1.2deg]`, `-rotate-1`. **A perfect alternation**, so alternating by the note's index reproduces today byte-for-byte with no attribute at all. This also retires the prototype's `tilt="-1"` → `-rotate-[1deg]` number-to-Tailwind-string conversion, which did not even produce today's two magnitudes. The cost is that inserting a note flips every subsequent tilt; the gain is that a copy editor never makes a design decision in a prose file. The surviving attributes are `filecard{name}`, `card{label,tone}`, `grid`'s column variant and `figure{alt}` — all required, all validated by decision 7.

9. **`remark-directive@4.0.0` is confirmed, and three of the six packages are undeclared.** remarkjs-collective, three maintainers including wooorm, 20 KB unpacked — and unified-11 compatibility confirmed **by measurement rather than by reading**, since every probe ran it inside the exact six-package pipeline against `unified@11.0.5`. The fact a builder needs: `remark-directive`, `remark-gfm@4.0.1` and `rehype-slug@6.0.0` are present in `node_modules` only as **residue from the 066 prototype branch's install**. `package.json` — the single root one; there is no `web/package.json` — declares only `unified`, `remark-parse`, `remark-rehype` and `rehype-stringify`. All three need adding.

10. **The vocabulary's only reference is the guard's error message.** `unknown directive "flecard" at docs/site/fence.md:12 — known: note, term, filecard, grid, card, scroller, figure, kbd`. Generated from the same table decision 7 validates against, so it cannot go stale, and it arrives at the moment of need rather than in a file the author is not standing in. **Rejected:** a comment atop the transformer (accurate, but `$lib/server/docs/` is not where a copy editor is); a `docs/site/README.md` (discoverable, but it puts a ninth file in a directory [source-set](wayfinder/tickets/068-docs-source-set.md) worked to make mean exactly "the eight bodies"); `SPEC.md` (wrong register — organised by decision domain, not authoring instruction, and [spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md) item 2 is already deciding what of this belongs there). This finishes the arc decision 7 starts: "the DSL has no compiler" becomes false in both directions — it rejects the bad word *and* names the good ones.

### Corrections to the ticket's own numbers

Taken from `census.mjs` against the real file, since the resolution's word counts depend on them:

- **`<kbd>` is 4, not 3** — three lines in `#editor`, four elements.
- **`span.text-ink-faint` is 15, not 13** — 13 in term blocks, plus 2 in the `orders.md` filecard, which is why the highlighter question had a second half.
- **`{REPO}` is 3 in the body, not 4** — the fourth is the masthead's, which [source-set](wayfinder/tickets/068-docs-source-set.md) decision 9 kept in the shell. 068 decision 10's hardcode-plus-consistency-test rule therefore covers three body links and one shell link.
- The `#exports` and `#fence` grids use **different** column templates (`sm:grid-cols-2` vs `md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`), which is why `:::grid` needs a variant attribute rather than being a bare wrapper.

### Vocabulary

**Word** for a member of the directive vocabulary, matching how the ticket and 066 already speak. No new term reaches `CONTEXT.md`: the vocabulary is website furniture, the same ruling the map has now made three times (the section marker, the stylesheet, this) — `CONTEXT.md` is the canvas domain's glossary, and nothing here names anything in the canvas domain. [spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md) item 3 can confirm that and stop looking.

### What this hands [spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md)

- **The eight words and their attributes** are the authoring contract, and decision 10 means the amendment does **not** need to restate them — it needs to state that the guard is where they live.
- **Two facts worth stating in `SPEC.md` §2** beyond the mechanism: no `.md` file can carry a Vite-resolved asset (068 decision 11, now enforced by `::figure` owning the URL), and a colon followed immediately by a letter or digit is a parse hazard in the prose (decision 5) — the second being the kind of thing a builder cannot infer and a copy editor will eventually hit.
- **The guard count is final at five**, with the fifth being decision 7's. Item 4's hand-off must name where each fires: Vite module resolution, `npm run check`, `npm test`, and `npm run build` twice over.
- **Item 5's out-of-scope sweep gets nothing from this ticket.** Everything the vocabulary touches is inside `/docs`; no construct here reached past the destination.
