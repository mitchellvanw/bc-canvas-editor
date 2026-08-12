# B — Folder tabs (tabs cut from the paper)

`src/lib/proto/ViewsB.svelte` · `?switcher=B` · `evidence/band-B-*.png`, `B-*.png`, `artifact-B*.png`

## Style

Real folder tabs rising out of the top edge of whatever is below them: 5px top
radius, 1px `--color-line` border, no bottom border, `-1px` margin so the active
tab and its panel are one piece of card. Inactive tabs are a 55% sheet wash on
the cream; the active tab is opaque.

## Design decisions

- **The active tab takes the colour of its own panel.** Ink when the Sheet's
  title block is below it, sheet-white when a text panel is. This is the honest
  consequence of the metaphor rather than a flourish — a folder tab that did not
  match its folder would read as a floating chip. It does mean the strip
  changes colour as you switch, which is either the point or too clever.
- **The marker goes *before* the label**, inside the tab, where a leading dot
  reads as a status pip on a card. Hotspot pink, full strength — the tab is not
  dimmed by opacity so nothing fights it.
- **Left-aligned at `1.1rem`**, indented to the title block's own padding so the
  first tab lines up with `BOUNDED CONTEXT CANVAS`.

## Requirements mapping

| Ticket requirement | How it lands |
|---|---|
| Permanent, not hover-revealed | Always present above the sheet |
| Not chrome | Cream ground, paper fill, folder geometry — nothing in the chrome band looks like this |
| Responsive tiers | Three short words; the strip never wraps down to the stack tier |
| Unapplied marker | Leading `•` inside the JSON tab — the most legible of the four (`B-marker.png`) |
| Artifact | Ships hidden and leaves nothing behind when script is off — the cleanest script-less degradation of the four |
| Tablist semantics | Same as all four: one tab stop, arrows select, both-way panel wiring |

## Trade-offs

- **Gains:** unmistakably a switcher — nobody reads a folder tab as a file verb,
  which is the failure mode the ticket names. Best unapplied marker. Best
  script-less artifact behaviour: hidden strip, nothing orphaned.
- **Costs:**
  - **Loudest of the four.** It adds a fifth object to the page and it is the
    first thing the eye lands on — measured against a §5 whose whole argument is
    a quiet piece of paper, that is the charge to answer.
  - The colour-swapping active tab is a **behaviour to explain**; a reader who
    switches Sheet→JSON sees the strip change, not just the panel.
  - Still squares the title block's top corners, so it too reaches into
    `CanvasSheet` — less than A, but not zero.
