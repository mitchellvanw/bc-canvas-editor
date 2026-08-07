---
name: artifact-design
title: "Decision: artifact production (HTML + PNG)"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [export-techniques, layout-visual-prototype]
---

## Question

Decide how Artifacts are produced and what they contain, using the findings of [export-techniques](wayfinder/tickets/002-export-techniques.md) and the settled visual language: whether the read-only HTML artifact reuses the editor's render components or a dedicated template; the CSS/font inlining approach for the single .html file; the responsive pass for the HTML artifact; the PNG capture library and exactly what region renders at 2x; where the CC BY 4.0 ddd-crew attribution appears on each artifact; artifact file naming.

## Resolution

Settled in a grilling session (2026-08-07), building on [export-techniques](wayfinder/tickets/002-export-techniques.md) and the quiet-sheet language from [layout-visual-prototype](wayfinder/tickets/004-layout-visual-prototype.md).

**Render source**

- One shared read-only `CanvasSheet` Svelte component is the canonical visual truth. At export time it mounts in a hidden container; the HTML artifact serializes that mount, the PNG captures it. Editor and both artifacts can never drift visually, and the two artifacts are pixel-identical. No live-editor-DOM serialization — affordances, contenteditable spans and placeholders never leak in.

**The HTML artifact is re-importable**

- The Canvas file JSON is embedded in the document (Excalidraw-style script block), **byte-identical** to the `.bcc.json` export (deterministic serialization, per [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md)).
- The importer accepts both `.bcc.json` and `.bcc.html`, through one path: same version check and migrations, same refusal of newer versions, same unexported-changes confirmation gate, same history clearing. A missing/corrupt embedded block is refused like any invalid Canvas file.
- Consequently **HTML-artifact export clears "unexported changes"** — the flag protects recoverable work, and an HTML artifact now is recoverable work. PNG export never clears it. Recorded as an amendment on [state-undo-autosave](wayfinder/tickets/006-state-undo-autosave.md); glossary sharpened (an Artifact stays read-only *as a document*; the HTML one carries the Canvas file within it).

**HTML artifact assembly**

- CSS: the app's entire compiled Tailwind stylesheet, fetched same-origin at export time, inlined in one `<style>`. (Vite `?inline` unverified — runtime fetch is the default.)
- Fonts: only the weights actually used of Archivo / Source Serif 4 / IBM Plex Mono, latin subset, as base64 WOFF2 data URIs (~300–500 KB artifact — acceptable). Per-document glyph subsetting (Excalidraw's wasm approach) is a noted future optimization, not v1.
- Source-level credit: an HTML comment near the top crediting ddd-crew with the CC BY 4.0 license URL.
- Delivered as a Blob download.

**Responsive + print pass (HTML artifact only)**

- Below a single breakpoint the 12-column grid stacks to one column in the canvas's reading order (title block → description → classification → roles → inbound → ubiquitous language → business decisions → outbound → assumptions/metrics/questions), sections full-width; typography and palette unchanged. No miniature, no horizontal scroll.
- Minimal `@media print` pass: clean section breaks — printing the artifact remains the PDF answer.

**PNG capture**

- **SnapDOM** (`@zumer/snapdom`) alone at v1. The spec's first implementation checkpoint: verify PNG capture on Safari/iOS (foreignObject flakiness is the dominant known risk). Fallback order documented as contingency, not shipped: modern-screenshot → html-to-image → html2canvas-pro.
- Region: the offscreen artifact render from title block through footer, on its cream paper ground with a fixed margin, at the fixed ~1440px desktop layout width regardless of window size. App chrome never appears. `scale: 2`, clamped only if iOS canvas pixel limits force it.

**Shared artifact content rules**

- Attribution: both artifacts carry the settled footer — one-line swatch legend + ddd-crew CC BY 4.0 line. It's inside the PNG capture region, so the license credit is in the pixels.
- Empty sections render as their sheet with the section label and an empty body — no teaching hints, no placeholders. The artifact shows exactly what was written.

**File naming**

- Slugified context name as stem, family-signaling extensions: `<slug>.bcc.json` / `<slug>.bcc.html` / `<slug>.bcc.png`. Unnamed canvas falls back to `bounded-context-canvas`. No date stamps. The suffix also lets the importer recognize both importable forms.
