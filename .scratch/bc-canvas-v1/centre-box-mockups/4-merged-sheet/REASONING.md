# 4 · One merged sheet

**Style.** No wrapper at all: the two sections become one physical sheet,
divided by the same interior hairline the lanes use between collaborators.
Grouping by unification instead of enclosure.

**Design decisions.** The strongest possible statement of "these two belong
together" — they share paper. The divider reuses `--color-line` at the exact
idiom of `.lane + .lane`, so no new visual vocabulary is introduced; the outer
gray box is deleted rather than replaced.

**Requirements mapping.** Gray line gone. Set-apart is automatic: this is the
only panel on the canvas containing two labelled sections.

**Trade-offs.** Gains: simplest, calmest result; one less nesting level to
read. Sacrifices: the two sections lose their individual sheets — they no
longer look like siblings of the other seven panels, and the printed V5
template (which draws an outer rectangle around the pair) is echoed least
literally. Structural change, not just CSS: the sheet markup nests the pair
differently, and each hue-underlined label now shares one panel.
