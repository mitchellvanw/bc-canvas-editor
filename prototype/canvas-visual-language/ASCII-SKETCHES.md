# Phase 1 — ASCII sketches: canvas visual language

> PROTOTYPE — throwaway. Four distinct visual-language directions for rendering the
> V5 canonical canvas. The *layout* is settled (ticket: layout-visual-prototype fixes
> the visual language, not the grid): description/classification/roles top; inbound
> left; ubiquitous language + business decisions center; outbound right;
> assumptions/metrics/open questions bottom. What varies here is the *treatment* —
> chrome, typography, and how the Event Storming palette is applied.

## Sketch 1 — Workshop wall

The canvas as the physical artifact it descends from: a board on a wall, sections
as taped-off areas, every row a sticky note with a full color fill and a slight
rotation. Marker-style section headings.

```
 ~ warm paper background ~
 ┌────────────────────────────────────────────────────────────────┐
 │ ⌇tape⌇  ORDER FULFILLMENT          (marker caps)               │
 │ [index card: description...]   DOMAIN ROLES: ⬜execution ctx    │
 │ CLASSIFICATION:  (core)  (revenue)  (custom-built) ← stickies  │
 ├──────────────────┬─────────────────────────┬───────────────────┤
 │ INBOUND          │ UBIQUITOUS LANGUAGE     │ OUTBOUND          │
 │ ╭pink sticky╮    │ ┌white index cards┐     │    ╭pink sticky╮  │
 │ │ Checkout  │    │ │ Shipment: ...   │     │    │Notification│  │
 │ ╰───────────╯    │ │ Pick List: ...  │     │    ╰───────────╯  │
 │  🟦 Place Order  │ └─────────────────┘     │ 🟧 Order Shipped  │
 │  🟧 Payment Conf │ BUSINESS DECISIONS      │ 🟧 Delivery Delay │
 │  (rotated ±2°)   │ 🟪 No partial shipments │                   │
 ├──────────────────┴─────────────────────────┴───────────────────┤
 │ ASSUMPTIONS 🟨   │ METRICS 🟨        │ OPEN QUESTIONS 🟥        │
 └────────────────────────────────────────────────────────────────┘
```

Strong: the palette is *native* here — stickies are literally what Event Storming
colors mean. Weak: marker fonts and rotation can read as toy-like; density suffers.

## Sketch 2 — Print document

The canvas as a formal one-page document, closest to the original ddd-crew
template: one continuous ruled grid, no gaps, ink-dark borders, serif canvas name,
uppercase letter-spaced section labels. Color appears only as small typed chips
(CMD/QRY/EVT) and thin edge accents — the page would print beautifully.

```
 ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 ┃ Order Fulfillment (serif)   │ STRATEGIC CLASSIFICATION        ┃
 ┃ Coordinates picking, ...    │ Domain: Core │ Model: Revenue   ┃
 ┃─────────────────────────────│ Evolution: Custom-built         ┃
 ┃ DOMAIN ROLES: Execution context — carries out the workflow    ┃
 ┣━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━┫
 ┃ INBOUND     ┃ UBIQUITOUS LANGUAGE      ┃ OUTBOUND            ┃
 ┃ Checkout    ┃ Shipment — a parcel...   ┃ Notifications       ┃
 ┃ ⌐customer-  ┃ Pick List — ...          ┃ [EVT] Order Shipped ┃
 ┃  supplier   ┃──────────────────────────┃ [EVT] Delivery Del. ┃
 ┃ [CMD] Place ┃ BUSINESS DECISIONS       ┃ Billing             ┃
 ┃ [EVT] Paymt ┃ ¶ No partial shipments   ┃ [EVT] Shipment Cmpl ┃
 ┣━━━━━━━━━━━━━┻━━━━━━━━━━┳━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━┫
 ┃ ASSUMPTIONS │ VERIFICATION METRICS │ OPEN QUESTIONS ▲red rule ┃
 ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

Strong: authoritative, dense, prints/exports perfectly, closest to the template
people already know. Weak: austere; the palette is demoted to an annotation.

## Sketch 3 — Product panels

The canvas as a modern app document (Linear/Notion register): soft gray page,
sections as white rounded cards with hairline borders and subtle shadows, gap-
spaced grid, message rows as list items with colored type tags, classification as
filled chips. Reads as "this is an editor", not a poster.

```
 ░ soft gray background ░
  ╭─ card ──────────────────────────────╮ ╭─ card ──────────────╮
  │ Order Fulfillment        ● Core     │ │ DOMAIN ROLES        │
  │ Coordinates picking...   ● Revenue  │ │ ◦ Execution context │
  │                          ● Custom   │ │ ◦ Gateway context   │
  ╰─────────────────────────────────────╯ ╰─────────────────────╯
  ╭─ INBOUND ─────╮ ╭─ UBIQ. LANGUAGE ──╮ ╭─ OUTBOUND ──────────╮
  │ Checkout ▸c-s │ │ Shipment  defn... │ │ Notifications       │
  │ ▮cmd Place Or │ │ Pick List defn... │ │ ▮evt Order Shipped  │
  │ ▮evt Payment  │ ╰───────────────────╯ │ ▮evt Delivery Delay │
  │ Cust. Support │ ╭─ BUSINESS DECIS. ─╮ │ Billing ▸ohs        │
  │ ▮qry Get Ship │ │ ▮ No partial ship │ │ ▮evt Shipment Compl │
  ╰───────────────╯ ╰───────────────────╯ ╰─────────────────────╯
  ╭─ ASSUMPTIONS ─╮ ╭─ METRICS ─────────╮ ╭─ OPEN QUESTIONS ────╮
```

Strong: most natural home for inline editing affordances; calm at high density.
Weak: most generic — could be any SaaS; the workshop heritage disappears.

## Sketch 4 — Blueprint (NOT promoted)

Dark slate schematic: monospace labels, thin neon section rules, the context drawn
as a central node with inbound/outbound as wired ports.

```
 ▓ dark slate ▓
   ┌─[ CONTEXT: order-fulfillment ]────────── class: core/rev/custom ─┐
   │  in ──▶ ░checkout░ ─cmd─▶ ┃            ┃ ─evt─▶ ░notifications░  │
   │        ░support░  ─qry─▶  ┃  UL / BD   ┃ ─cmd─▶ ░carrier-gw░     │
   └──────────────────────────────────────────────────────────────────┘
```

Rejected before HTML: the Event Storming palette fights a dark ground (orange/
lilac/pink lose their sticky-note meaning), the print/PNG artifact story is weak,
and a schematic register suggests diagramming, not document editing — the app is
a document editor.

## Promotion decision

Sketches 1–3 go to HTML: they occupy genuinely different registers (physical
workshop / formal print / product app) and each applies the settled palette in a
structurally different way (full fills / typed chips / colored tags). Sketch 4 is
recorded as explored-and-rejected with reasoning above.

---

# Round 2 (2026-08-07)

Round 1 rejected in full: **wrong registers entirely** (sticky-board, print form,
SaaS cards) and **color handling wrong** (full fills too loud, chips too demoted,
tints too candy). User direction for round 2: *warm minimal craft*, plus a design
inspired by their reference files `~/Downloads/bounded-context-canvas-example.html`
/ `-template.html` (identical CSS — one coherent design: warm paper + drafting
grid, ink title block, Archivo / Source Serif 4 / IBM Plex Mono, sticky fills
anchored by darker ink borders, message *shapes* per type, panel hints, legend
footer).

Direction being user-set, this round went straight to HTML:

- **4 — Warm minimal craft**: no boxes at all; whitespace + hairline rules +
  small-caps labels carry the structure; serif for user content; color only as
  small desaturated inky marks (▶ ? ◆ glyphs, colored ticks).
- **5 — Drafting sheet**: the reference design's language adapted to our content
  and schema decisions (classification in the title block, full-string
  relationship badges, plain metric rows, no metadata, static render).

---

# Round 3 (2026-08-07)

Round 2 reaction: **5 — Drafting sheet wins** ("I like it the most, but it's
still a bit rough"); 4 — Warm minimal craft not picked. "Rough" was not
specified, so the two derivatives each interpret it differently:

- **6 — Quiet sheet**: rough = *too busy*. Fainter/wider grid, cream paper,
  rounded panels with soft shadow, hints removed, ONE message shape (uniform
  chips + glyphs), label underlines instead of squares + rules, collaborators as
  underlined names instead of pink stickies, highlighter-stroke terms, compact
  one-line legend.
- **7 — Technical sheet**: rough = *not committed enough*. Sheet border frame,
  ink label tabs echoing the title block, mono panel numbers 01–09, ink-dark
  panel borders with hard 2px print shadows, message shapes kept and tightened,
  mono data-strip footer. Hints removed here too.
