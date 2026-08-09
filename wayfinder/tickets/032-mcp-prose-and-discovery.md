---
name: mcp-prose-and-discovery
title: "Task: server repairs — every result speaks in prose, discovery skips dot-directories, the canvas topic teaches drafting"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [workshop-shape]
---

## Question

Three repairs from [workshop-shape](wayfinder/tickets/031-workshop-shape.md), all on existing green code. AFK.

**Drop `outputSchema` everywhere, as a standing rule.** `bcc_list_canvases` and `bcc_write_canvas` lose theirs; no tool on this server declares one from now on, and a comment at the registration site says why — the spec entitles a host to treat the text block as a duplicate serialization once structure is declared, and both hosts do, which is how the register got thrown away (checkpoint finding 1). `WRITE_OUTPUT` in `schema.ts` goes; results keep only their prose. The tests that pin `structuredContent` in `tools.test.ts` and `server.test.ts` move their assertions to the text, which is the honest place now that the text is the whole result.

**Discovery skips every dot-directory.** The skip rule becomes: any name starting with `.`, plus `node_modules`, `dist`, `build` (subsuming `.git` and `.svelte-kit`). This repo's listing drops from 13 canvases to the 4 real ones — the nine `.scratch/` fixtures, including the mangled v1-era file, disappear from the tool whose description says to start there. And when a listing finds nothing at all, the empty-root sentence now also says that hidden and generated directories were not searched — the one moment the rule is worth spending words on. `discover.test.ts` pins both.

**`bcc_explain`'s `canvas` topic gains the drafting discipline.** The five judgment sections — strategic classification, domain roles, business decisions, assumptions, verification metrics — are business judgments a codebase cannot answer; a model reading code will produce plausible strings for all five. The topic now says so, and says where the honest draft puts them: as questions under Open questions, not as filled rows. This is method knowledge and it lives server-side on purpose ([workshop-shape](wayfinder/tickets/031-workshop-shape.md)'s seam): content in a skill would be lost to every non-Claude MCP client. No `workshop` topic is added — the procedure belongs to the skill.

`writing-copy` for every changed sentence. Suite green, `tsc` clean, and the built bundle re-verified over raw stdio the way the scaffold ticket pinned it.

## Resolution

All three repairs landed, on `main`.

**No tool declares an `outputSchema`, and the prose is the whole result.** Both declarations went, `structuredContent` went with them, and `WRITE_OUTPUT` is deleted from `schema.ts`. The standing rule sits as a comment on `registerTools` in `tools.ts` — declaring structure entitles a host to drop the text block as a duplicate serialization, both day-one hosts do, so the prose must be the only serialization there is. `tools.test.ts` now asserts the inverse of its old schema test (no tool may declare one) and every pin that read `structuredContent` reads the text instead. One correction to the ticket: `server.test.ts` never pinned `structuredContent` — it speaks raw bytes and asserted nothing structured — so every moved assertion lived in `tools.test.ts`.

**Discovery skips every dot-directory.** The rule in `discover.ts` is `name.startsWith('.')` plus `node_modules`, `dist`, `build`; `.git` and `.svelte-kit` fell out of the named set as subsumed. Driven against this repo's root over the built bundle, the listing came back with exactly the 4 committed examples — the nine `.scratch/` fixtures gone, mangled v1 file included. The empty-listing text now reads: *"Hidden and generated directories were not searched — any name starting with a dot, plus node_modules, dist and build."* `discover.test.ts` pins the rule (including a nested `docs/.cache`); the sentence is pinned in `tools.test.ts`, not `discover.test.ts` as the ticket assumed, because the sentence belongs to the tool, and the pinning test plants a canvas under `.scratch/` first — the one arrangement where an empty listing could mislead. `mcp/README.md`'s "What counts as a canvas" line follows the new rule (it owns the skip list per ticket 029).

**The canvas topic teaches the drafting discipline.** After the eleven-section list, `bcc_explain`'s overview now names the five judgment sections — strategic classification, domain roles, business decisions, assumptions, verification metrics — as business judgments a codebase cannot answer, warns that reading code will still produce plausible entries for all five, and sends what would have been written to Open questions: "a filled row reads as a decision someone made, and a question is the honest form of a guess." Pinned by a new `tools.test.ts` case. No `workshop` topic added.

Verified: 88 tests across 9 files green, `tsc --noEmit` clean, bundle rebuilt and driven over raw stdio both by `server.test.ts` and by hand — `tools/list` carries no `outputSchema` on the wire, and `bcc_list_canvases` against the repo root returns the 4.
