---
name: parse-refusal-detail
title: "Task: give parse.ts a path-carrying refusal, without changing what the app says"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [mcp-server-shape]
---

## Question

`src/lib/model/parse.ts` collapses every shape failure into `{ ok: false, reason: 'not-canvas' }` (`parse.ts:22`): a `Refusal` is thrown at the first bad field (`parse.ts:37`, `parse.ts:44`) and caught blind (`parse.ts:144`). Correct for the app — SPEC §10 gives the user one sentence — and useless as an MCP tool error, where the message has to teach the model how to fix the file. Per [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) (17), one source of truth for validation with two levels of disclosure.

- `Refusal` carries a field path and an expectation; the detail reads like `inboundCommunication[1].messages[0].type: expected one of "command", "query", "event", got "notification"`.
- `ParseResult`'s `not-canvas` branch gains an optional detail. The `newer-version` branch is untouched — it already carries what it needs.
- **The app's behaviour must be provably unchanged.** The UI call site ignores the new field; SPEC §10's single sentence is what the user still sees. A test should pin that, not just the new detail.
- `parse.test.ts` grows cases pinning the detail strings for a representative spread — wrong root type, missing section, bad message type, malformed lane — because these strings are the model's only instruction and will be read far more often than any UI copy.
- Path syntax is model-facing copy: pick one convention and keep it. Prefer what a developer would type to reach the field.
- `SPEC.md` amended where §3.3 describes the parse/refusal contract, keeping the spec the single hand-off truth. Nothing else in SPEC moves — the MCP server is documented in `mcp/README.md` per (23).
- Nothing here imports from `mcp/`; this ticket lands entirely in the app's model layer and can ship on its own.

Resolution records the shape of the detail, the SPEC amendment, and the test that pins the app's copy as unchanged.
