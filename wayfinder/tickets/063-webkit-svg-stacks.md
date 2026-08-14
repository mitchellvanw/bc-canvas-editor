---
name: webkit-svg-stacks
title: "Task: the committed image in Safari — four sections vanish at README scale"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: []
---

## Question

[render-checkpoint](wayfinder/tickets/060-render-checkpoint.md)'s one red: in WebKit, the committed `.bcc.svg` displayed below natural size renders Business Decisions, Assumptions, Verification Metrics and Open Questions as **empty panels**, and the masthead paints name-above-eyebrow — on github.com itself, at the README's 758px. Chrome is correct at every size; WebKit is correct at natural size and through `drawImage`.

The mechanism is pinned by a minimal repro (`.scratch/render-checkpoint/webkit-min-repro.mjs`, `evidence/leg2-minrepro-scaled.png`): **WebKit's SVG-as-image display path paints `position: relative` foreignObject content unscaled** when the image is shown below its natural size — the text draws at full size and escapes the image's box. `.stack li { position: relative }` (`CanvasSheet.svelte:975`, the anchor for the absolutely-positioned `::before` marker) is exactly that, on exactly the four dead sections.

To decide and do:

1. Whether the fix is laying out `.stack li` without `position: relative` — the marker as `::marker`, an inline glyph, or a grid/flex track instead of an absolutely positioned `::before` — or something else the repro suggests; whatever it is, SPEC §9's one-sheet rule means it changes the sheet **everywhere**, so the editor, the artifact, both fence surfaces and the four committed images all move together, and the masthead's flip needs the same diagnosis before the fix can claim it.
2. Re-render the four `examples/*.bcc.svg`, re-run the WebKit probe at README scale, and re-run the identity gate (the sheet changed, so the byte figures in 054/055/060 move).
3. Worth an upstream WebKit bug report with the minimal repro — the finding is engine-level, not ours — but filing one is Mitchell's call.
