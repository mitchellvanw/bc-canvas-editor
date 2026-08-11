---
name: mcp-canonical-labels
title: "Task: the MCP surface follows v2 — section labels, the digest, and 'the fifteen'"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [canvas-file-v2]
---

## Question

Bring the server into line with what [canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md) settled — all six adopted, so every conditional below resolves the same way: yes. The seam [workshop-shape](wayfinder/tickets/031-workshop-shape.md) drew makes this unavoidable rather than cosmetic: the server owns content and validation, the plugin's skills and agent own only procedure and never restate what `bcc_explain` returns. Every canonical fact therefore lives here exactly once, and if it is wrong here it is wrong everywhere a model reads it.

**The section table.** `mcp/src/sections.ts:35` is the single table the whole server walks, and its labels are the sheet's headings. Two things move: `Description` becomes `Purpose`, and the `Strategic classification` label at `:51` stops being an orphan — it currently names a section the sheet prints no heading for, which is the sheet and the digest disagreeing about whether that section exists. Once [sheet-canonical-layout](wayfinder/tickets/037-sheet-canonical-layout.md) gives it a panel the label is simply true, and the digest's title-block line at `mcp/src/digest.ts:22` — `Domain: … · Business model: … · Evolution: …` — moves down into the section body with the rest.

**The vocabulary, and what the server calls it.** `mcp/src/explain.ts:45` teaches each section by drawing its lists straight from `src/lib/editor/vocab.ts`, so the domain-role decision arrives here for free — except for `:73`, which calls them "The fifteen". That phrasing claims a canonical authority the community worksheet never established; `resources/model-traits-worksheet.md` says "or think of your own traits" and fixes no count. The settled answer: **name the source instead of a count** — the set is the ddd-crew model-traits worksheet plus one local addition, in the worksheet's own order with `service context` last. No number appears anywhere, because the worksheet fixes none. `explain` is the one place a reader is told `service context` is local, and `brain context` carries the worksheet's "(likely anti-pattern)" in a description that no longer reads as praise. `octopus coordinator` becomes `octopus enforcer` with the worksheet's meaning — compliance, not orchestration — which is the one item in the six that was simply wrong: a model reading this today is taught the opposite of the source.

**Collaborator kind and the two-sided relationship.** Both are new content in the digest and in `bcc_explain`'s collaborator guidance, and both are new argument shapes on the write path. The relationship pairing is the one worth wording carefully: a model filling a canvas needs to be told the two sides are a *pairing across a boundary* and not a duplicate field, or it will write the same value twice out of symmetry — which is exactly the failure the sheet's symmetric example was chosen to check for.

**The house rule holds throughout.** Results speak only in prose; no tool on this server declares an `outputSchema`, and nothing added here starts. Validation failures ride in `isError` with actionable feedback, never as JSON-RPC errors. `writing-copy` applies to every string — the model is a reader, and these sentences are the product.

**Note (2026-08-11, from [sheet-canonical-layout](037-sheet-canonical-layout.md)):** the vocab.ts realignment flowed into this server ahead of you — the trait list, `octopus enforcer` and the caution/local descriptions already render everywhere `TRAITS` is read, and to keep main green the two count-claim headings (`explain.ts:73`, `schema.ts:107`) were already reworded to "From the ddd-crew model-traits worksheet, plus one local addition:" with the bundle rebuilt and its tests re-pinned. Review that wording as yours to change; everything else here — the section table, the digest move, kind and pairing guidance, the local-addition and anti-pattern notes in `bcc_explain` — remains untouched.

`mcp/README.md` needs whatever changes, and the committed bundle has to be rebuilt: `server.test.ts` drives `dist/server.js` and byte-compares it against a fresh build, so a stale bundle fails the suite rather than shipping quietly. Suite green in `mcp/` and at the root, `tsc` clean in both.

## Resolution

Landed in `955316e`. Suite green in `mcp/` (91) and at the root (339), `tsc` clean in both, `svelte-check` zero errors, and the committed bundle rebuilt — `server.test.ts`'s byte-comparison passes against fresh output.

**The section table.** `sections.ts` now labels `purpose` **Purpose** — the one-word diff the whole ticket is named for, and the only change the table needed: the `Strategic classification` label was already true the moment 037 gave it a panel. Everything that walks the table (`bcc_list_canvases`, the write result's emptiness line, the digest's "Nothing yet under") picked the new label up for free.

**The digest.** Classification moved down out of the title block: `## Strategic classification` is now a section heading like the other nine, with the `Domain: … · Business model: … · Evolution: …` line as its body — the digest and the sheet agree the section exists. The lane grew the two v2 facts, each in the sheet's own spoken idiom (the digest's charter is to be the sheet's screen-reader view written down):

- the kind rides the collaborator heading as the file's own token — `### Payments — bounded-context` — name first, so the h3 stays the collaborator the way SPEC §8.6's hierarchy has it;
- the relationship pair is its own line under the head, each end behind the sheet's sr prefix, theirs first: `Collaborator: open-host-service → this context: conformist`. A one-sided pair keeps the arrow so the unnamed end stays visible as an end — `→ this context: customer-supplier` is what every mechanically-migrated lane reads as until [examples-v2-content](039-examples-v2-content.md) authors the other side.

**`bcc_explain`'s lanes.** Both directions now share one vocabulary block: the four kinds with their one-liners, then the nine patterns. The pairing wording the ticket flagged is in the lane shape itself: *"The two ends are a pairing across one boundary, not a duplicate field: send an end only when that side's stance is actually known, and the same pattern at both ends only when it genuinely holds on both — an asymmetric boundary carries two different words."* The example rows exercise what they teach — inbound shows a kind and a deliberately one-sided pair, outbound the asymmetric `conformist → open-host-service` pair on a `frontend` collaborator.

**One structural interpolation.** The blanket "Any other value is accepted and kept as written." used to be appended after every vocabulary by `explain()` — which would have been flatly wrong under the kind list, the one set the parser refuses. The escape-hatch line now lives inside each entry's vocabulary: unchanged wording for classification and traits, and for lanes it names its scope — *"Any other relationship is accepted and kept as written."* — with a test pinning that the blanket phrasing never reappears on a lane topic.

**Already here, reviewed and kept.** The write path (`schema.ts`) arrived fully v2 with 036 — kind enum, `{ theirs, ours }`, and its own "a pairing, not a duplicate field" describe-text — and the two count-claim headings were reworded by 037's early fix; both read right and stand as written. `custom.ts` already noted custom values at either end.

**`mcp/README.md` needed nothing.** It speaks in counts ("eleven sections") and tool names, never in section labels, trait counts or lane shapes — checked rather than assumed.

**Left for the neighbours.** The four examples still carry no kinds and `ours`-only relationships (039's scope), and the gate runs the whole surface end to end (040).
