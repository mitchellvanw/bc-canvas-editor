---
name: docs-directive-vocabulary
title: "Decision: the directive vocabulary — which words, and what catches a typo"
labels: [wayfinder:grilling]
status: open
assignee:
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

Independent of where the files live; feeds the hand-off. Use `/grilling` and `/domain-modeling`.
