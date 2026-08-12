---
name: shared-digest-seam
title: "Task: the digest crosses the seam — one Markdown renderer, two audiences"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: []
---

## Question

Move `mcp/src/digest.ts` to `src/lib/model/digest.ts` and have the MCP server import it the way it already imports everything else it borrows. Nothing about the seam's direction changes — `mcp/tsconfig.json` keeps its `$lib/*` → `../src/lib/*` alias and MCP keeps reaching into the app — but the renderer stops living on the far side of it, because the app is about to render Markdown too and there will be exactly one thing that does.

The module is already written against `CanvasFile` and nothing else: its imports are `$lib/model/canvas` and `./sections`. `sections.ts` is the complication — it holds the eleven-section table that four model-facing surfaces walk (`bcc_list_canvases`, `bcc_write_canvas`, `bcc_explain`, the digest), and its labels and questions are already carried verbatim from the sheet and `SPEC.md` §10. Decide whether it travels with the digest or stays and is imported back across the alias; the test is which side would be lying about ownership afterwards.

**Byte-identity is the whole point and must be mechanical, not asserted.** `digest.test.ts` pins the current output against the authored v2 example fixtures. Whatever moves, those pins survive unchanged and the MCP tool return is the same bytes it was before this ticket. If a pin has to change, this ticket is wrong and stops.

**The bundle.** `mcp/` ships as a committed plugin bundle with a staleness test driving it ([bcc-plugin](wayfinder/tickets/033-bcc-plugin.md)); esbuild resolves the alias at build time from that same tsconfig. Rebuild, and confirm the staleness test does what it was built to do rather than trusting that it did.

**The vocabulary lands here.** `CONTEXT.md` gains **View** — one of three representations of the same Canvas: the Sheet, the Canvas file's JSON, and Markdown; Sheet and JSON editable in the editor, all three read-only in an Artifact — and the **Artifact** entry gains a line saying it carries all three. This is the ticket that creates the two-names-one-renderer situation, so it is the ticket that writes down which name belongs to which audience: `digest` is MCP-internal jargon and never appears in a user-facing string.

Nothing user-visible ships here. This is the floor [editor-views](wayfinder/tickets/045-editor-views.md), [markdown-export](wayfinder/tickets/046-markdown-export.md) and [artifact-views](wayfinder/tickets/047-artifact-views.md) all stand on, which is why it is unblocked and first.
