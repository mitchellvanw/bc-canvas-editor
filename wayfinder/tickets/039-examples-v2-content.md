---
name: examples-v2-content
title: "Task: the four examples author the new fields, rather than inheriting migration output"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [sheet-canonical-layout]
---

## Question

[canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md) decided the four bundled examples are **hand-authored at v2, not migration output** — they are the teaching set, and shipping them mechanically means `kind` and the two-sided relationship ship invisible, since no example would exercise a field it was never given.

**This exists as its own ticket because the alternative is circular.** [canvas-file-v2](wayfinder/tickets/036-canvas-file-v2.md) must re-pin the examples to land at all — `src/lib/chrome/examples.test.ts` holds every one byte-exact through the parse path — but authoring content for the new fields means judging how a lane with a kind icon and two relationship ends actually reads, which needs [sheet-canonical-layout](wayfinder/tickets/037-sheet-canonical-layout.md) to exist. So v2 migrates them mechanically and correctly, and this ticket comes back afterwards to author them.

**What to author.** A `kind` on every collaborator across the four canvases — the distinction is the whole point of the field, and an example set where it is mostly absent teaches that it is optional in the sense of ignorable. Both ends of the relationship wherever the eight existing values imply an asymmetry: the migration put every v1 value on `ours` by a uniform rule that is right about three of them, ambiguous about three and wrong about two (`big-ball-of-mud` ×2, whose own teaching one-liner says "the other side is entangled legacy"). Here is where that gets corrected by hand rather than by rule. At least one lane should carry a symmetric pattern at both ends, since that is the case the sheet's ink-weight convention is least obviously right about.

**And one correction of intent.** `examples/order-fulfillment.bcc.json:15` carries `octopus coordinator`, chosen under a description that has since been corrected to mean its opposite — the worksheet's Octopus Enforcer is about *compliance*, not orchestration. So the example currently means the reverse of what its author intended. Fix it by intent: pick the trait that says what that context actually does, rather than renaming the value and inheriting a meaning nobody chose.

**What must not move.** These are published artifacts — `examples/*.bcc.json` are downloadable and re-importable, and the [examples map](wayfinder/map-examples.md) settled their roster and their prose. This ticket adds the new fields and fixes the one wrong trait; it does not re-open which four contexts are modelled, their names, or their existing copy. Re-pin `examples.test.ts` against the committed files, suite green, `tsc` and `svelte-check` clean.
