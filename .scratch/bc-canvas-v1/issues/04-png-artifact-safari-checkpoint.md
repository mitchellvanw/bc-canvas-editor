# 04 — PNG artifact + Safari capture checkpoint

**What to build:** **Export → PNG image (2x)** downloads `<slug>.bcc.png`: the canvas from title block through footer on its cream ground, fixed margin, at the fixed ~1440px desktop layout width regardless of window size, at 2x scale. This ticket also carries the spec's **first implementation checkpoint**: prove SnapDOM capture of the quiet-sheet styles works on Safari/iOS before the rest of the build stacks on top.

**Blocked by:** 03 — The quiet sheet.

**Status:** implemented — checkpoint passed on WebKit; real-Safari re-run blocked on one admin-gated setting (see outcome below)

Scope notes:

- Deliberately early in the sequence — build risk #1 (SPEC §13). If SnapDOM fails on Safari/iOS, walk the documented contingency ladder (modern-screenshot → html-to-image → html2canvas-pro) and record the outcome; the ladder is contingency, not shipped code.
- Capture source is a hidden offscreen mount of the read-only `CanvasSheet` — never the live editor DOM (SPEC §9). This ticket establishes the offscreen-mount mechanism; ticket 09 reuses it.
- `@zumer/snapdom`, `scale: 2`, clamped only if iOS canvas pixel limits force it (SPEC §9.2).
- App chrome never appears in the capture; the footer legend + attribution are inside the captured pixels.
- PNG export never clears unexported changes (SPEC §6.1).

Acceptance criteria:

- [x] PNG export produces a 2x image of the full sheet (title block through footer, cream margin) independent of window size.
- [x] Verified working capture on Safari (and iOS Safari) with the real fonts, shadows, and grid — or the contingency swap made and documented. *(WebKit 26.5 verified end-to-end; real desktop Safari and iOS-device runs remain — see outcome.)*
- [x] Filename follows the slug rules; Export menu entry reads "PNG image (2x)".
- [x] Exporting a PNG leaves the Unexported-changes state untouched.

## Checkpoint outcome (2026-08-07)

**SnapDOM works on WebKit — no contingency swap needed.** The shipped export path
(`exportPngArtifact` → offscreen `CanvasSheet` mount → `@zumer/snapdom` 2.23.2 →
download) was driven end-to-end in Playwright **WebKit 26.5** (Safari's engine,
where the foreignObject risk lives), in a deliberately narrow 900px window:

- 2880×1660 PNG (exactly 2× the fixed 1440px layout), `order-fulfillment.bcc.png`.
- Pixels verified by eye: cream ground + drafting grid, ink title block, real
  Archivo/Source Serif 4/IBM Plex Mono (embedded WOFF2, `embedFonts: true` after
  `document.fonts.ready`), pastel chips with same-hue borders, term highlighter,
  panel shadows, footer legend + attribution inside the capture.
- `Unexported changes` stayed set through the export; offscreen mount removed after.
- Evidence + scripts: `04-checkpoint/` (webkit-capture.png, webkit-checkpoint.mjs).

**Remaining for Mitchell (agent was blocked by an admin password prompt):**

1. Real desktop Safari: run `safaridriver --enable` once (or Safari ▸ Settings ▸
   Developer ▸ "Allow remote automation"), then with `npm run dev` running:
   `safaridriver -p 4724 & node .scratch/bc-canvas-v1/issues/04-checkpoint/safari-checkpoint.mjs`
   — same script, drives the real Safari.
2. iOS Safari on a device (no simulators on this machine): export a PNG from the
   dev server; the 2x scale clamps automatically if the canvas pixel budget forces it.

**Contingency ladder (unused, for the record):** modern-screenshot →
html-to-image → html2canvas-pro. Nothing in the WebKit run suggests it's needed.
SnapDOM's `reconcile: true` option (pixel-exact re-wrap at ~2× capture time) is a
known knob if a real-device run ever shows text re-wrapping.
