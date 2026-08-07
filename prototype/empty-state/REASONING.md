# Empty state & teaching hints — round 1

**Question:** how does a brand-new, all-empty canvas teach the method? Constraints
already settled: hints never appear on a filled canvas (visual-language round),
the live-sheet model puts italic placeholders in empty fields and materializes
ghost affordances on hover (inline-editing round).

The three variants disagree on **where the teaching lives**:

1. **Placeholder questions** — in the fields themselves. Placeholders and ghost
   adds ask the section's question; teaching vanishes the instant content exists.
   No new surface, no seeding.
2. **Section preludes** — in a dedicated hint layer. One or two italic sentences
   between label and body per empty section; hides at first committed content,
   returns if the section is emptied. No seeding.
3. **Specimen ghosts** — in a worked example. Structured sections show a faint
   Order-Fulfillment micro-example ("example"-tagged, half opacity, click to
   start a real entry); prose keeps question placeholders. Seeds nothing real —
   the document stays byte-empty until the user acts ({} drawer proves it).

Shared across all three (adjustments to the live-sheet base, all up for
reaction): ghost adds are always visible on an *empty* section rather than
hover-only, since a blank sheet would otherwise show nothing actionable; the
title block keeps "Name this context" and "—" classification placeholders; no
welcome modal or tour anywhere.

A fourth direction (margin tutor — pencil notes in the page margins) died at the
ASCII stage: no margin column to give away, and it duplicates what preludes do
inside the panels. See `ASCII-SKETCHES.md`.

**To react to:** which teaching register fits the quiet sheet; whether hints
should return when a section is emptied (variant 2) or die forever on first
touch (variant 1); whether ghost examples read as teaching or as clutter/fake
content (variant 3); and where each variant's copy lands for the ui-copy ticket.
