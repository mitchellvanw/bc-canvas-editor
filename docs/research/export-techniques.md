# Research: client-side export techniques (PNG + self-contained HTML)

Ticket: `wayfinder/tickets/002-export-techniques.md`
Researched: 2026-08-07, against primary sources (GitHub repos/issues/changelogs, npm registry, official docs). Claims not confirmed against a primary source are marked **[unverified]**.

Context: SvelteKit static (adapter-static) + Tailwind CSS v4, fully client-side. Two artifact formats: (a) PNG of the rendered canvas at 2x, (b) single self-contained `.html` file.

---

## 1. DOM → PNG at 2x

### 1.1 The architectural split that decides everything

DOM-to-image libraries fall into two families, and the Tailwind v4 question is answered almost entirely by which family a library belongs to:

1. **CSS re-implementers** — `html2canvas`, `html2canvas-pro` (and `satori`, in its own way). They read styles, *parse the CSS values themselves*, and re-draw everything with their own canvas renderer. Every new CSS feature (`oklch()`, `color()`, `lab()`, `color-mix()`, new layout) must be hand-implemented or it errors/renders wrong.

2. **Browser-rendered cloners (SVG `<foreignObject>`)** — `html-to-image`, `dom-to-image-more`, `modern-screenshot`, `@zumer/snapdom`. They clone the target subtree, copy each element's **computed styles** inline, embed images/fonts as data URLs, serialize to an SVG `<foreignObject>` data URI, and let the **browser itself** rasterize it onto a canvas. The browser is the CSS engine, so:
   - `oklch()` renders correctly wherever the host browser supports it (all evergreen browsers do).
   - **Cascade layers (`@layer`) are a non-issue**: computed styles are read *after* the cascade has been resolved, so layer ordering never reaches the capture library.
   - **`@property` / custom properties are a non-issue** for the same reason: `var()` chains and registered-property defaults are already resolved in the computed values that get inlined.

Empirical cross-check (2026-08-07): GitHub issue search for `oklch` returns **zero issues** in `bubkoo/html-to-image`, `zumerlab/snapdom`, `IDisposable/dom-to-image-more`, and `qq15725/modern-screenshot`, and zero `@layer` issues across all six trackers — while `niklasvh/html2canvas` has a string of open oklch failures (below). Absence of issues is weak evidence on its own, but combined with the architecture it is conclusive: foreignObject libraries don't parse color values at all.

### 1.2 Library-by-library

| Library | Latest (npm, 2026-08-07) | Approach | Tailwind v4 (oklch/@layer/@property) | 2x support | Maintenance |
|---|---|---|---|---|---|
| `@zumer/snapdom` | 2.23.2 (2026-08-04) | foreignObject clone | OK (browser-rendered) | `scale` + `dpr` options | Very active: repo created 2025-04, ~8.0k stars, pushed 2026-08-06, **2 open issues** |
| `html-to-image` | 1.11.13 (2025-04-19) | foreignObject clone | OK (browser-rendered) | `pixelRatio` option (defaults to devicePixelRatio) | Semi-maintained: 7.2k stars, last push 2026-05, **202 open issues** |
| `modern-screenshot` | 4.7.0 (2026-04-16) | foreignObject clone (fork of html-to-image) | OK (browser-rendered) | `scale` option | Maintained: 2.0k stars, last push 2026-04, 71 open issues |
| `dom-to-image-more` | 3.10.2 (2026-07-10) | foreignObject clone (maintained fork of dom-to-image) | OK (browser-rendered) | `scale` option | Maintained: 679 stars, last push 2026-07, 0 open issues |
| `html2canvas` | 1.4.1 (**2022-01-22**) | own CSS parser/renderer | **Fails hard on oklch** | `scale` option | Effectively dead: last push 2024-07, 1052 open issues, no release in 4.5 years |
| `html2canvas-pro` | 2.3.3 (2026-07-31) | own CSS parser/renderer (fork) | oklch/oklab/lab/lch/`color()` supported | `scale` option | Active: 542 stars, 0 open issues |
| `satori` | 0.29.0 (2026-07-23) | JSX → own layout engine (Yoga) → SVG | N/A — doesn't capture DOM | resolution is free (SVG) | Active (Vercel, 13.7k stars) |

**html2canvas** — disqualified. Throws `Attempting to parse an unsupported color function "oklch"` on any Tailwind v4 color. Tracked in [#3148](https://github.com/niklasvh/html2canvas/issues/3148) (Feb 2024), [#3150](https://github.com/niklasvh/html2canvas/issues/3150), [#3235](https://github.com/niklasvh/html2canvas/issues/3235) (explicitly about Tailwind 4's palette switch), [#3269](https://github.com/niklasvh/html2canvas/issues/3269) (Oct 2025, still open). A fix PR exists ([#3236](https://github.com/niklasvh/html2canvas/pull/3236), oklch→sRGB conversion) but the project has shipped nothing since 1.4.1 (Jan 2022), so it will not land.

**html2canvas-pro** ([yorickshan/html2canvas-pro](https://github.com/yorickshan/html2canvas-pro)) — the drop-in fork. Added `oklch()`/`oklab()`/`lab()`/`lch()`/`color()` in **v1.5.2 (2024-07-03)** per its CHANGELOG; a "Tailwind oklch sometimes downgraded to black" bug ([#134](https://github.com/yorickshan/html2canvas-pro/issues/134)) was fixed in **v1.6.2 (2025-12-23)**. Also adds `object-fit`, `clip-path`, `writing-mode`. It works with Tailwind v4 *today*, but it inherits html2canvas's fundamental posture: a hand-written CSS renderer that must chase the platform forever (e.g. `color-mix()`, container queries, future Tailwind output). Its rendering fidelity for anything exotic (filters, blend modes, masks) is historically the weak point of this family. Acceptable fallback, not the bet.

**html-to-image** ([bubkoo/html-to-image](https://github.com/bubkoo/html-to-image)) — the incumbent foreignObject library. `pixelRatio` gives clean 2x. Fonts: it parses `@font-face` rules out of `document.styleSheets`, downloads the font binaries, base64-inlines them (`preferredFontFormat` option to keep only e.g. woff2). README-documented limitations: tainted canvas content won't render, and **"rendering fails on extremely large DOMs due to data URI size limits"** (relevant if canvases get huge — mitigated in forks that use Blob URLs/workers). Its real problem is triage: 202 open issues, sporadic releases (last 2025-04), and a long tail of **Safari/iOS reliability issues** — blank or partially-blank captures: [#199](https://github.com/bubkoo/html-to-image/issues/199), [#361](https://github.com/bubkoo/html-to-image/issues/361), [#461](https://github.com/bubkoo/html-to-image/issues/461), [#488](https://github.com/bubkoo/html-to-image/issues/488). Root causes are WebKit foreignObject strictness and async image/font decode inside the SVG image; the common workaround (capture twice, keep the second) is folklore, not a fix.

**modern-screenshot** ([qq15725/modern-screenshot](https://github.com/qq15725/modern-screenshot)) — fork of html-to-image focused on speed: reusable capture `context` and **web-worker offloading** for repeated captures. `scale` option for 2x. Same foreignObject fundamentals (so same Tailwind v4 immunity, similar Safari caveats). Known TODO in README: CSS counters aren't cloned. Good choice when capturing every second (live thumbnails); less battle-tested for one-shot fidelity than snapdom's current pace.

**dom-to-image-more** ([IDisposable/dom-to-image-more](https://github.com/IDisposable/dom-to-image-more)) — the maintained continuation of the original dom-to-image. Actively released (3.10.2, 2026-07), clean tracker. Solid, but feature-wise a subset of what snapdom now does (no pseudo-element inlining pipeline, no icon-font handling, weaker perf story).

**SnapDOM** ([zumerlab/snapdom](https://github.com/zumerlab/snapdom), `@zumer/snapdom`) — the newest and currently strongest entry. Pipeline per its docs ([snapdom.dev/docs](https://snapdom.dev/docs/)): deep-clone with computed styles + Shadow DOM, inline `::before`/`::after` pseudo-elements and CSS `counter()`s, fetch images to data URLs, embed fonts, wrap in `<foreignObject>`, serialize to `data:image/svg+xml`, export to PNG/JPG/WebP/SVG/canvas/Blob. Directly relevant options: **`scale`** (output multiplier) *and* **`dpr`** (defaults to `devicePixelRatio`) — exactly the 2x knob we need; **`embedFonts`** (inlines `@font-face` so text renders with real fonts; off by default) and **`iconFonts`** (always embedded); `exclude`/filter hooks; plugin system with lifecycle hooks. README benchmarks claim large wins over html2canvas (~100–200x) and html-to-image (~5–10x) for typical views — benchmark methodology is the project's own **[unverified independently]**, but the architecture (no per-element re-render, lazy rasterization) makes "much faster on large DOMs" credible. Documented caveats: external images need CORS; WebP export falls back to PNG on Safari; Safari font decoding is slower; occasional `@font-face`-via-JS workaround needed. Momentum is exceptional: ~8k stars in ~16 months, near-daily pushes, 2 open issues.

**satori** ([vercel/satori](https://github.com/vercel/satori)) — wrong tool for this job. It does **not** capture live DOM: it takes pure/stateless JSX (or an HTML-ish structure via `satori-html`) and lays it out with Yoga (React-Native flexbox), supporting only a CSS subset (no `calc()`, no z-index, no grid; fonts must be supplied as ArrayBuffers). It would mean re-implementing the canvas renderer a second time in satori's dialect. Only interesting if we ever want deterministic server-less "OG-image" style exports divorced from the live DOM. oklch support in satori's parser: not confirmed either way **[unverified]**.

### 1.3 Cross-cutting gotchas for our stack

- **Web fonts must be same-origin (self-hosted).** Every foreignObject library reads `document.styleSheets[..].cssRules` to find `@font-face`; cross-origin stylesheets (e.g. Google Fonts `<link>`) throw `SecurityError` on `cssRules` access unless CORS-clean, and the font binaries themselves need CORS to fetch. Self-hosting WOFF2 in the SvelteKit static build sidesteps all of it — and we need the font bytes locally anyway for the HTML artifact (§2). Same-origin static assets also avoid canvas tainting.
- **2x and canvas limits.** `scale: 2` on a large canvas can exceed WebKit's canvas area limits (iOS Safari historically ~16.7M pixels; desktop browsers cap dimensions around 16k–65k px per side **[unverified exact current limits]**). A 4000×2500 canvas at 2x = 40M pixels — would fail on iOS. Clamp the effective scale from a max-pixel budget rather than hardcoding 2.
- **Safari is the fidelity risk, not Tailwind.** The known failure modes in this whole family are WebKit foreignObject quirks (blank first capture, missing images/fonts on first paint). SnapDOM ships Safari-specific handling (WebP fallback, font decode caveats documented); still, Safari must be in the manual test matrix for the export feature from day one.
- **getComputedStyle serializes some colors as `oklch(...)`/`color(srgb ...)` in modern browsers** — harmless for foreignObject libraries (the browser re-parses its own serialization) but another reason CSS-parsing libraries keep breaking **[mechanism verified by the html2canvas issue trail; exact per-browser serialization rules unverified]**.

---

## 2. Self-contained single-file HTML

### 2.1 Two viable strategies

**A. Serialize the live DOM + collected CSSOM.** Clone `document.documentElement` (or just the canvas subtree plus a minimal shell), walk `document.styleSheets`, concatenate `Array.from(sheet.cssRules).map(r => r.cssText)` into one `<style>`, inline resources, download via `Blob` + `URL.createObjectURL`. Constraints verified:
- `cssRules` is same-origin-gated (SecurityError on cross-origin sheets without CORS). In a static SvelteKit build the compiled Tailwind CSS is same-origin, so this works — but simpler still is `fetch(linkEl.href).then(r => r.text())`, which grabs the *authored* compiled CSS byte-for-byte and avoids CSSOM re-serialization quirks (older browsers re-serializing rules can drop or rewrite modern syntax) **[re-serialization quirks: known class of problem, specific current instances unverified]**.
- Svelte 5 / Vite may also inject `<style>` elements or `adoptedStyleSheets`; a serializer must collect those too (adopted sheets are invisible in `document.styleSheets`... they live on `document.adoptedStyleSheets`).
- This is the SingleFile model: [gildas-lormeau/SingleFile](https://github.com/gildas-lormeau/SingleFile) produces exactly this kind of artifact (styles inlined, unused rules removable, resources embedded) and its engine is extracted as a reusable library, [single-file-core](https://github.com/gildas-lormeau/single-file-core) (active, pushed 2026-07). Heavyweight for our case — it solves the *arbitrary hostile page* problem; we control our own page — but it is the proof that DOM+CSSOM serialization is robust in practice, and a reference implementation for edge cases.

**B. Dedicated template render (recommended).** Don't serialize the app's live DOM (which drags along SvelteKit hydration markers, event-wired attributes, editor chrome). Instead build the artifact deliberately:
1. Render the canvas content into a clean HTML string — either a dedicated Svelte component rendered into a detached element, or `canvasEl.cloneNode(true)` scrubbed of editor-only attributes.
2. Inline the **entire compiled Tailwind CSS** in one `<style>`. Tailwind v4's output is naturally self-contained for this: theme tokens are plain CSS custom properties on `:root` inside `@layer theme`, so shipping the whole sheet preserves `@layer` order, `@property` registrations, and all `var()` chains with zero processing. Obtain it at runtime via `fetch(document.querySelector('link[rel=stylesheet]').href)` (same-origin in a static build; cache the text once). Build-time alternative: Vite's `import css from '.../app.css?inline'` — whether `?inline` passes through the `@tailwindcss/vite` plugin's transform in the current version needs a 10-minute spike **[unverified]**; the runtime fetch is the safe default.
3. Since the artifact carries only the canvas markup, unused-CSS is bounded by the app's own utility footprint — a Tailwind v4 compiled sheet for one app is typically tens of KB; acceptable inline. (Optional later: run the artifact HTML through a client-side purge against the sheet — not needed for v1.)

### 2.2 Inlining WOFF2 fonts

Standard, well-supported pattern — a data URI inside `@font-face`:

```css
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 100 900;
  src: url(data:font/woff2;base64,d09GMgABA...) format("woff2");
}
```

Mechanics: `fetch('/fonts/inter.woff2')` → `arrayBuffer()` → base64 → splice the `@font-face` block into the inlined CSS, replacing the original `url(...)`. base64 costs ~33% size; a WOFF2 variable font of 40–100 KB becomes 55–135 KB of markup — fine for a single-file artifact.

**Prior art — Excalidraw** is the best in-class reference for client-side font embedding: their SVG export inlines fonts as data URIs, and PR [excalidraw/excalidraw#8384](https://github.com/excalidraw/excalidraw/pull/8384) ("subset font glyphs for SVG export") added fully client-side **glyph subsetting** using wasm builds of **harfbuzzjs** plus a WOFF2 encoder/decoder — embedding only the glyphs actually used, shrinking embedded fonts "up to 95%", with harfbuzz chosen specifically because naive subsetters break kerning (GPOS) and ligatures (GSUB). That's the upgrade path if artifact size ever matters; for v1, whole-font embedding of a self-hosted WOFF2 is simpler and correct. (Excalidraw's other trick — embedding the source scene JSON inside the exported file so it can be re-imported — is worth copying: put our canvas's source JSON in a `<script type="application/json">` block inside the HTML artifact, making the artifact double as a lossless save file **[Excalidraw's PNG/SVG scene-embedding known from their docs/source; not re-verified this pass]**.)

### 2.3 Assembly and download

Wrap in a minimal handwritten shell (`<!doctype html>`, `<meta charset>`, viewport, `<title>`, one `<style>`, body markup, optional embedded scene JSON), then:

```js
const blob = new Blob([html], { type: "text/html" });
// <a download="artifact.html" href={URL.createObjectURL(blob)}>, click, revoke.
```

No external requests remain: styles inlined, fonts data-URI'd, images either drawn client-side (data URIs) or must be converted the same way. The artifact renders identically offline in any modern browser (oklch/`@layer`/`@property` are browser features, not build features — the same evergreen-browser floor as the app itself).

---

## 3. Recommendation

**PNG: bet on SnapDOM (`@zumer/snapdom`).** foreignObject architecture makes Tailwind v4 (oklch, `@layer`, `@property`) a non-issue by construction; `scale`/`dpr` give first-class 2x; `embedFonts` covers self-hosted WOFF2; best performance posture for large DOMs; by far the healthiest maintenance signal (release 3 days ago, 2 open issues). Wrap it behind a tiny `exportPng(el, {scale})` module boundary.
- **Fallback 1:** `modern-screenshot` (same architecture, worker-based, drop-in behind our module boundary) or `html-to-image` (most battle-tested, slower triage).
- **Fallback 2 (different architecture):** `html2canvas-pro` ≥ 2.x — only if a WebKit foreignObject bug proves unfixable, accepting its CSS-reimplementation fidelity risks.
- **Rejected:** `html2canvas` (dead, oklch-broken: #3148/#3269), `satori` (not a DOM capture tool).

**HTML: dedicated template render (strategy B).** Clean markup + whole compiled Tailwind sheet fetched same-origin and inlined + WOFF2 as base64 data URIs + embedded scene JSON; Blob download. Fall back to live-DOM + `document.styleSheets` serialization only if a template render proves impractical; keep `single-file-core` as the reference implementation, not a dependency.

**Specific Tailwind v4 / stack risks to carry forward to ticket 007:**
1. Safari/iOS foreignObject flakiness — the dominant PNG risk; test Safari from the first spike, consider a capture-retry.
2. 2x pixel budget — clamp scale against canvas area limits (iOS ~16.7M px) instead of a fixed multiplier.
3. Fonts must be self-hosted same-origin — both export paths break on cross-origin font CDNs.
4. All images/assets on the canvas must be same-origin or data URIs (canvas tainting + CORS fetch in both PNG and HTML paths).
5. `?inline` import of Tailwind-compiled CSS via `@tailwindcss/vite` is unverified — default to runtime `fetch` of the built stylesheet.
6. If snapdom disappoints, the module boundary makes foreignObject-family swaps cheap; switching to html2canvas-pro is the only swap that changes fidelity semantics.

## Sources

- html2canvas oklch: https://github.com/niklasvh/html2canvas/issues/3148 · /issues/3150 · /issues/3235 · /issues/3269 · PR /pull/3236
- html2canvas-pro: https://github.com/yorickshan/html2canvas-pro (CHANGELOG: oklch in 1.5.2, 2024-07-03; Tailwind black-color fix #134 in 1.6.2, 2025-12-23; latest 2.3.3, 2026-07-31)
- html-to-image: https://github.com/bubkoo/html-to-image (README: foreignObject, pixelRatio, font embedding, large-DOM data-URI limit) · Safari issues #199, #361, #461, #488
- snapdom: https://github.com/zumerlab/snapdom · https://snapdom.dev/docs/ · npm `@zumer/snapdom` 2.23.2 (2026-08-04, MIT)
- modern-screenshot: https://github.com/qq15725/modern-screenshot (fork of html-to-image; worker/context reuse; css-counter TODO)
- dom-to-image-more: https://github.com/IDisposable/dom-to-image-more (3.10.2, 2026-07-10)
- satori: https://github.com/vercel/satori (JSX-only, Yoga layout, CSS subset, fonts as buffers)
- SingleFile: https://github.com/gildas-lormeau/SingleFile · https://github.com/gildas-lormeau/single-file-core
- Excalidraw font subsetting: https://github.com/excalidraw/excalidraw/pull/8384 · https://plus.excalidraw.com/blog/adding-hand-drawn-font-for-chinese-japanese-korean
- Cross-origin `cssRules` SecurityError: https://discourse.mozilla.org/t/webextensions-porting-access-to-cross-origin-document-stylesheets-cssrules/18359 (and CSSOM origin-clean flag)
- npm registry (`npm view`, 2026-08-07) for all version/date claims; `gh api` for repo activity/issue counts.
