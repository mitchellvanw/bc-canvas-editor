---
name: docs-source-set
title: "Decision: the Markdown source set, and how the eight anchor ids stay a contract"
labels: [wayfinder:grilling]
status: open
assignee:
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
