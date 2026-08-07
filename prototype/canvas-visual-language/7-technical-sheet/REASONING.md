# Variant 7 — Technical sheet (round 3, derivative of 5)

## Style description

The drafting sheet sharpened. Interprets "still a bit rough" as *not committed
enough*: if the design quotes an engineering drawing, let it be one. The sheet
gets a border frame (inset outline like a drawing margin); every panel becomes a
numbered drawing cell (mono `01`–`09` in the corner) with its label on a solid
ink tab riding the top edge — echoing the title block; borders darken to ink;
soft blur shadows are replaced by hard 2px-offset print shadows on panels,
messages, roles, and terms; the footer becomes a mono data strip
(`BCC·V5 · DDD CREW · CC BY 4.0`) with a compact legend.

## Design decisions (deltas from 5)

- **Ink tabs unify the system**: the title block's language (ink ground, Archivo
  caps, colored square) repeats at panel scale, fixing round-2's slight
  disconnect between the hero block and the pale panel labels.
- **Panel numbering** (01–09) leans into the sheet metaphor and gives sections a
  stable reference in conversation ("hotspots in 09").
- **Message shapes kept and tightened**: command block / query pill / event
  arrow survive (they carry real information), with a wider arrow notch and
  consistent chip heights; hard offset shadows make chips read as physically
  placed, without round 1's rotation whimsy.
- **Hints removed** (same reasoning as variant 6 — they belong to the empty
  state).
- **Assumptions/questions stay dashed** ("not settled" reads as a drafting
  convention here), roles become mono chips with the same print shadow.

## Requirements mapping

Same canonical grid, content, palette assignments, and CC BY 4.0 attribution as
variant 5; classification stays in the title block; flow chevrons kept and
bolded.

## Trade-offs

- **Gains:** strongest identity of any variant — unmistakably *this app*; the
  system is coherent from title block to footer; numbering and the data strip
  are natural hooks for export artifacts (PNG/HTML look like issued drawings).
- **Sacrifices:** the busiest surface; ink tabs cost vertical space and
  constrain long section titles at narrow widths; hard shadows on interactive
  rows may fight hover/selection states when editing arrives; the drawing
  costume could read as pastiche if the editor's chrome doesn't follow through.
