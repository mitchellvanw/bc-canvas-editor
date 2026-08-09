---
name: author-examples
title: "Task: author the example canvases"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [example-roster]
---

## Question

Write the roster's canvases as `examples/*.bcc.json` — schema version 1, deterministic serialization, each a genuinely good model of its domain (the roster ticket records what each one must demonstrate). The drafted `examples/order-fulfillment.bcc.json` is the first; bring it in line with whatever the roster decided about it.

Each canvas must round-trip the real import path unchanged. Mitchell reviews the content before this closes — modeling taste is the point, and an agent's draft is a draft.

Resolution records the committed files and anything the review changed.

## Progress

**2026-08-09 — draft ready for Mitchell's review.** All four canvases committed as `examples/*.bcc.json`, each verified byte-identical through the real import path (`parseCanvasImport` → `stampIds` → `serializeCanvas` + trailing newline; scratch vitest run, 6/6 — the committed pinning test is [ship-example-chooser](wayfinder/tickets/023-ship-example-chooser.md)'s job).

- **order-fulfillment.bcc.json** — enriched to flagship: all eleven sections filled, sticky-brief. Added `octopus coordinator` beside `execution context`; Customer Service inbound (relationship deliberately unset — a team, not a context); Warehouse **bidirectional** under `big-ball-of-mud` (legacy WMS); Carriers outbound under `published-language`; four terms, three decisions, quantified metrics. "Who owns returns?" stays open per the roster.
- **notifications.bcc.json** — the generic lesson is brevity plus **conformist on both sides** (adopts Order Fulfillment's `Order Shipped` as-is; conforms to the rented Messaging Platform). Inbound lane pairs exactly with OF's outbound event.
- **appointment-scheduling.bcc.json** — supporting/cost-reduction defensible without a footnote; Patient Portal inbound under `open-host-service`, Patient Records outbound under `anticorruption-layer` (description shows the appointment→visit translation); slot/no-show/overbooking/waitlist language; three falsifiable metrics. One decision carries no description — shows the optional field omitted.
- **royalty-distribution.bcc.json** — mid-workshop: only `businessModel: compliance` set (the core-or-supporting debate is the first open question), all lane relationships unset (mapping not yet done), `assumptions`/`verificationMetrics` empty, four open questions vs one decision.

**Interpolations for review** (beyond the roster's letter):

1. Files are **serializer-canonical bytes** + trailing `\n` — the old draft's hand-compacted rows were regenerated, so committed files now whitespace-diverge from SPEC §3.1's frozen reference block (which stays compact in the spec and test fixture; content of OF is enriched anyway).
2. RD's "captured mid-workshop" flag is **not** baked into the file's `description` — the canvas sheet would render it as domain prose. It stays chooser copy ([example-chooser](wayfinder/tickets/021-example-chooser.md) round 1 already carries "Captured mid-workshop.").
3. Coverage checklist: all three message types appear (commands/queries/events across OF and AS; RD carries command+event). Relationship patterns: 6 of 9 shown (`customer-supplier`, `big-ball-of-mud`, `published-language`, `conformist`, `open-host-service`, `anticorruption-layer`); `partnership`, `shared-kernel`, `separate-ways` absent — forcing them in read as contrivance. Unset relationship is itself taught twice (people lanes; RD's unmapped lanes).
