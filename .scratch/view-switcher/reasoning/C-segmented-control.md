# C — Gutter segmented control — **the winner**

`src/lib/proto/ViewsC.svelte` · `?switcher=C` · `evidence/band-C-*.png`, `C-*.png`, `artifact-C*.png`

## Style

The chrome's own button idiom — 4px radius, `--color-line` border, sheet fill,
Archivo 500 at 0.8rem — grouped into one segmented pill with 1px dividers, the
active segment filled ink. Left-aligned in the gutter above the sheet. The title
block is untouched: it belongs to the Sheet View alone.

## Design decisions

- **The switcher is a control and says so.** The three Views are not a property
  of the paper; they are three ways of looking at one document, and a control is
  the honest shape for that. The quieter directions (A, D) buy their quietness
  by disguising the switcher as part of the sheet, which makes the sheet claim
  something about itself that is really about the app.
- **No reach into `CanvasSheet` at all.** The only variant with a clean seam:
  the strip is a sibling of the sheet, and the shared sheet component is
  unchanged. A and B both had to square the title block's corners; A also had to
  suppress its eyebrow. That seam matters twice over, because `CanvasSheet` is
  shared with the offscreen artifact mount and the PNG capture.
- **The title block does not persist.** It belongs to the Sheet View, so the
  JSON View never shows a canvas name that an unapplied buffer might disagree
  with — the double-source problem A would have had to answer.
- **Focus ring is inset** (`outline-offset: -2px`) because an outset ring on a
  segmented group breaks the pill's edge.

## Requirements mapping

| Ticket requirement | How it lands |
|---|---|
| Permanent, not hover-revealed | Always present |
| Responsive tiers | Fixed-size pill, unchanged through all four widths (`C-1..4-*.png`) |
| Unapplied marker | Trailing `•` in hotspot pink on the JSON segment |
| Artifact | `artifact-C-sheet.png` — and see below, this is where it does better than expected |
| Tablist semantics | One tab stop, arrows select, panels wired both ways — asserted in `shoot.mjs` |

## The chrome-resemblance risk — accepted, not solved

Held next to Import…/Examples/Export in `band-C-sheet.png`, the pill and the
chrome buttons are the same family: same border, radius, fill and face. That was
the argument against this direction, and it is **not** refuted — it is accepted,
in the tradition of §6's "known accepted risks: soften in build, don't change
the model". Two things bound it:

- **It bites hardest at the stack tier** (`C-4-stack-sheet.png`), where the
  chrome wraps and the pill lands directly beneath `Import…`. That is the shot
  to look at when softening.
- **It does not exist in the artifact at all.** An exported file has no chrome
  band — no file verbs, nothing to be confused with — so the control is
  unambiguous there (`artifact-C-sheet.png`). The risk is editor-only, which
  the "draw the artifact too" requirement is what surfaced. This was missed on
  the first pass, when C's artifact version was skipped as pre-judged.

Softening levers for the build, none of which change the model: drop the fill to
transparent, lose the outer border and keep only the dividers, shrink the type,
or widen the gap between the chrome band and the pill.

## Trade-offs

- **Gains:** cleanest seam of the four (touches nothing shared); zero
  discoverability risk — everyone has clicked a segmented control, which is the
  live worry with A and D; no double-source problem for the canvas name; best
  behaved of the four under the responsive tiers.
- **Costs:** reads as chrome in the editor (above); adds a fifth object to a
  page §5 wants quiet; and with script off in the artifact the `.v-bar` wrapper
  survives as a 14px empty band once its strip is hidden — a one-line fix for
  ticket 047, recorded so it is not rediscovered.
