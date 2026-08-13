---
name: fence-shape
title: "Grilling: what goes in a bcc fence, and what comes out of it"
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: []
---

## Question

The fence is the whole user-facing idea — ` ```bcc ` in a markdown file — and both adapter tickets ([remark-plugin](wayfinder/tickets/057-remark-plugin.md), [vscode-extension](wayfinder/tickets/058-vscode-extension.md)) need its contract before they can be written.

### 1. The payload

Measured on `order-fulfillment` during charting:

| | | |
|---|---|---|
| The Canvas file JSON | 168 lines / 3,851 bytes | Zero new machinery. SPEC §3.2 requires all eleven keys present, so even an empty canvas costs ~15 lines of boilerplate, and `serialize.ts` escapes every `<` as `<` — correct for the artifact's script embed, unpleasant to read in a fence. |
| A terse DSL | 40 lines / 1,708 bytes | **Ruled out of scope on the map.** Recorded here so the ticket does not re-open it. |
| A pointer | 1 line / 49 bytes | `docs/contexts/order-fulfillment.bcc.json`. One parser, one format, one source of truth. |

The pointer is the map's expectation and the argument for it is structural rather than economic: mermaid inlines its source because a diagram has no other home, and a canvas already has one — [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) decision 2 fixed canvases as committed files beside the code they describe. Inlining would duplicate the canvas into markdown and create the sync problem this project has avoided everywhere else; a pointer makes the markdown file **a fourth View of one canvas**, which is a concept the codebase already runs on (`CONTEXT.md`).

Settle it, and settle its edges: does the fence accept *both* a pointer and inline JSON (a machine-written fence is a real case — the MCP server or an agent emitting one into a doc)? If both, what disambiguates them, and does accepting inline JSON quietly reintroduce the sync problem the pointer was chosen to avoid?

### 2. Path resolution

`ctx.sourcePath` in Obsidian, the VFile path in remark, the document URI in VS Code — every adapter can resolve a path relative to the markdown file. Decide the rule once: relative to the markdown file, or to a repo root? What about `../`, absolute paths, and a path escaping the repo — the MCP server answers exactly this with `root.ts`'s containment seam, and the fence should not answer it differently.

### 3. What renders

The `.bcc.html` artifact carries all three Views. A fence almost certainly wants the Sheet alone — a JSON dump in a README is nobody's diagram. Confirm, and decide whether the fence can ask for something else (` ```bcc view=markdown `), or whether options are a thing this fence simply does not have.

### 4. Failure

The pointer names a file that does not exist, or names one that is not a Canvas file, or names one written by a newer format version. `parseCanvasFile` already produces a path-carrying refusal for the last two (SPEC §3.3), and there is a live precedent for how much of it to show: SPEC's rule is that `detail` reaches a human *where the offending bytes are on screen* — the JSON View shows it, the import dialog withholds it. A fence in a build is neither. What does a reader of the rendered markdown see, and what does the build do — warn and render nothing, warn and render a placeholder, or fail the build? These differ per surface: a broken fence in VS Code's live preview and a broken fence in a CI docs build are not the same event.

### 5. The fence name

`bcc` is the assumption. It is unclaimed, matches the file extension family, and is short. Confirm or change it now — it is the one decision here that is expensive to revisit, because it lands in every markdown file anyone writes.

Done when a fence's content, its resolution rule, its output and its failure behaviour are pinned tightly enough that two adapters can be built from this ticket without agreeing anything further between themselves.
