# 3 · Corner ticks

**Style.** Four drafting registration marks — 16px corner Ls in translucent ink —
and nothing between them. The enclosure is implied, the way a technical drawing
marks a region without fencing it.

**Design decisions.** The canvas already speaks drafting: the 32px grid, the
mono annotations, the spaced-caps labels. Corner marks extend that vocabulary.
Translucent ink (45%) instead of the gray token keeps the marks *ink*, matching
how every other line on the sheet is drawn.

**Requirements mapping.** The gray line is gone; ~64px of total mark replaces
~4000px of border. Subtle by quantity, not by faintness — each mark is crisp.
The pair is set apart because its corners are registered.

**Trade-offs.** Gains: the most in-character option; nearly zero visual weight.
Sacrifices: the grouping is the weakest of the five at a glance — a viewer must
connect the corners; marks can collide visually with the paper grid lines at
certain alignments.
