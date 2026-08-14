---
name: webkit-svg-stacks
title: "Task: the committed image in Safari — four sections vanish at README scale"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

[render-checkpoint](wayfinder/tickets/060-render-checkpoint.md)'s one red: in WebKit, the committed `.bcc.svg` displayed below natural size renders Business Decisions, Assumptions, Verification Metrics and Open Questions as **empty panels**, and the masthead paints name-above-eyebrow — on github.com itself, at the README's 758px. Chrome is correct at every size; WebKit is correct at natural size and through `drawImage`.

The mechanism is pinned by a minimal repro (`.scratch/render-checkpoint/webkit-min-repro.mjs`, `evidence/leg2-minrepro-scaled.png`): **WebKit's SVG-as-image display path paints `position: relative` foreignObject content unscaled** when the image is shown below its natural size — the text draws at full size and escapes the image's box. `.stack li { position: relative }` (`CanvasSheet.svelte:975`, the anchor for the absolutely-positioned `::before` marker) is exactly that, on exactly the four dead sections.

To decide and do:

1. Whether the fix is laying out `.stack li` without `position: relative` — the marker as `::marker`, an inline glyph, or a grid/flex track instead of an absolutely positioned `::before` — or something else the repro suggests; whatever it is, SPEC §9's one-sheet rule means it changes the sheet **everywhere**, so the editor, the artifact, both fence surfaces and the four committed images all move together, and the masthead's flip needs the same diagnosis before the fix can claim it.
2. Re-render the four `examples/*.bcc.svg`, re-run the WebKit probe at README scale, and re-run the identity gate (the sheet changed, so the byte figures in 054/055/060 move).
3. Worth an upstream WebKit bug report with the minimal repro — the finding is engine-level, not ours — but filing one is Mitchell's call.

## Resolution

**Fixed by removing every self-painting layer from the sheet, and the committed images draw whole in Safari at README scale.** The probe (`.scratch/webkit-svg-stacks/probe-variants.mjs`, `evidence/variants-webkit.png`) unified the two symptoms into one mechanism broader than the ticket's: WebKit's SVG-as-image path paints **any self-painting layer** unscaled below natural size — positioned boxes as charted, but also every stacking context. The masthead flip needed no second diagnosis: `.tb__eyebrow` carried `opacity: 0.6`, opacity below 1 is a stacking context, and the "flip" was the eyebrow painting full-size across the scaled name. A CSS transform qualifies too, which killed the obvious marker fix — an unpositioned inline-block `::before` scales correctly *until* it carries the hotspot's `rotate(14deg)`, which re-breaks it.

**The fix, on the sheet everywhere (SPEC §9's one-sheet rule):**

1. **The stack markers are inline `<svg>` in markup** — one `stackMarker` snippet for all three stack kinds, colours from the `ul`'s class in scoped CSS, and the hotspot tilt as an SVG-internal `transform="rotate(14 3.5 3.5)"` **attribute**, which stays inside the SVG painter and scales (round 2 probe: `clip-path` also survives but cannot draw the 1px same-hue stroke; the kind icons already proved inline SVG on the failing screenshot). `xmlns` rides along and the existing every-`<svg>` test covers it unprompted. The one visual drift: the neutral marker now carries a 1px self-coloured stroke so all three markers are one shape.
2. **The eyebrow dims by colour, never by opacity** — `color-mix(in srgb, var(--color-sheet) 60%, var(--color-ink))`, which is byte-for-byte the blend `contrast.test.ts` already verifies against AA (its wording updated, its numbers untouched). The view switcher's dot had set this idiom in SPEC §6 already. `.sr-only` keeps `position: absolute`: it paints nothing wherever it lands.

**Two holes found by the fix breaking things, both now guarded:**

- **The first cut broke every committed image and no test noticed**: a CSS comment reading `opacity < 1` is legal HTML and fatal XML, because `<style>` is a raw-text element the serializer never escapes — the artifact kept working while all four `.bcc.svg` became broken-image icons, and `bcc check` only byte-diffs. `render.test.ts`'s well-formedness test now asserts no `<` inside any `<style>` block; SPEC §9.3's XHTML bullet says why.
- **Tailwind's preflight moved the marker in the editor only**: `svg { display: block }` reaches the offscreen mount and the live sheet but not the renderer's scoped preflight, so the editor's SVG export measured ~1325–27 against the CLI's 1292 while artifacts stayed correct. `.stack__marker` now states `display: inline-block` itself; no host stylesheet can disagree.

**The gate, re-run (figures move as the ticket predicted):** all five specimens editor-export ≡ CLI-render byte-identical (`identity.mjs`: 225,314 / 219,203 / 217,278 / 229,428 / 217,261 B); the editor's SVG export in **Chromium** ≡ the committed image at 209,794 B, height 1292 — ticket 062's demonstration repeated on the changed sheet. A **WebKit** editor writes height 1290, a pre-existing engine measurement difference (the *old* sheet already measured 1289/1292 WebKit/Chrome in the page frame — 062's "both browsers" were both Chromium) which 056's design absorbs: the staleness check reproduces at the declared height, so either file passes `bcc check`. Re-rendered all four `examples/*.bcc.svg` (heights unchanged); WebKit at the README's 758px draws all four stack panels and the masthead in order (`evidence/verify-758-webkit.png`); Chrome unchanged; root 506/506, MCP 36/36, svelte-check and all three package `tsc` clean.

**Handed to Mitchell:** the upstream WebKit report (decide-and-do 3) — the minimal repro is `.scratch/render-checkpoint/webkit-min-repro.mjs` plus this ticket's variant probe, and the finding is engine-level: positioned/stacking-context foreignObject content paints unscaled in SVG-as-image display below natural size. Incidental: leg 5's uncaught `OutsideRoot` crash was reproduced first-hand here (`--out` outside the root) — already ticketed as [cli-refusal-register](wayfinder/tickets/065-cli-refusal-register.md).
