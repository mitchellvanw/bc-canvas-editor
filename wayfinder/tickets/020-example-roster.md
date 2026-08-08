---
name: example-roster
title: "Grilling: which 3–5 example canvases, and what must the set demonstrate?"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [example-canvas-sources]
---

## Question

Pick the roster. Charting fixed the frame: 3–5 canvases, Order Fulfillment (the SPEC §3.1 reference) included, each a defensibly good model — examples teach modeling taste as much as UI. Decide:

- **Which domains.** Invented or derived from published examples (see [example-canvas-sources](wayfinder/tickets/019-example-canvas-sources.md) for candidates and the attribution cost of deriving)? Domains familiar enough to read cold, distinct enough from each other to be worth a chooser.
- **What the set demonstrates as a whole.** Spread across strategic classifications (core/supporting/generic — Order Fulfillment already holds core/revenue/custom-built)? Relationship-type coverage? All three message types? At least one canvas with assumptions, verification metrics, and open questions genuinely filled — and possibly one deliberately sparse, showing an honest early-stage canvas?
- **Per-canvas identity.** Name, one-line description (the chooser will likely show it), and what each one is *for* — the thing a visitor learns by opening it.

Resolution is the roster list; [authoring](wayfinder/tickets/022-author-examples.md) writes the canvases.

## Resolution

**Four canvases.** The set's spine: strategic-classification spread (core / supporting / generic) and fill-density spread (flagship + one mid-workshop) drove the domain picks; relationship-type and message-type coverage are **authoring checklists**, verified in [author-examples](wayfinder/tickets/022-author-examples.md), not domain drivers. Universe shape is **hybrid**: an e-commerce pair sharing one lane, plus two singles from distinct industries. All domains invented, per [example-canvas-sources](wayfinder/tickets/019-example-canvas-sources.md) — no derivation, no new attribution.

The roster (canvas name = context name, no "Example:" prefix; one-liners are identity, final strings subject to `writing-copy` polish at ship time):

| Canvas | Slot | One-liner (chooser description) | What you learn by opening it |
|---|---|---|---|
| **Order Fulfillment** | core · revenue · custom-built — flagship | Coordinates picking, packing and shipping once an order is paid. | The whole canvas working — all eleven sections genuinely filled, sticky-note brief. |
| **Notifications** | generic — paired with Order Fulfillment | Delivers order updates to customers on their preferred channel. | What *generic* looks like: a short canvas, conform-and-buy decisions — and Order Fulfillment's outbound `Order Shipped` event seen from the receiving side. |
| **Appointment Scheduling** | supporting — matured single (clinic) | Books patients into clinic slots and keeps no-shows down. | A defensibly *supporting* classification and metrics you could actually falsify. |
| **Royalty Distribution** | mid-workshop single (music streaming) | Splits streaming revenue among rights holders. | An honest half-finished canvas: open questions outnumber decisions, the core-or-supporting classification debate captured unset. |

Per-canvas notes for authoring:

- **Order Fulfillment** — enriched from the current thin draft into the flagship: every section genuinely filled but sticky-note brief (sparse is canonical, per the sources research — Scoring-style, not documentation prose). Its "Who owns returns?" open question stays open; that's the charm.
- **Notifications** — the pair lesson rides the simplest possible message: Order Fulfillment's outbound `Order Shipped` event appears as Notifications' inbound lane. Open-host posture; brevity *is* the generic lesson.
- **Appointment Scheduling** — classification defensible without a footnote (care is the clinic's core); rich language (slot, no-show, overbooking) and falsifiable metrics (no-show rate, utilization).
- **Royalty Distribution** — believably mid-discovery: classification pick left unset with the core-or-supporting debate recorded as an open question, open questions outnumbering decisions, optional sections still empty. Its chooser description **flags the unfinishedness quietly** — one trailing documentary clause — so a visitor opening it half-empty reads intent, not breakage; exact wording is chooser/authoring copy work.

**Example** added to `CONTEXT.md` as a glossary term (curated bundled Canvas, opened through the import path, published as a downloadable `examples/*.bcc.json`).
