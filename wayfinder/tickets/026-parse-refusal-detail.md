---
name: parse-refusal-detail
title: "Task: give parse.ts a path-carrying refusal, without changing what the app says"
labels: [wayfinder:task]
status: closed
assignee: mitchell
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

## Resolution

`src/lib/model/parse.ts` now walks the document carrying a path, and `ParseResult`'s `not-canvas` branch carries an optional `detail`. One validator, two levels of disclosure: the app reads `reason`, a non-human caller reads `detail`.

**1. The detail line: `<path>: <expectation>`.** `Refusal` takes `(path, expectation)` and joins them into its own `message`, which becomes the detail verbatim. A failure about the document as a whole has an empty path and is the bare expectation — no invented `$` or `<root>` glyph for something a developer reaches by typing nothing.

**2. Path convention: what a developer would type.** Dotted keys, bracketed indices, no leading dot at the root: `inboundCommunication[1].messages[0].type`, `strategicClassification.domain`, `openQuestions[1]`. Built by two three-line helpers (`field()`, and the `${path}[${i}]` inside `asRows`/`asStrings`), so every path in the file is constructed the same way.

**3. Expectations read "expected …, got …",** where "got" is the type in words — `a string`, `an array`, `null`, `nothing` for absent — never the offending value, with two deliberate exceptions where the value *is* the problem: the closed message-type enum (`expected one of "command", "query", "event", got "notification"` — the ticket's own example string, now a pinned test) and the root `version` (`expected an integer of 1 or more, got 1.5`). Values are `JSON.stringify`d, so a weird one can't smuggle quotes into the line.

**4. Optional fields teach the omission rule.** `null` on a `description`/`definition`/`relationship`/classification axis reads `expected a string or no key at all, got null`, not the generic string failure — SPEC §3.2 says these are omitted, never nulled, and a model that just wrote `null` needs to be told which of the two to do.

**5. Non-shape refusals got details too**, since they are the ones an agent hits first: `the file is not valid JSON (<engine message>)` — the engine's position info is the most actionable thing there is for a malformed write, so it rides in parentheses and the test pins only the prefix — and `expected a JSON object at the top level, got an array`.

**6. One thing beyond the brief: `parseCanvasImport` names both doors.** A text that is not JSON at all has, by the time extraction returns null, failed *both* forms; reporting only "not valid JSON" misdiagnoses the HTML file it usually is. That one case is replaced with `expected a Canvas file (JSON) or an HTML artifact carrying an embedded Canvas file; this text is neither`. A JSON text with a shape error keeps its field-level detail — the second door is never mentioned when the first one gave a real answer. Gated on a module-private `NOT_JSON` prefix rather than re-sniffing the text.

**7. SPEC §3.3 gains one bullet** ("One validator, two levels of disclosure"), stating the detail, the path convention with the example, and that the editor ignores it. Nothing else in SPEC moved; the server stays documented in `mcp/README.md` per (23). Note the bullet says "a non-interactive caller" rather than naming the MCP server, keeping SPEC scoped to the deployed editor.

**8. The app's copy is pinned by a test, not by argument.** New `src/lib/chrome/import-refusal.test.ts` mounts the real `Chrome`, drives the real `<input type="file">` `change` handler with the most detailed refusal the parser can produce (the `inboundCommunication[1]` enum failure), and asserts the dialog shows exactly the two SPEC §10 sentences — then asserts the dialog's text contains neither the detail nor any fragment of it (`inboundCommunication`, `messages[0]`, `expected one of`, `notification`). Two jsdom notes worth keeping: `<dialog>` has no `showModal`, polyfilled as in `examples.test.ts`; and Svelte 5 delegates `change` at the root, so a dispatched event must have `bubbles: true` or the handler silently never runs.

`parse.test.ts` grew the detail spread — 13 shape cases plus 7 non-shape ones, each pinning its exact string — and its import block now pins the both-doors detail and the corrupt-block detail. Suite green: 310 tests, `svelte-check` 0 errors. Nothing imports from `mcp/`; this ships on its own.
