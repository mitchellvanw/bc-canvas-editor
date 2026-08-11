# 1 · Tinted plate

**Style.** The centre region is a wash of ink on the paper itself — like a tinted
zone on a printed map. Translucent (`rgb(26 30 32 / 0.045)`), so the drafting
grid stays visible through it; the region reads as *marked paper*, not a new
surface.

**Design decisions.** Grouping by added ground instead of enclosure. The wash
uses the same ink as everything else at grid-line-like intensity, so no new
color enters the palette. Radius 6px matches the title block, tying the two
"special" regions together.

**Requirements mapping.** No gray line — no line at all. Subtle: at 4.5% alpha
the plate is quieter than the panel borders. The pair is unambiguously set
apart because the ground under it differs.

**Trade-offs.** Gains: zero added contour; calm; survives any panel height.
Sacrifices: the region's edge is soft — less crisp than a drafted mark; on
low-quality displays a large faint wash can look like dirt rather than intent.
