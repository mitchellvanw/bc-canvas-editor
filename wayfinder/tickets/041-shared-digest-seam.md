---
name: shared-digest-seam
title: "Task: the digest crosses the seam — one Markdown renderer, two audiences"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

Move `mcp/src/digest.ts` to `src/lib/model/digest.ts` and have the MCP server import it the way it already imports everything else it borrows. Nothing about the seam's direction changes — `mcp/tsconfig.json` keeps its `$lib/*` → `../src/lib/*` alias and MCP keeps reaching into the app — but the renderer stops living on the far side of it, because the app is about to render Markdown too and there will be exactly one thing that does.

The module is already written against `CanvasFile` and nothing else: its imports are `$lib/model/canvas` and `./sections`. `sections.ts` is the complication — it holds the eleven-section table that four model-facing surfaces walk (`bcc_list_canvases`, `bcc_write_canvas`, `bcc_explain`, the digest), and its labels and questions are already carried verbatim from the sheet and `SPEC.md` §10. Decide whether it travels with the digest or stays and is imported back across the alias; the test is which side would be lying about ownership afterwards.

**Byte-identity is the whole point and must be mechanical, not asserted.** `digest.test.ts` pins the current output against the authored v2 example fixtures. Whatever moves, those pins survive unchanged and the MCP tool return is the same bytes it was before this ticket. If a pin has to change, this ticket is wrong and stops.

**The bundle.** `mcp/` ships as a committed plugin bundle with a staleness test driving it ([bcc-plugin](wayfinder/tickets/033-bcc-plugin.md)); esbuild resolves the alias at build time from that same tsconfig. Rebuild, and confirm the staleness test does what it was built to do rather than trusting that it did.

**The vocabulary lands here.** `CONTEXT.md` gains **View** — one of three representations of the same Canvas: the Sheet, the Canvas file's JSON, and Markdown; Sheet and JSON editable in the editor, all three read-only in an Artifact — and the **Artifact** entry gains a line saying it carries all three. This is the ticket that creates the two-names-one-renderer situation, so it is the ticket that writes down which name belongs to which audience: `digest` is MCP-internal jargon and never appears in a user-facing string.

Nothing user-visible ships here. This is the floor [editor-views](wayfinder/tickets/045-editor-views.md), [markdown-export](wayfinder/tickets/046-markdown-export.md) and [artifact-views](wayfinder/tickets/047-artifact-views.md) all stand on, which is why it is unblocked and first.

## Resolution

**Landed 2026-08-12.** `src/lib/model/digest.ts` is the app's, and the MCP server imports `canvasDigest` from `$lib/model/digest` beside the parser and the serializer it already borrowed. The seam's direction is untouched: `mcp/tsconfig.json` keeps its one `$lib/*` → `../src/lib/*` mapping, and the app imports nothing from `mcp/`.

**`sections.ts` travelled with it**, because leaving it would have made the app's own Markdown source its headings from the MCP server — and the table's content is app content: the labels are `CanvasSheet.svelte`'s headings and the questions are SPEC §10 strings, both authored here. The alternative the ticket named — importing it back across the alias — is not available in that direction without inverting the seam, which the map rules out. `question()` and `sectionByKey()` come along with no app caller today; splitting one table's API across the seam to avoid that would be worse, and the module now says so where it lives. The four surfaces that walk the table (`catalog.ts`, `explain.ts`, `tools.ts`, the digest) are unchanged apart from their import lines.

**Byte-identity, mechanically.** Both trees were bundled and run against all five committed examples and diffed: 6183 bytes, sha256 `01e0040b…c2eae2e6`, identical. The driver is committed at `.scratch/views-seam/render-digest.mjs` with the invocation in its header, so the claim is re-runnable rather than remembered. `digest.test.ts` moved to `src/lib/model/digest.test.ts` with every assertion carried over untouched — only the import specifiers and the fixture's relative path changed — and it now runs in the app suite, which is where the renderer is.

**The bundle.** `dist/server.js` went stale and the staleness test said so before the rebuild, unprompted and by name — it does what [bcc-plugin](wayfinder/tickets/033-bcc-plugin.md) built it for. Rebuilt: 170 lines changed, the two modules relocating under `../src/lib/model/…` comments, +26 bytes of longer paths and nothing else.

**The vocabulary.** `CONTEXT.md` gains **View** — three renderings of one document, Sheet and JSON editable in the editor, all three read-only in an Artifact, Markdown additionally a one-way `.bcc.md` export — and states which name belongs to which audience: `digest` is MCP-internal jargon for the same output and never a user-facing string, so a tab labelled "Digest" is ruled out at the glossary. The **Artifact** entry gains its line about carrying all three pre-rendered; that line describes the destination and is delivered by [artifact-views](wayfinder/tickets/047-artifact-views.md), which is the only thing on this map's route that could make it false.

Suites: 345 app (up 6 — the moved pins) + 85 MCP green; `svelte-check` 400 files clean, `tsc --noEmit` in `mcp/` clean. No `SPEC.md` amendment: nothing user-visible ships here, and §1's scope sentence belongs with the tickets that draw the tabs.
