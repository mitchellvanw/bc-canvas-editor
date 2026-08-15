---
name: docs-source-set
title: "Decision: the Markdown source set, and how the eight anchor ids stay a contract"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [docs-furniture-boundary]
---

## Question

Where the Markdown lives and what one file contains — decided once [furniture-boundary](wayfinder/tickets/066-docs-furniture-boundary.md) has settled whether a section is one body, several named fragments, or one file with a directive vocabulary.

1. **Where do the files live?** The research proposed `docs/site/*.md` at the repo root. Note `docs/` currently holds only `research/`, and that `examples/` already sets the precedent for a repo-root directory the web build reaches into via `server.fs.allow` (`web/vite.config.ts:48–51`). `web/src/docs/` is the alternative and keeps the site's sources inside the site. Decide, with the dev-server path in mind — the research measured only the *build*, never `vite dev` against a repo-root glob (its §10).
2. **Does the basename carry the anchor id?** `editor.md` → `#editor` makes the C2 contract *data*. The competing shape is frontmatter. Either way the contract must stay typechecked or test-guarded, because a silently renamed file is a silently broken homepage link.
3. **Where does the section's `<h2>` title live** — in the Markdown as a heading, or in the `sections` array where it sits today alongside the id, chip and label (`web/src/routes/docs/+page.svelte:21–30`)? Splitting the table across two homes is the failure mode to avoid; so is a Markdown file whose own first heading is invisible because the shell already drew one.
4. **What keeps the eight ids honest?** Charting settled that the shell keeps the `<section id=…>` wrappers, so no slugger can touch them — but nothing yet guards a *file* disappearing or being renamed. The research proposed one test asserting all eight ids are present in the built `build/docs.html`. Decide whether that is the guard, and whether a second one is needed for the reverse direction (a Markdown file nobody renders).
5. **Does anything about the prose change as it moves?** It should not — this is a move, not a rewrite, and `SPEC.md:35` keeps the prose documentary and outside the spec. Confirm that explicitly so nobody treats the migration as licence to re-edit copy. Any string that genuinely must change gets `writing-copy`.

Use `/grilling` and `/domain-modeling`.

## Resolution

**Eight files at `docs/site/*.md`, basename as id, and the shell becomes a loop.** Ratified by Mitchell on 2026-08-15 across four grilling rounds. The ticket asked five questions; four more surfaced that it had not named, and all nine are answered below.

### The source set

1. **Eight files, one per section** — `editor.md`, `canvas-file.md`, `exports.md`, `cli.md`, `fence.md`, `remark.md`, `vscode.md`, `mcp.md`. The section is already the unit that carries the id, the chip, the nav entry and the `<section>` wrapper, so it is the unit of authorship too; the URL fragment answers "which file do I edit?" directly. A dropped section becomes a missing *file* — loud and countable — where inside a single page-sized file it would be a silent deletion in a diff. The one-file argument (document order supplies the order for free) does not pay: the shell holds the order in `sections` either way under shape C.

2. **`docs/site/`, flat, at the repo root.** Chosen over `web/src/lib/docs/`, which was the recommendation on the grounds that this repo's idiom is thin routes over `web/src/lib/<domain>/` (nine such folders) and that site copy has exactly one consumer. Overruled. `docs/` therefore carries two meanings — `research/` is internal argument written to be read once, `site/` is shipped copy read by strangers — and the subdirectory name is the only thing keeping them apart. `site/` was preferred over `prose/` as the namespace with room: if the homepage's prose ever follows, it becomes `docs/site/docs/` and `docs/site/home/`, and renaming eight files then is cheap and should not be pre-paid now. Consequence: `web/vite.config.ts`'s `server.fs.allow` gains `'../docs'` beside the existing `'../examples'`.

3. **The basename is the id, and there is no frontmatter.** All eight ids are already collision-free valid basenames and none clashes with `research`. Frontmatter would buy nothing and cost a parser — a dependency, or hand-rolled slicing — to carry one field the filename already carries. The roles stay clean: **`sections` is the register** (order, chip, label, title, body), **the files supply bodies and never membership**.

4. **The `<h2>` title stays in `sections`.** It is furniture, not prose: `chiphead` draws it in a layout paired with the tilted chip that Markdown cannot express. Moving it means either the shell draws nothing, or the Markdown's own first heading renders invisibly beneath a heading the shell already drew. Splitting the four-column table across two homes is the failure mode the ticket named, and a title is one string in a typechecked row beside the id it must stay consistent with — not running prose.

### The contract, made real

5. **The shell becomes `{#each sections as s (s.id)}`.** Not asked by the ticket, and the largest structural finding of the session. Today the id is written **twice** — literally as `<section id="editor">` and positionally as `{@render chiphead(sections[0])}` — so "the `sections` array is the contract" was aspirational, not true: a reordered array silently mismatches every chip to the wrong section. Under shape C every section's interior is uniform (`chiphead` + one body), so the eight collapse into one loop, exactly as the nav already does at `web/src/routes/docs/+page.svelte:123`. This single-sources the id and is the move's biggest structural win. The attribution section and the page masthead stay hand-written outside the loop.

6. **`sections` moves to `web/src/lib/docs/sections.ts`**, with `sections.test.ts` beside it — the `$lib/chrome/examples.ts` idiom, and it lands in the vitest include (`web/src/**/*.test.ts`) for free. It has to become an importable module regardless, since both the loop and the body-renderer need it. This does not reopen decision 2: the *prose* is repo-root, the *register* is code.

7. **Named imports, not `import.meta.glob`** — eight explicit `import editor from '../../../../docs/site/editor.md?raw'` lines with the body carried on the register row, following `web/src/lib/chrome/examples.ts:11–14` exactly. This is a **stronger guard than anything the ticket or the research proposed**: a missing or renamed file becomes a Vite module-resolution error that fails `vite build` and `vite dev` alike — earlier and louder than a runtime throw, with zero guard code and no `bodies[s.id]` lookup that can silently go `undefined` into `{@html}`. It costs nothing extra to maintain, since adding a section already means editing the array for its chip, label and title.

8. **What still needs a test, and what does not.**
   - **The orphan direction** — a `.md` nobody imports, edited forever with no effect — is the one thing decision 7 cannot see. `sections.test.ts` reads `docs/site/` via `process.cwd()` (the `examples.test.ts:26` precedent) and asserts the `.md` basename set **equals** the eight ids, which enforces basename-as-id in both directions at once.
   - **The inbound homepage links** are invisible to both: `sections` and the files can be in perfect bijection while the homepage points at an id nobody has (six of the eight are linked today; `canvas-file` and `exports` are not). Guarded **by type, not by test** — `sections` becomes `as const` and exports `type DocsId = (typeof sections)[number]['id']`, and the homepage's tools grid (`web/src/routes/+page.svelte:61–66`) types its href as `` `/docs#${DocsId}` ``. This moves the failure from test time to `npm run check`, catching it while the rename is happening rather than after, and avoids regexing a `.svelte` file as text — the thing this repo consistently avoids.
   - **Dropped: the research's "all eight ids appear in built `build/docs.html`" test.** Under decision 5 the ids come from `sections` by construction, so it has nothing left to catch, and it needs a build artifact to run.

### The three the ticket did not name

9. **The prose outside the eight sections stays in the shell.** The page masthead (`+page.svelte:100–115`) and the attribution card (`:593–605`) are running prose by the destination's words, but neither has an id, is in `sections`, or is in the nav — and a ninth file breaks the equality the orphan test asserts. The masthead is an `<h1>` with two hand-placed `underline-command` / `underline-event` spans on chosen words — the homepage's marker idiom, which no directive vocabulary should have to learn — and the attribution is a rotated labelled card, structurally a field note. Six sentences against forty-odd paragraphs does not buy a second source category. Revisit only if the homepage's prose ever follows.

10. **The four `{REPO}` links are hardcoded in full, and a test keeps them honest.** `const REPO` is interpolated into 4 hrefs (1 masthead, 2 in `canvas-file`, 1 in `mcp`); Markdown has no interpolation. The const exists because Svelte made interpolation free, not because the URL is volatile — it changes exactly once, on a repo rename, which simultaneously breaks `package.json`'s `repository`, the README and every other reference. Adding a placeholder word to save three strings is exactly the bespoke-DSL cost 066 priced, and links that read as ordinary Markdown links are the point of moving. A five-line test asserts every `https://github.com/…` under `docs/site/` starts with `package.json`'s `repository` URL — hardcoded but provably drift-free, without teaching the vocabulary a new word.

11. **The one image is furniture, and the `.md` files can never carry a Vite-resolved asset.** `#fence` renders `<img src={orderSvg}>` mid-section inside a two-up grid beside a filecard (`:357`), where `orderSvg` is a `?url` import Vite hashes at build. Vite never sees `{@html}` output, so a Markdown image would emit a literal unhashed path that 404s. Everything about that `<img>` except its alt string is furniture — `width`, `height`, `loading="lazy"`, `object-cover object-top`, the bordered card and its label — so it becomes a directive whose markup lives in the transformer with the imported URL passed in, and the alt text becomes the directive's label. **The ceiling is real and belongs in the amendment: a copy editor cannot add an image without a code change.** There is exactly one image on the page today, so it costs nothing now.

### What this hands the other tickets

- **[markdown-read-shape](wayfinder/tickets/069-docs-markdown-read-shape.md) inherits a constraint, not an answer.** Decision 7 settles glob-versus-import in favour of named `?raw` imports, so that question is closed before its session starts. Everything else stays open and is still its call: where the unified pipeline actually runs (module init via `processSync`, a `load`, or `+page.server.ts`), whether the register row carries raw source or already-rendered HTML, and whether `csr = false` rides along.
- **[directive-vocabulary](wayfinder/tickets/072-docs-directive-vocabulary.md) gains one required directive kind** — the example-image card from decision 11 — and inherits from decision 10 the standing rule that the vocabulary does not grow a word to save a repeated string.
- **[spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md)** must carry decision 3's role split (register versus bodies), decision 8's three-part guard, and decision 11's asset ceiling.

### Not settled here

Whether the prose changes as it moves was confirmed **byte-for-byte, no `writing-copy` pass** (the ticket's item 5) — `SPEC.md:35` keeps it documentary and outside the spec. Two mechanical deltas from 066 ride along as pipeline facts rather than prose edits: `rehype-slug` adds ids to the `<h3>`s, which today have none, and fences nest `<pre><code>` where today's markup is a bare `<pre>`. The one genuine content delta — the lost coloured `$` prompt span in the term block — is 072's to rule on, not a copy question.
