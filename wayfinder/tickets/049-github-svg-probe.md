---
name: github-svg-probe
title: "Research: does a foreignObject SVG with an embedded font render on github.com?"
labels: [wayfinder:research]
status: closed
assignee: mitchell
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

## Resolution

Resolved 2026-08-13 by an AFK research pass. **Green: the font is not stripped.** The committed image does not degrade to PNG and Playwright stays out of the chain. Evidence — 63 files including every specimen fetched, both replay harnesses, per-engine screenshots and pixel diffs — in `.scratch/github-svg-probe/`.

Nothing was created, pushed or modified on GitHub; every interaction was a read-only GET.

### The gap the ticket named is closed by observation, not inference

The ticket's whole reason to exist was that valtio proves `foreignObject` and inline `<style>` survive github.com but carries **no font**. Three in-the-wild specimens close that: `cognesy/instructor-php`'s `instructor-packages.svg` (322,995 B, 32 `foreignObject` tags, a base64 `data:font` `@font-face`, referenced **relatively** from its README so camo is never in the path), `colinhacks/zod`'s `codecs-network-dark.svg` (301,654 B, 30 `foreignObject`, zero `<text>` — pure foreignObject plus embedded font), and `slowli/term-transcript`'s `embedded-font.svg`. Rendered against font-stripped copies of their own live bytes: **9 of 9 engine × file combinations apply the font.** These are larger than our 204,714-byte artifact and they render on github.com today.

### GitHub does not sanitize committed SVG files

Git blob SHA-1 of bytes returned by `raw.githubusercontent.com` equals the committed blob SHA from the Contents API on all ten files tested (7.5 KB → 323 KB). Decisively, two repos' `xss.svg` containing live `<script>alert()</script>` come back **untouched** under `image/svg+xml` — the serving path provably does not read the file. The `dominant-baseline` casualty of github/markup#1160 **cannot be reproduced today**: that file returns all 18 attributes intact and `?sanitize=true` is a no-op. The 2018-era sanitizer was real and no longer runs. Note this is *behavioural, not contractual* — no GitHub documentation states SVG files are served unsanitized, and it could change without notice.

### Our own artifact, under GitHub's real CSP

`order-fulfillment.bcc.svg` (204,714 B, 8 WOFF2 faces inlined, 1440×1292) renders in Chromium, WebKit and Firefox under the live header (`default-src 'none'; style-src 'unsafe-inline'; sandbox`, confirmed by curl) with all eight faces applied — pixel diff against the stripped control of 12.8% / 7.7% / 12.2% of frame, far past antialiasing noise, with line-wrapping changing too. Screenshots with and without the CSP header are **byte-identical**: the header is inert for SVG-in-`<img>`. The full README chain (`<img>` → 302 → raw, under github.com's own page CSP whose `font-src` excludes data:) also passes in all three with zero violations. Control validity: none of the three families is installed on this machine, so any difference is attributable to the embedded faces alone. The twelve-column grid holds — the `@container` tiers are inert because the export declares no container, as SPEC §9.2 intends.

### Three findings that constrain how the file is built

1. **A nested `<svg>` inside `<foreignObject>` does not render when the outer SVG is loaded through `<img>`.** Found by reading the render rather than the report, then isolated in `.scratch/helicopter/nested-svg-probe.mjs`: identical markup renders the glyph as inline HTML and drops it inside an `<img>`-loaded SVG, in all three engines. The icons are present in the bytes — 10 nested `kind__svg` elements survive into the file — and simply are not drawn. **This costs the collaborator kind entirely for a sighted reader**: `CanvasSheet.svelte:166-168` marks the icon `aria-hidden` and puts the label in an `sr-only` span, so the glyph is the only visual carrier of a closed four-value vocabulary (SPEC §4.2), and the footer legend's four key icons go with it. Screen-reader users are unaffected; readers of a committed SVG lose a whole axis of the canvas. **This is the one open question [committed-images](wayfinder/tickets/056-committed-images.md) inherits, and it is a fidelity decision, not a bug to route around.**
2. **Keep `xmlns="http://www.w3.org/2000/svg"`.** The blob view is a third path — an iframe to `viewscreen.githubusercontent.com/view/svg` — whose shipped JS carries a re-serialization branch that round-trips the SVG through an HTML parse and `innerHTML`. It is guarded on the root `xmlns` protocol: `http:` takes the original raw URL untouched, and the `https://` spelling drops into the mangling path. Ours is already correct; it is now a constraint rather than an accident.
3. **The raw URL is a genuinely different surface.** Opened directly, the SVG is a *top-level document*, `default-src 'none'` **is** enforced, and the data: fonts are **blocked** — explicit CSP errors in all three engines, with Firefox rendering byte-identically to the stripped control. README and blob view both use `<img>` and are unaffected. Same bytes, different rendering mode: worth documenting so a future reader who opens the raw file does not conclude the fonts are broken.

### One design input, and it is about scale not size

An `<img>`-loaded SVG scales geometrically rather than re-laying out. In GitHub's ~896px README column our 1440px artifact renders at **0.622 scale**, putting body text at 10.0 CSS px and the strategic-classification sub-labels at **5.7 px** — crisp at 2×, marginal at 1×. Authoring nearer 1100px would lift the smallest label back over 7px. [committed-images](wayfinder/tickets/056-committed-images.md) should decide this deliberately rather than inherit 1440 from SPEC §9.2's artifact width, which was chosen for a full-window document rather than a README column.

### What is left, and where it goes

Our exact file has not been through github.com. That is now confirmatory rather than load-bearing: the serving path is provably content-agnostic, the one content-sensitive step routes our file to the untouched branch, and larger `foreignObject`-plus-font specimens render live. The real-surface check is already leg 2 of [render-checkpoint](wayfinder/tickets/060-render-checkpoint.md), which is where it belongs — so it is not repeated as a manual step here. If a belt-and-braces look is wanted sooner: commit the SVG to a throwaway public repo, reference it with a **relative** `<img src>`, and check three things — the title in Archivo rather than Helvetica, the Ubiquitous Language line "The items to gather from the warehouse for one order." wrapping to **two** lines rather than one (binary, no colour judgement), and the grid not collapsing. Expected result is `csp-chromium-fonts.png`.

---

**Correction (from [committed-images](wayfinder/tickets/056-committed-images.md), 2026-08-13).** Constraint 1 of this resolution — *"a nested `<svg>` inside `<foreignObject>` does not render through `<img>`, in any engine"* — is wrong as written. The symptom was observed correctly; the cause was not. An `<svg>` renders fine there **provided it carries `xmlns="http://www.w3.org/2000/svg"`**: `foreignObject` content is XHTML, so an element with no namespace declaration inherits its parent's and an undeclared `<svg>` is an XHTML element rather than a drawing. `CanvasSheet.svelte:130` omits it. Probed in Chromium, Firefox and WebKit — `.scratch/committed-images/xmlns-probe-*.png`. The collaborator-kind glyphs are therefore not lost, and cost one attribute rather than a rewrite of `KIND_META`.

The other two constraints stand unchanged. Worth noting they are all three about namespaces and URLs, which is part of why the misdiagnosis read as plausible. One genuine finding survives from the same probe and is sharper than it looked: **no `data:` URI reference of any kind resolves** inside an `<img>`-loaded SVG — not `background-image`, not an HTML `<img>`, not `content:` — which is the same sandbox rule that forces the fonts to be embedded.
