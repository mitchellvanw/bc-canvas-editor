# Empty state & teaching hints — ASCII sketches

Question: how does a brand-new, all-empty canvas teach the method — without ever
showing a hint on a filled canvas (settled in the visual-language round), on the
live-sheet editing model (placeholders in fields, hover-materialized ghosts)?

Four directions sketched; the first three are structurally distinct enough to
promote to HTML. Sketches show one prose panel (Description) and one structured
panel (Inbound communication) in the blank state.

---

## 1 — Placeholder questions ("the form teaches")

No separate hint layer at all. The *placeholder itself* asks the section's
question, and while a section is empty its ghost add-affordance carries the
question too. First keystroke replaces the placeholder; first item snaps the
ghost back to its terse label. Zero new surfaces.

```
┌─ DESCRIPTION ──────────────────────────┐  ┌─ INBOUND COMMUNICATION ───────────┐
│                                        │  │                                   │
│  What does this context exist to do?   │  │  ╭ + collaborator — who sends ╮   │
│  A few sentences in business language. │  │  ╎ this context commands,     ╎   │
│  (italic, ink-3 — the placeholder)     │  │  ╎ queries or events?         ╎   │
│                                        │  │  ╰╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╯   │
└────────────────────────────────────────┘  └───────────────────────────────────┘
       after first item, ghost reverts to:      ╭ + collaborator ╮
```

- Disappearance: instant — typing kills the placeholder, first item shortens the ghost.
- Seeding: none. + Quietest possible; teaching lives exactly where you act.
- − Teaching capacity is one clause per section; gone the moment content exists.

## 2 — Section preludes ("the sheet annotates itself")

Each empty section opens with a one-to-two-sentence serif-italic hint between
label and body — the ddd-crew helper question in house voice. Ghost adds stay
terse and visible. The hint hides on the section's first committed content and
returns if the section is emptied again. Placeholders shrink to almost nothing.

```
┌─ DESCRIPTION ──────────────────────────┐  ┌─ INBOUND COMMUNICATION ───────────┐
│  What does this context exist to do —  │  │  Who asks this context to act,    │
│  which behaviors and data does it own? │  │  and how? Each collaborator gets  │
│  Business language, not implementation.│  │  a lane with the commands,        │
│  (italic ink-3 prelude)                │  │  queries and events it sends.     │
│                                        │  │                                   │
│  …                                     │  │  ╭ + collaborator ╮               │
└────────────────────────────────────────┘  └───────────────────────────────────┘
```

- Disappearance: on first commit in that section; reappears when emptied.
- Seeding: none. + Full-sentence teaching, method actually explained.
- − Nine italic paragraphs make the blank sheet wordy; risks essay-not-canvas.

## 3 — Specimen ghosts ("teach by example")

Structured sections render a faint worked micro-example (one lane, one term, one
decision…) at ~50% opacity with a tiny mono `example` tag — the Order Fulfillment
specimen from earlier rounds. Clicking a specimen starts a real entry in its
place; a section's specimen dissolves at its first real content. Prose sections
keep question placeholders (a ghost paragraph would read as real text). Answers
the seeding question with: seed nothing real, show everything as ghost.

```
┌─ DESCRIPTION ──────────────────────────┐  ┌─ INBOUND COMMUNICATION ── example ┐
│  What does this context exist to do?   │  │  Checkout        customer–supplier│
│  (placeholder, as in 1)                │  │  [▶ Place Order][◆ Payment Confd] │
│                                        │  │   ····· all at ~50% opacity ····· │
└────────────────────────────────────────┘  │  ╭ + collaborator ╮               │
                                            └───────────────────────────────────┘
```

- Disappearance: per section at first real content; global "hide examples" in the footer.
- Seeding: ghost specimen, never real data — nothing to delete before starting.
- − Risk: ghost content mistaken for content; sheet never looks truly blank.

## 4 — Margin tutor (not promoted)

Hints as pencil notes in the page margin with leader lines into each panel,
like a tutor's annotations on a drafting sheet.

```
   what does this ──────┐┌─ DESCRIPTION ────────────┐
   context exist        ││                          │
   to do?  (margin)     │└──────────────────────────┘
```

Rejected at sketch: the 12-column quiet sheet has no margin column to give away;
annotations fight the drafting grid at narrow widths and duplicate what either
placeholders or preludes do cheaper, inside the panels. Not built.
