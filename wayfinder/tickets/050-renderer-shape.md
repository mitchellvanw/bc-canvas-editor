---
name: renderer-shape
title: "Grilling: what shape is the headless renderer, and does it replace the browser export?"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
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

## Resolution

**One renderer, built once into a plain-JS module that every consumer imports — the CLI, the remark plugin, the VS Code extension and the editor's own Export HTML.** The identity the map's gate asks for stops being a property to test for and becomes one there is no way to violate.

### The evidence that decided it

Three measurements taken while grilling, all reproducible from `.scratch/ssr-verify/` and `.scratch/helicopter/`:

1. **SSR body vs. the client mount's `innerHTML`, normalized** (reference fixture). Svelte's scoped class hashes are *identical* on both sides (`svelte-18zyimi`), as are text, structure and every attribute present. The two disagree byte-wise in exactly three mechanical ways: hydration/anchor comments (each side emits its own flavour), entity escaping (`\xa0` server vs `&nbsp;` out of `innerHTML`), and **attribute order inside the one dynamic inline `<svg>`**, which the client DOM re-serializes with dynamically-set attributes last.
2. **The server-compiled sheet bundle is 43,512 bytes of plain JS with zero Node builtins** — its only external import is `clsx`. It runs unchanged in a browser.
3. **`stampIds` mints ids with `crypto.randomUUID()`, but zero `id=` attributes reach the rendered markup.** A committed `.bcc.svg` is byte-stable across runs today; nothing enforces it.

### The six decisions

**1. Replace the browser export — do not sit beside it.** The ticket framed "beside" as safe-if-tested. Measurement 1 says that test cannot exist: any test proving the two agree must be a *normalized*-DOM comparison that explicitly permits comment noise, entity noise and attribute reordering. That is a test which licenses drift rather than forbidding it — it can only ever prove "close enough", which is the one thing SPEC §9 exists to refuse. Replacing makes the comparison unnecessary rather than lenient.

One correction to the ticket's own framing, which holds either way: **two compiles of the sheet are unavoidable while PNG exists**, because snapdom rasterizes a live mount (`png.ts:41`). The choice was never "one renderer vs two". It is whether both compiles are ever allowed to emit shipped bytes someone could diff. Replace, and the client compile is only ever rasterized — never serialized.

What it buys: `collectAppCss()`'s runtime `fetch` against a live same-origin server disappears entirely, retiring SPEC §13's noted risk rather than working around it; `html.test.ts` sheds jsdom *and* its fetch mock; the artifact drops from ~446 KB toward ~204 KB before the `.woff` win and ~130 KB after both. What it costs: SPEC §9's *"the HTML artifact serializes that mount"* is no longer true and needs re-pointing — but *"pixel-identical"* stays true, since PNG still captures the mount.

**2. A core that returns parts, with thin named containers composed from it** — not one function with options, and not two named outputs. The consumers want three different *containers*, not three configurations: a full HTML document (`.bcc.html`), an SVG file (`.bcc.svg`), and **a fragment injected into someone else's page** (VS Code preview, remark). A fragment is not a document with options switched off — it must emit no `<html>`, and its CSS has to be safe to paste into a host it doesn't control. Options-on-one-function is how you arrive at `{ views: false, fonts: true, ground: false, wrap: 'svg' }`. Two named outputs is the same answer reached by increments: `renderSheet` would grow options to serve both the SVG and the fragment.

```
renderSheetParts(doc) → { markup, css }   the core
fontFaceCss()         → string            composable, never a flag
sheetDocument / sheetSvg                  file containers
artifactDocument(doc)                     the .bcc.html, built on the core
```

The artifact is built on the core deliberately, so the `.bcc.html` and the fence provably draw one sheet rather than being asserted to.

**3. `sr-only` moves into `CanvasSheet.svelte`'s own `<style>` block** — a third option neither of the ticket's two. Svelte scopes it to the sheet, it returns on SSR's `head` under `css: 'injected'`, and the renderer needs no preamble entry at all: the sheet becomes self-contained *by construction* rather than by a rule someone remembered to copy, which is the property this whole map rests on. Tailwind's global `sr-only` still exists for the editor's own uses; the two are identical declarations and never conflict. The `app.css` hoist was fine but still left the sheet depending on something outside itself; the renderer-preamble option was the two-definitions failure mode, and it fails silently and only for screen-reader users.

**4. Tokens are parsed out of `app.css`'s `@theme` block** — not extracted into a shared module. `contrast.test.ts` and `head.test.ts` already parse this exact block with this exact regex, so a third reader is the idiom rather than a new pattern; `@theme`'s body is already plain `--name: value;` declarations, so the compilation Tailwind performs is emitting them into `:root`, a one-line wrap. Extraction means either `app.css` importing generated CSS or the tokens living in TS with `app.css` as generated output — and `app.css` is currently the single most readable statement of this design system, the file `contrast.test.ts` points at when it says a failing pair shifts the token *"everywhere at once"*. Putting a generator in front of that is a real loss. Pinned by a test that the extraction finds all 26 properties the sheet reads, so a token added to `@theme` and never crossed fails loudly.

**5. The tokens land on the sheet's own wrapper element, never `:root`.** `:root{}` is what Tailwind does and what the probe script did, and it is hostile to the fragment case: a `bcc` fence in VS Code's preview would push `--color-paper`, `--color-ink`, `--font-sans` and 23 others onto the host document, where they would apply to the whole preview — `--font-sans` colliding with a host's own token is not hypothetical. Written onto the wrapper that already carries `paper-ground`, they cascade into the article and nowhere else, and work identically inside a full document — so the fragment and the document share one CSS string with no variant, and the option disappears rather than needing a default. Same reasoning as decision 3: containment made structural rather than remembered. The renderer lifts `@theme` *and* the `.paper-ground` rule out of `app.css`, as `headless-artifact.mjs` already does, and scopes both to its own class.

**6. Fonts are always inlined in the file containers, with no flag.** Measured: the 8 faces are 128,708 bytes raw, ~171.6 KB base64, against a ~31.8 KB sheet without them. Every container that produces a *file* has no choice — a `.bcc.svg` viewed through `<img>` on github.com is a sandbox where no external load survives ([github-svg-probe](wayfinder/tickets/049-github-svg-probe.md)'s in-the-wild specimens are 300+ KB for exactly this reason), and self-containment is the definition of the `.bcc.html`. The only container where it is genuinely open is the fragment, and there the question is not on/off but **de-duplication** — once per document rather than once per fence, since a VS Code preview re-renders on every keystroke and a README may carry several. Decision 2's shape already answers that without an option: `fontFaceCss()` is separate, so the file containers call it internally and the fragment consumers hoist it where they want. That choice belongs to [remark-plugin](wayfinder/tickets/057-remark-plugin.md) and [vscode-extension](wayfinder/tickets/058-vscode-extension.md), and it is expressible because the function is separate. The face list is derived from the `@import '@fontsource/…'` lines in `app.css`, files read from `node_modules`, so adding a weight to `app.css` cannot silently miss the renderer.

**7. It takes a `CanvasDoc`** — exactly what `mountArtifactSheet` takes today, so the editor path is unchanged and the renderer never owns parsing. Bytes would let the renderer own the refusal contract, which sounds attractive for the CLI, but it is wrong for the editor, which already holds a `CanvasDoc` and must never round-trip through serialize-and-reparse to draw itself; and the CLI must run `parseCanvasFile` itself anyway to produce SPEC §3.3's path-carrying refusal against a filename. Rider from measurement 3: pin determinism with a test that renders one doc twice and expects identical bytes, so the day someone writes `id={row.id}` into the sheet the committed-SVG contract fails loudly instead of producing a spurious diff on every `bcc render`.

**8. Home is `src/lib/render/`, built like `mcp/`.** A sibling of `artifact/`, inside the app, so every consumer reaches it through the `$lib` alias `mcp/tsconfig.json` already resolves — holding this map's *"`src/lib/model/` does not move"* line rather than opening a second seam. `artifact/html.ts` stays where it is and becomes `artifactDocument` calling into `render/`; the artifact's own View CSS, tab script and print pass have no reason to migrate.

The build is the half that is not free. Two payloads are environment-bound — the server-mode compile of `CanvasSheet.svelte`, and the tokens and fonts that come off disk — and `vite-plugin-svelte` derives `generate` from Vite's SSR flag (`src/utils/compile.js:59`), so one build cannot emit both a client-mode and a server-mode sheet for the same bundle. Its `dynamicCompileOptions` hook *can* override `generate`, but per filename, which is all-or-nothing across the app.

So the renderer gets its own build script producing one committed plain-JS module, and **every consumer imports that module, the editor included**. Measurement 2 is what makes this work: the same built file runs in Node and in the browser, so the map's byte-identity property is structural. Generating the token and font payload into that same module is what kills `collectAppCss()` outright. Follow `mcp/build.js`'s pattern exactly — committed output plus a staleness test that rebuilds to a scratch path and diffs the committed bytes, which is the thing that stops `CanvasSheet.svelte` moving without the renderer following. Known cost, identical to MCP's today: a dev editing the sheet sees the live editor update immediately and the export only after a rebuild, caught at `npm test`.

The alternative — a custom Vite plugin teaching the app build to compile `CanvasSheet` twice — buys a fresher module for one consumer and costs a bespoke resolver with no precedent in this repo.

### The `.woff` question

**It rides on the renderer; no separate commit.** The ticket called it independent of the six decisions above and it is not. The bug lives in `inlineFonts`, which exists only because the browser export *rewrites fontsource's compiled `src:` list*. A Node renderer does not rewrite that list — it **authors** the `@font-face` rules from the files on disk, as `.scratch/helicopter/headless-artifact.mjs` already does, and simply never writes a `.woff` entry. Confirmed on disk: fontsource ships both (`archivo-latin-500-normal.woff` 18,988 B beside its `.woff2` at 14,600 B) and names both in one `src:`. A separate commit against `html.ts` would be repairing code that is about to be deleted. Numbers for the record: the browser artifact is ~446 KB, the headless one measured 204,638 B, and roughly 202 KB of that gap is the legacy `.woff` payload alone.

### What dies, and what does not

Dead once [headless-renderer](wayfinder/tickets/054-headless-renderer.md) lands: `collectAppCss()`, `inlineFonts()`, `fetchAsset()`, and `html.test.ts`'s jsdom environment and fetch mock. **Not dead:** `offscreen.ts` and `mountArtifactSheet` — `png.ts` rasterizes a live subtree and keeps them.

### No CONTEXT.md entry, no ADR

Nothing user-facing gained a name here; the map already tracks **Fence** and **Render** as terms wanting entries, and those land with the tickets that create the surfaces ([fence-shape](wayfinder/tickets/052-fence-shape.md), [committed-images](wayfinder/tickets/056-committed-images.md)). And this repo's decision record *is* the wayfinder ticket — SPEC cites them by path (*"Full decision record: `wayfinder/tickets/007-artifact-design.md`"*), there is no `docs/adr/`, and adding one would give this decision two homes.
