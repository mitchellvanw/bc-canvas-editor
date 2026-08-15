# WebKit upstream bug report — draft for Mitchell to file

File at <https://bugs.webkit.org/enter_bug.cgi> (product **WebKit**, component **SVG**).
Attach `testcase.html` plus the two screenshots (`verify-webkit.png`, `verify-chrome.png`).
Verified 2026-08-15 on Playwright WebKit 26.5 (macOS 15 / Darwin 24.6); Chrome 151 and
Firefox render correctly. Worth one manual open of `testcase.html` in real Safari before
filing, so the report can name the Safari/macOS version too — Playwright WebKit is not
Safari proper.

**Duplicate check first.** This is almost certainly another face of the open umbrella bug
[23113](https://bugs.webkit.org/show_bug.cgi?id=23113) — "Layer content inside HTML in SVG
foreignObject renders in the wrong place", open since 2009, 13 duplicates, last activity
July 2026: the RenderLayer hierarchy does not extend through the SVG renderers, so HTML
layers never learn the SVG's transform. The listed duplicates are in-document foreignObject
cases; none obviously covers the **SVG-as-image** path, where the whole document is
rasterized at a scale. Two honest options: (a) file the report below as a new bug that
references 23113 — triage will dupe it if they consider it covered — or (b) post it as a
comment on 23113 adding the image-mode manifestation and test case. (a) is the usual
Bugzilla etiquette for a distinct manifestation with its own repro.

---

## Title

SVG-as-image: foreignObject content that creates a compositing layer (position, opacity,
transform) paints unscaled when the image is displayed below its natural size

## Description

When an SVG containing a `<foreignObject>` is used as an image (`<img>` with a
`data:image/svg+xml` URI; same through CSS backgrounds) and displayed **below its natural
size**, any XHTML content inside the foreignObject that creates a self-painting layer —
`position: relative`, `opacity` below 1, or a CSS `transform` — paints at its full,
unscaled size, escaping its line box and the image's bounds. Plain-flow content in the same
foreignObject scales correctly. At natural size (and above), everything is correct, and the
same SVG drawn through `canvas drawImage` is also correct.

Chrome and Firefox scale the image uniformly in all cases.

This looks like the SVG-as-image manifestation of bug 23113 (HTML RenderLayers have no
knowledge of the SVG transforms): in image mode the document is rasterized with a scale
transform the layered content never receives.

## Steps to reproduce

1. Open the attached `testcase.html` (self-contained, one data: URI shown twice).
2. Compare the 400px (natural size) rendering with the 200px (half size) rendering.

Or minimally: any `<img>` whose SVG source contains
`<foreignObject><div xmlns="…"><p style="position:relative">text</p></div></foreignObject>`,
displayed with a width smaller than the SVG's natural width.

## Expected

The half-size image is the natural-size image scaled uniformly, as in Chrome and Firefox.

## Actual

The `position: relative` line, the `opacity: 0.6` line, and the transformed span paint at
full size — 16px text inside a half-scale image — overlapping the correctly scaled control
line and overflowing the image box. See `verify-webkit.png` beside `verify-chrome.png`.

## Real-world impact

Any SVG that uses foreignObject for styled text breaks in Safari wherever pages show images
responsively scaled down. We hit it with generated architecture diagrams committed to a
GitHub repository: at github.com's README width (758px), four sections of the diagram
rendered as empty panels in Safari while Chrome drew them at every size
(https://github.com/mitchellvanw/bc-canvas-editor, examples/*.bcc.svg — since worked
around by removing every layer-creating property from the SVG's foreignObject content:
inline-SVG list markers instead of positioned `::before`, `color-mix()` instead of
`opacity`, SVG `transform` attributes instead of CSS transforms).

---

Notes for the filing session, not for the report: the fuller diagnosis lives in
`wayfinder/tickets/063-webkit-svg-stacks.md`; the original probes are
`.scratch/render-checkpoint/webkit-min-repro.mjs` and
`.scratch/webkit-svg-stacks/probe-variants.mjs`; `verify.mjs` here re-screenshots
`testcase.html` in both engines.
