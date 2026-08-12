# C — Gutter segmented control

`src/lib/proto/ViewsC.svelte` · `?switcher=C` · `evidence/band-C-*.png`, `C-*.png`

## Style

The chrome's own button idiom — 4px radius, `--color-line` border, sheet fill,
Archivo 500 at 0.8rem — grouped into one segmented pill with 1px dividers, the
active segment filled ink. Left-aligned in the gutter above the sheet. The title
block is untouched: it belongs to the Sheet View alone.

## Design decisions

- **Drawn precisely because it is the direction most at risk.** The ticket
  settled that the switcher is not in the chrome; this variant tests whether a
  control that *looks* exactly like chrome is saved by being left-aligned,
  segmented, and 60px lower. Refusing to draw it would have left that argument
  unexamined.
- **No reach into `CanvasSheet` at all.** The only variant with a clean seam:
  the strip is a sibling of the sheet, and the sheet is unchanged.
- **Focus ring is inset** (`outline-offset: -2px`) because an outset ring on a
  segmented group breaks the pill's edge.

## Requirements mapping

| Ticket requirement | How it lands |
|---|---|
| Permanent, not hover-revealed | Always present |
| Not chrome | **This is where it fails** — see `band-C-sheet.png`, where the pill and the chrome buttons above it are the same object at two sizes |
| Responsive tiers | Fixed-size pill, survives every tier unchanged |
| Unapplied marker | Trailing `•` in hotspot pink; legible but the pill is already busy |
| Artifact | Not built — a chrome-idiom control in a file with no chrome would have to be redrawn, which is requirement 3's failure condition |
| Tablist semantics | Same as all four |

## Trade-offs

- **Gains:** cleanest seam (touches nothing), most conventional, zero
  discoverability risk — everyone has clicked a segmented control.
- **Costs:** it reads as chrome, which is the one thing the ticket ruled out.
  Held next to Import…/Examples/Export in `band-C-sheet.png` it is plainly the
  same family, just lower and smaller. Its own reasoning is the argument against
  it: **this variant exists to be rejected with evidence**, and it earns that.
