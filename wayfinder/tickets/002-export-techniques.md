---
name: export-techniques
title: "Research: client-side export techniques (PNG + self-contained HTML)"
labels: [wayfinder:research]
status: closed
assignee: research-subagent
blocked-by: []
---

## Question

What is the most reliable, fully client-side way to produce the two Artifact formats, given SvelteKit static + Tailwind CSS v4?

1. **DOM → PNG at 2x**: compare current libraries (html-to-image, dom-to-image-more, SnapDOM, modern-screenshot, satori, html2canvas). Critical constraint: Tailwind v4 emits `oklch()` colors and modern CSS (cascade layers, `@property`) — several older capture libraries choke on these. Which handle them today? How do web fonts embed? Known gotchas at scale factor 2?
2. **Self-contained single-file HTML**: proven approaches to emit one .html with all styles and fonts inlined from a client-side app — serialize the live DOM + inline compiled CSS? A separate render pass? How do others (e.g. Excalidraw's export, single-file bundlers) do it?

Findings land on branch `research/export-techniques` as `docs/research/export-techniques.md`. Feeds [artifact-design](wayfinder/tickets/007-artifact-design.md).

## Resolution

Full findings: `docs/research/export-techniques.md` on branch `research/export-techniques` (commit `654eff5`, version/issue-cited).

**PNG:** bet on **SnapDOM** (`@zumer/snapdom`, actively maintained, ~8k stars). It clones the DOM into an SVG `foreignObject` and lets the browser rasterize, so Tailwind v4's `oklch()`, `@layer`, and `@property` are non-issues by construction (verified: no oklch/@layer issues across the foreignObject-library trackers); `scale`/`dpr` gives 2x, `embedFonts` handles self-hosted WOFF2. Fallbacks in order: modern-screenshot or html-to-image (same architecture), then html2canvas-pro ≥2.x (the only CSS-parsing capturer that handles oklch). Rejected: html2canvas (unmaintained since 2022, oklch-broken — issues #3148/#3269) and satori (doesn't capture live DOM).

**Self-contained HTML:** dedicated template render, not live-DOM serialization — clean read-only canvas markup + the whole compiled Tailwind stylesheet fetched same-origin and inlined in one `<style>` + WOFF2 fonts as base64 data URIs + the Canvas file JSON embedded Excalidraw-style in the document; delivered as a Blob download. Prior art: single-file-core (DOM+CSSOM path), Excalidraw PR #8384 (wasm glyph subsetting) as a later size optimization.

**Risks carried into [artifact-design](wayfinder/tickets/007-artifact-design.md):** Safari/iOS foreignObject flakiness is the dominant risk — test early; iOS canvas pixel limits may force clamping the 2x scale; fonts/images must be self-hosted same-origin; Vite `?inline` import of Tailwind-compiled CSS is unverified — default to runtime fetch.
