---
name: renderer-shape
title: "Grilling: what shape is the headless renderer, and does it replace the browser export?"
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: []
---

## Question

The keystone. Every build ticket on this map calls this thing, so its shape decides theirs.

**What is established** (charting, 2026-08-13; probes in `.scratch/helicopter/`): `render(CanvasSheet, { props: { doc } })` from `svelte/server` produces the sheet in plain Node — 17,112 characters of body, no DOM, no jsdom, no browser. Compiled with `css: 'injected'` the component's own scoped CSS comes back on `head` (12.9 KB); with Vite's default `css: 'external'` it does not, and lands as a build asset instead. The sheet reads 26 custom properties, all from the single `@theme` block in `src/app.css`, and uses exactly one Tailwind utility: `sr-only`, eight times.

### The decisions

1. **Replace the browser export, or sit beside it?** Replacing halves the artifact (~446 KB → ~204 KB) and deletes a whole class of runtime dependency — `collectAppCss()`'s `fetch` against a live same-origin server, and the offscreen mount. But SSR emits hydration comments (`<!--[-->`, `<!--[-1-->`) that client `innerHTML` does not, so artifact bytes shift, and SPEC §9's *"pixel-identical"* claim plus the byte-identity tests would need re-pointing. Sitting beside it is safer and leaves **two renderers** — the one thing this codebase otherwise refuses to have, and the exact drift SPEC §9 exists to forbid. Note the map's gate makes identity a *condition*, not a nice-to-have, so "sit beside it" is only tenable with a test that proves the two agree.

2. **What does it emit?** The `.bcc.html` artifact carries all three Views, an embedded Canvas file, a print pass and a tab script (SPEC §9.1). A fence wants none of that — it wants the Sheet. Is the renderer's output one thing with options, or two named outputs (`artifact` and `sheet`)? A fence rendering all three Views would put the JSON dump in a README.

3. **Where does `sr-only` live?** The sheet depending on a Tailwind utility is the one thing making it non-self-contained. Move the rule into `src/app.css` as a real declaration so both surfaces share one definition — or keep it in the renderer's own preamble and accept two definitions of the same five lines. The first is cheaper forever and removes the sheet's last Tailwind dependency; it also touches a file `contrast.test.ts` and `head.test.ts` already parse.

4. **How do the tokens cross?** The `@theme` block is Tailwind syntax compiled by Tailwind. A Node renderer needs them as a plain `:root{}`. Re-emit by parsing `app.css` (a third reader beside the two tests that already do it — idiomatic here), or extract them into a shared module both Tailwind and the renderer read. The second is cleaner and is the larger change.

5. **Fonts: inlined, optional, or never?** 204 KB with, 31.8 KB without. ([vscode-preview-spike](wayfinder/tickets/053-vscode-preview-spike.md) reports no bad news here: VS Code's preview does not force a system stack, and the `data:`-URI embedding the artifact already does works unchanged — which argues for one CSS-plus-font payload serving every surface rather than a per-surface variant.) A fence's SVG wants them (no external font loads survive an `<img>` sandbox); a local HTML preview may not. If this is a flag, what is the default?

6. **Where does it live, and what is its API?** It is called by the CLI, the remark plugin and the VS Code extension. `src/lib/render/`? A sibling of `artifact/`? And does it take a `CanvasFile`, a `CanvasDoc`, or the bytes?

### The free win to fold in or explicitly defer

`html.ts:314` claims *"Only WOFF2 ever appears"* and matches `.woff` too as a safety net. It is not a safety net — fontsource emits both in one `src:` list, so the compiled CSS carries 8 `.woff2` **and** 8 `.woff` URLs and every artifact base64s all sixteen. That is 151,776 bytes raw / 202,368 encoded of legacy fallback no WOFF2-capable browser will request — 54% of the font payload, and the fonts are 84% of a 446 KB artifact. Dropping the `.woff` entries from the `src:` list (not merely skipping their inlining, which would leave a dead relative URL — the reason the current code matches them at all) roughly halves the shipped artifact. It is independent of every decision above; decide here whether it lands with the renderer or as its own commit.

Done when the six decisions are settled with reasons, the `.woff` question has an answer either way, and [headless-renderer](wayfinder/tickets/054-headless-renderer.md) has a shape to build to.
