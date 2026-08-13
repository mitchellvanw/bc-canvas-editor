---
name: github-svg-probe
title: "Research: does a foreignObject SVG with an embedded font render on github.com?"
labels: [wayfinder:research]
status: open
assignee:
blocked-by: []
---

## Question

The map's committed-image decision rests on one untested link. Settle it before [committed-images](wayfinder/tickets/056-committed-images.md) designs around it.

**What is already established** (charting, 2026-08-13, probes in `.scratch/helicopter/`):

1. Inline `<svg>` written into markdown is dropped by GitHub's sanitizer — its allowlist carries `img` and no `svg`, no `foreignObject`, no `style`. A committed `.svg` file referenced with `<img src>` is a **different path** and is not governed by that allowlist.
2. `foreignObject` inside an `<img>`-loaded SVG renders in current Chromium, WebKit and Firefox — measured in all three.
3. A production README already does it: `pmndrs/valtio`'s hero is `<img src="logo.svg">`, and that file is *nothing but* a `<foreignObject>` wrapping an HTML `<div>` with an inline `<style>` block of `@keyframes`. Raw bytes confirmed intact, served as `image/svg+xml` under `default-src 'none'; style-src 'unsafe-inline'; sandbox`.
4. A base64 `@font-face` **does** apply inside an `<img>`-loaded SVG served under that exact CSP header — measured in all three engines by diffing pixels against a fallback-only control. `default-src 'none'` blocks external fetches; a `data:` URI is not one.

**What is not established.** Every one of those was measured against a *local server replaying GitHub's headers*, not against github.com. valtio proves `foreignObject` and inline `<style>` survive the real pipeline; it does **not** prove a `data:` URI `@font-face` does, because valtio's SVG carries no font. GitHub's SVG handling is documented as lossy in ways its docs do not enumerate — `dominant-baseline` is a known casualty (github/markup#1160) — so the gap between "survives my replay of the headers" and "survives github.com" is exactly where this project's checkpoint habit says to go and look.

**The probe.** Push a real `.bcc.svg` to a real GitHub repo and open it in a browser. Not a minimal fixture — the actual output of the headless renderer over `examples/order-fulfillment.bcc.json` (the `.scratch/helicopter/headless-artifact.mjs` prototype produces the HTML; wrap it in a `foreignObject`), with the eight WOFF2 faces base64'd in. Reference it from a README with `<img src>` and check both surfaces: the rendered README and the blob view.

Report, with screenshots in `.scratch/github-svg-probe/`:

- Does it render at all, and is the layout the twelve-column grid or a collapse?
- **Do the fonts apply**, or does it fall back to a system stack? This is the whole question — compare against the same file with the `@font-face` blocks stripped, so a "yes" is a measured difference and not an impression.
- Does the inline `<style>` block survive, or is anything stripped? Diff the served bytes against what was committed.
- Does size matter — a ~200 KB SVG is far past anything valtio ships. Is there a threshold where camo, the blob view, or the raw path behaves differently?
- Does the same file behave differently in the README (`<img src="…">`), the blob view, and `raw.githubusercontent.com`?

**Why this blocks rather than rides along.** If the font is stripped, the committed image degrades to PNG — which needs real layout, which needs Playwright, which puts a browser back in a chain the whole map was built to keep browser-free. That is not a detail inside [committed-images](wayfinder/tickets/056-committed-images.md); it changes what that ticket is deciding.

A partial answer is a useful answer: "renders, fonts stripped" fully determines the map's shape and should be reported the moment it is known, without chasing the remaining sub-questions.
