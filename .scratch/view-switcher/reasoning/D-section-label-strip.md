# D — Section-label strip

`src/lib/proto/ViewsD.svelte` · `?switcher=D` · `evidence/band-D-*.png`, `D-*.png`

## Style

No box, no fill, no border: three words in the sheet's **section-label** idiom —
small-caps Archivo 600 at 0.72rem with a short 2px underline under the selected
one — sitting on the cream directly above the title block.

## Design decisions

- **It borrows a sentence the sheet already speaks eleven times.** Every panel
  on the canvas is headed by exactly this: a small-caps label with a 2px rule,
  meaning *this names the thing below it*. That is precisely what a tab asserts,
  so the switcher says it in the sheet's own words rather than inventing a
  control vocabulary.
- **The rule is always in the box, transparent when unselected**, so the words
  never shift as selection moves.
- **The underline is ink, not a hue.** §5 gives section labels a rule in the
  section's colour, neutral gray where no hue applies; a View has no hue, and
  ink reads as the strongest neutral.

## Requirements mapping

| Ticket requirement | How it lands |
|---|---|
| Permanent, not hover-revealed | Always present |
| Not chrome | Furthest from chrome of all four — it has no control affordance whatsoever |
| Responsive tiers | Text only; survives every tier |
| Unapplied marker | Trailing `•`. First draft put it outside the underlined span and it dropped onto a second line — fixed to `inline-block` |
| Artifact | Not built; would carry over unchanged, and degrades like B (ships hidden, nothing orphaned) |
| Tablist semantics | Same as all four; the ink focus ring around a bare word looks deliberate (`D-focus.png`) |

## Trade-offs

- **Gains:** quietest possible. Adds no object to the page — only three words.
  Perfectly consistent with §5 because it *is* §5's own idiom.
- **Costs:**
  - **It collides with the idiom it borrows.** In `band-D-sheet.png` the strip
    sits directly above `PURPOSE` / `STRATEGIC CLASSIFICATION`, in the same
    face and weight — a reader can take `SHEET JSON MARKDOWN` for one more row
    of section headings rather than a control. Borrowing the sentence means
    inheriting its ambiguity.
  - **Discoverability is the open risk.** The ticket's constraint is that the
    switcher must be permanently visible *because you need it to discover the
    other Views exist*. D is visible but not evidently clickable, which is a
    softer version of the same failure.
