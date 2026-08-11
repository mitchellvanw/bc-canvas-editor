---
name: mcp-canonical-labels
title: "Task: the MCP surface follows v2 — section labels, the digest, and 'the fifteen'"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [canvas-file-v2]
---

## Question

Bring the server into line with whatever [canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md) settles. The seam [workshop-shape](wayfinder/tickets/031-workshop-shape.md) drew makes this unavoidable rather than cosmetic: the server owns content and validation, the plugin's skills and agent own only procedure and never restate what `bcc_explain` returns. Every canonical fact therefore lives here exactly once, and if it is wrong here it is wrong everywhere a model reads it.

**The section table.** `mcp/src/sections.ts:35` is the single table the whole server walks, and its labels are the sheet's headings. Two things move: `Description` becomes `Purpose`, and the `Strategic classification` label at `:51` stops being an orphan — it currently names a section the sheet prints no heading for, which is the sheet and the digest disagreeing about whether that section exists. Once [sheet-canonical-layout](wayfinder/tickets/037-sheet-canonical-layout.md) gives it a panel the label is simply true, and the digest's title-block line at `mcp/src/digest.ts:22` — `Domain: … · Business model: … · Evolution: …` — moves down into the section body with the rest.

**The vocabulary, and what the server calls it.** `mcp/src/explain.ts:45` teaches each section by drawing its lists straight from `src/lib/editor/vocab.ts`, so the domain-role decision arrives here for free — except for `:73`, which calls them "The fifteen". That phrasing claims a canonical authority the community worksheet never established; `resources/model-traits-worksheet.md` says "or think of your own traits" and fixes no count. Whatever the list ends up being, the server should stop numbering it as though upstream had. If `service context` survives as a local addition, `explain` is the one place a reader can be told that — and if `brain context` keeps the worksheet's "(likely anti-pattern)" caveat, the description has to carry it rather than reading as praise.

**Collaborator kind and the two-sided relationship, if v2 adopts them.** Both are new content in the digest and in `bcc_explain`'s collaborator guidance, and both are new argument shapes on the write path. The relationship pairing is the one worth wording carefully: a model filling a canvas needs to be told the two sides are a *pairing across a boundary* and not a duplicate field, or it will write the same value twice out of symmetry — which is exactly the failure the sheet's symmetric example was chosen to check for.

**The house rule holds throughout.** Results speak only in prose; no tool on this server declares an `outputSchema`, and nothing added here starts. Validation failures ride in `isError` with actionable feedback, never as JSON-RPC errors. `writing-copy` applies to every string — the model is a reader, and these sentences are the product.

`mcp/README.md` needs whatever changes, and the committed bundle has to be rebuilt: `server.test.ts` drives `dist/server.js` and byte-compares it against a fresh build, so a stale bundle fails the suite rather than shipping quietly. Suite green in `mcp/` and at the root, `tsc` clean in both.
