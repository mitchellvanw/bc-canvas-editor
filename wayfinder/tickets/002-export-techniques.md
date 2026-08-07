---
name: export-techniques
title: "Research: client-side export techniques (PNG + self-contained HTML)"
labels: [wayfinder:research]
status: open
assignee: research-subagent
blocked-by: []
---

## Question

What is the most reliable, fully client-side way to produce the two Artifact formats, given SvelteKit static + Tailwind CSS v4?

1. **DOM → PNG at 2x**: compare current libraries (html-to-image, dom-to-image-more, SnapDOM, modern-screenshot, satori, html2canvas). Critical constraint: Tailwind v4 emits `oklch()` colors and modern CSS (cascade layers, `@property`) — several older capture libraries choke on these. Which handle them today? How do web fonts embed? Known gotchas at scale factor 2?
2. **Self-contained single-file HTML**: proven approaches to emit one .html with all styles and fonts inlined from a client-side app — serialize the live DOM + inline compiled CSS? A separate render pass? How do others (e.g. Excalidraw's export, single-file bundlers) do it?

Findings land on branch `research/export-techniques` as `docs/research/export-techniques.md`. Feeds [artifact-design](wayfinder/tickets/007-artifact-design.md).
