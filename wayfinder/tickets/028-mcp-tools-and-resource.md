---
name: mcp-tools-and-resource
title: "Task: the four tools, the canvas resource, and the tests that pin them"
labels: [wayfinder:task]
status: open
assignee:
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
