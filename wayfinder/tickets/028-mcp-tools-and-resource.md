---
name: mcp-tools-and-resource
title: "Task: the four tools, the canvas resource, and the tests that pin them"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [parse-refusal-detail, mcp-package-scaffold]
---

## Question

The substance of the server, per [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) (8, 10–15, 17–22). Every tool prefixed `bcc_`; `tools/list` in deterministic order for prompt-cache hits.

**`bcc_list_canvases`** — no input (root comes from config). Returns path, name, description, filled-section count, the names of empty sections, and the `bcc://` URI per canvas. `readOnlyHint`, `idempotentHint`, `openWorldHint: false`.

**`bcc_read_canvas`** — `path` plus `view: 'digest' | 'json'`. **No `outputSchema`** (11). The digest is prose in **words, not glyphs** (12) — one line per section, the same content the sheet shows, at roughly 40% of the JSON's tokens. Reads `.bcc.html` through `extractEmbeddedCanvas()` on the same path. Returns a `resource_link` to the `bcc://` URI so the host can pin it.

**`bcc_write_canvas`** — `path` plus the whole canvas. Validates the complete document through the real `parseCanvasFile`, then writes canonical bytes atomically. Keeps `outputSchema`. The result must name **what came out empty** — that report is the only guard against a model silently dropping a section when re-emitting (8), so it is a feature, not a nicety. Enforces the `.bcc.json` extension and nothing else (21). Custom vocabulary values produce warnings phrased as observation, not reproach (18).

**`bcc_explain`** — one enum `topic` over the canvas and its eleven sections. Returns the section's question, **verbatim from the SPEC §10 placeholder questions**, plus one or two illustrative rows inline (15). Vocabulary text re-served from `src/lib/editor/vocab.ts`, the same source the write schema generates from (13).

**The canvas resource** — `ResourceTemplate('bcc://canvas/{path}', { list, complete: { path } })`, sharing the discovery implementation with `bcc_list_canvases`. Two contents under one URI: the `text/markdown` digest and the exact `application/json` bytes. No subscriptions, no `listChanged`.

**Schema discipline.** Vocabularies as `.describe()` text on `z.string()` fields, generated from `vocab.ts` — never hand-copied. `z.enum` **only** for `message.type`; a hard enum anywhere else would reject a legitimate escape-hatch value before the handler runs and contradict SPEC §4. Descriptions are model-facing copy and should be written as such (`writing-copy`): a field's `.describe()` is the only documentation the model gets for it.

**Errors.** Validation failures are `isError: true` results, never JSON-RPC errors — the spec's whole reason for the second channel is self-correction. Each names the failure, lists the legal values, and shows the operation that fixes it, using the detail [parse-refusal-detail](wayfinder/tickets/026-parse-refusal-detail.md) added. A newer `version` is refused with the file unread and unwritten (19).

**Tests**, per the grilling's testing decision:

- **Byte-identity round-trip** over every `examples/*.bcc.json` — read then write through the server, assert the bytes are identical. The crown jewel, and the same pinning pattern `src/lib/chrome/examples.test.ts` already trusts.
- The version gate refusing without touching the file; root containment against traversal; custom-vocabulary values warning rather than refusing; digest output pinned.
- **A thin in-process harness** using `@modelcontextprotocol/client` driving the real server: assert `tools/list` is well-formed and one `tools/call` round-trips. This catches the failure unit tests can't see — Zod-to-JSON-Schema conversion producing a `tools/list` a host silently rejects, which surfaces as "the server just doesn't work" in Desktop with no diagnostic, and protocol logging is deprecated.

Resolution records the tool surface as built, the digest format, and the test roster.

## Resolution

Built on `main` (`aec0341`). `mcp/` gains ten modules and two test files; `src/lib` is untouched, as decision 5 requires. 70 tests in the package, 312 in the app, both green; `tsc --noEmit` and `svelte-check` clean.

### The surface as built

`tools/list` order is registration order and is pinned in two places — `bcc_list_canvases`, `bcc_read_canvas`, `bcc_write_canvas`, `bcc_explain`. Every tool carries `openWorldHint: false`; the three read tools carry `readOnlyHint` and `idempotentHint`, and the write carries `destructiveHint: true` alongside `idempotentHint: true` (the same document written twice is the same file).

- **`bcc_list_canvases`** — no input. Structured result of `{ canvases, problems, sections }`: per canvas the path, the `bcc://` URI, name, description, filled count and the labels of the empty sections; `sections` is the eleven labels, so a reader never has to guess what `empty` is drawn from. **Kept an `outputSchema`** (the ticket only stripped one from the read) — the result is always structured, so the MUST-level promise costs nothing. A file that looks like a canvas and does not parse lands in `problems` rather than being dropped, carrying the parser's detail.
- **`bcc_read_canvas`** — `{ path, view: 'digest' | 'json' }` defaulting to `digest`, no `outputSchema`. Returns the text plus a `resource_link` to the same `bcc://` URI. `view: 'json'` returns **the exact Canvas-file text the path carries** — the whole file for a `.bcc.json`, the embedded block for a `.bcc.html`.
- **`bcc_write_canvas`** — `{ path, version?, canvas }`, `outputSchema` `{ path, uri, created, empty, warnings }`. Extension enforced and nothing else; the document is serialized and run through the real `parseCanvasFile` before `canvasBytes` goes down atomically.
- **`bcc_explain`** — one enum `topic`: `canvas` plus the eleven section keys, twelve in all, the enum generated from the section table.
- **The resource** — `ResourceTemplate('bcc://canvas/{+path}', { list, complete: { path } })`, two contents under one URI (`text/markdown` digest, `application/json` exact bytes). No subscriptions, no `listChanged`.

`sections.ts` is the one table the digest, the listing, the write's empty report and `bcc_explain`'s topics all walk — labels are the sheet's own headings, questions are the SPEC §10 placeholders verbatim. `schema.ts` generates every vocabulary and every one-liner from `src/lib/editor/vocab.ts`; `z.enum` appears exactly once, on `message.type`.

### The digest format

Markdown mirroring the artifact's heading hierarchy (SPEC §8.6): `#` canvas name, `##` sections, `###` collaborators. Messages read `command Place Order` / `event Payment Confirmed — Triggers fulfillment.` — the type in words, never the glyph. Lane relationships ride in parentheses on the collaborator heading. Classification is one labelled line, unpicked axes omitted. Measured against the reference example: **1,617 characters against 3,319 of JSON**, and better than that in tokens, since JSON's punctuation tokenizes badly.

### Two findings worth carrying forward

**The parser's path-carrying detail reaches the model through the *read* path, not the write.** The input schema restates the shape, so it is as strict as or stricter than `parseCanvasFile` on every field — a bad `type` or a numeric `name` is refused by Zod before the handler runs, with its own dotted path (`canvas.inboundCommunication.0.messages.0.type`) and the legal values. Ticket 026's detail is what teaches on a file already on disk, where nothing stands in front of the bytes; that is where it earns its place, and it is pinned there. `parseCanvasFile` stays as the last word on the write path regardless — belt and braces if the schema ever loosens.

**`tools/list` is 12.7 KB, not the ~1.5 KB decision 13 sized.** That estimate was the vocabulary text alone and holds (~2.6 KB, since the nine relationship patterns appear on both lane fields); the rest is JSON Schema for an eleven-section document, which whole-document write makes unavoidable. `bcc_write_canvas` is 9.7 KB of it. Roughly 3,200 tokens once per session against a prompt cache. Deliberately not trimmed by pointing outbound at inbound's relationship list: the model reads that field's description at the moment it fills the field, and a cross-reference costs attention exactly when the wrong pattern is cheapest to pick.

### Interpolations — for sign-off

1. **`{+path}`, not `{path}`.** Simple expansion percent-encodes every `/`, so `docs/contexts/shipping.bcc.json` becomes an unreadable URI that will not match back. Reserved expansion keeps the path legible and round-trips.
2. **The canvas is nested under `canvas`, not spread beside `path`.** A model can hand `bcc_read_canvas`'s `view: 'json'` output straight back, and nothing collides with `path`.
3. **`version` is optional and accepted on write**, described as "omit it"; a value that is not 1 is refused with the file unwritten. It exists only so the read→write hand-back is literal.
4. **Empty sections are named once at the end of the digest** (`Nothing yet under: …`) rather than printed as eleven empty headings — a mostly-blank canvas is the normal drafting state.
5. **`bcc_explain`'s heading carries the question**, ghost prefix stripped: `# Domain roles — how does this context behave?`. The §10 strings are fragments that follow an affordance label, and they read as fragments alone; the prefix is dropped mechanically, never re-typed.
6. **`bcc_write_canvas` creates missing parent directories.** Refusing would be defensible under decision 21, but Claude Desktop has no filesystem of its own — the model would have no way to put a canvas in `docs/contexts/` and no way to make the directory either.
7. **Filesystem failures come back as `isError: true` refusals**, not JSON-RPC errors: a permission denial or a path that is a directory is something the model can route around.
8. **`bcc_explain`'s illustrative rows are drawn from different domains on purpose** — a warehouse, a clinic, a carrier — so they never assemble into one imitable canvas, which is decision 14's concern at row scale.

### Test roster

`mcp/src/tools.test.ts` drives a real `@modelcontextprotocol/client` over an in-memory transport — the only thing that catches a Zod-to-JSON-Schema conversion a host would silently reject:

- **Byte-identity round trip over every `examples/*.bcc.json`** (`it.each`): read as `json`, hand back through `bcc_write_canvas`, assert the written bytes equal the committed bytes. The crown jewel.
- A canvas read back out of a `.bcc.html` artifact through the same path.
- `tools/list` well-formed and in the fixed order; the vocabularies present in the write schema with their one-liners; `message.type` an enum and `relationship`/the axes not; `outputSchema` on write and list, absent on read.
- Refusals: newer version unread, a bad write version unwritten, traversal refused on both read and write, the extension rule with the corrected path suggested, a field named on a broken file on disk, a missing path pointed at `bcc_list_canvases`.
- Writes: the empty report, a custom trait and a custom relationship noted rather than refused (and present in the bytes), replacement reported as replacement, a directory created on the way.
- `bcc_explain` over all twelve topics; the questions verbatim; the ddd-crew credit.
- The resource: listing matching the tool, both contents under one URI, path completion, and the `resource_link` the read returns.

`mcp/src/digest.test.ts` pins the format against the committed examples — the same files `src/lib/chrome/examples.test.ts` pins on the app side, so both halves of the round trip are held against one document. `mcp/src/server.test.ts` gains the tool order at the raw-JSON-lines level, in both protocol eras.
