# Research: can the docs page's section marker be expressed in CSS alone?

Ticket: [docs-css-section-marker](wayfinder/tickets/067-docs-css-section-marker.md), on [map-docs-page](wayfinder/map-docs-page.md).
Researched: 2026-08-15, against primary sources (the W3C/CSSWG **Scroll-driven Animations Module Level 1** Editor's Draft of 14 May 2026, **Selectors Level 4** ED of 30 July 2026, **WAI-ARIA 1.2** REC of 06 June 2023, **Core-AAM 1.2** CRD of 05 August 2026, **WCAG 2.2** Understanding docs, WebKit's own Safari release posts and Safari Technology Preview release notes, `mdn/browser-compat-data` at `main`, Bugzilla, Mozilla's own `product-details` service, and Tailwind's own v4.3 docs) **plus measured probes of both browser engines installed on this machine and of this repo's own built `/docs` page** (§4). Every external claim carries a URL; every repo claim carries `path:line`. Claims not confirmed against a primary source are marked **[unverified]**; claims that are reasoning rather than sourcing are marked **[inferred]**.

Context: the section marker is the sticky nav bolding whichever of the eight sections is under a notional reading line. It is the docs page's only runtime JavaScript. Charting already decided it is **droppable** and that `csr = false` is not hostage to it (`wayfinder/map-docs-page.md:19`); this note is the marker's chance to survive, not a precondition for anything.

**The short answer:** yes, CSS can express both *visual* halves of the marker, and it does so at essentially full fidelity in both engines this project verifies against — measured on the real built page at **88/88** scroll samples in Chrome 151 and **87/88** in WebKit 26.5. It cannot express the third effect, `aria-current`, at all, and that is not a gap in the technique but a category boundary. The cost is **41 lines / 2,664 bytes of hand-written CSS** against 14 lines / 490 bytes of JavaScript, it cannot be written in Tailwind, and it lands in whatever [stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md) decides — where every one of its selectors will need `:global()`.

---

## 1. The marker, stated precisely — three effects, and only two are visual

From `web/src/routes/docs/+page.svelte`:

| # | Effect | Where | Kind |
|---|---|---|---|
| E1 | the legend dot gets `lg:scale-125` | `:130` | style |
| E2 | the label gets `lg:text-ink` instead of `text-ink-soft` | `:131` | style |
| E3 | the link gets `aria-current="true"` | `:127` | **DOM attribute** |

All three are driven by one `let active = $state('editor')` (`:36`) set by one `IntersectionObserver` with `rootMargin: '-8% 0px -78% 0px'` over `section[id]` (`:37–48`), attached as a Svelte action to the `<div class="docs">` that holds the eight sections (`:138`). The eight `<section id=…>` are at `:140,202,244,291,340,381,455,496`.

Two facts about the marker that bound everything below:

- **It is already desktop-only.** E1 and E2 are both `lg:`-gated, and the nav is only sticky at `lg:` (`:118` — `lg:sticky lg:top-8 lg:self-start`). Below `lg` the nav is a wrapped row of pills at the top of the page (`:122`, `max-lg:flex max-lg:flex-wrap`), scrolled past and never seen again. E3 is *not* gated — it is set at every width — but on a nav that has scrolled out of view.
- **`active` opens on a seeded default, not an observation.** `$state('editor')` (`:36`) means the first entry is marked before the observer has said anything. This turns out to matter (§4.3).

The nav itself has **no CSS of its own**. Every rule in the page's 173-line `<style>` block (`:607–778`) is a `.docs …` prose or furniture rule; the nav is entirely Tailwind utilities. So "a block of CSS living beside the nav's own styles" — the bar charting set — is a block of CSS beside *nothing*. It would be the first nav CSS on the page.

---

## 2. Can CSS express it at all?

### 2.1 The mechanism

The shape the ticket names is right, and it is the only shape in CSS that does this. A **named view progress timeline** is declared on each `<section>`; the nav link runs a CSS animation on that timeline. That drives a *nav link's* style from a *section's* scroll position, which is the whole trick.

The spec defines the two timeline kinds it needs ([scroll-animations-1 §1](https://drafts.csswg.org/scroll-animations-1/), ED 14 May 2026):

> There are two types of scroll-driven timelines: Scroll Progress Timelines, which are linked to the scroll progress of a particular scroll container; View Progress Timelines, which are linked to the view progress of a particular box through a scrollport

A view timeline is the right one: the question "which section is under the reading line" is a question about a *box* moving through the scrollport, not about the scroller's overall progress.

The properties, with their spec grammar, all from the same ED:

| Property | Value | Initial |
|---|---|---|
| `view-timeline-name` | `[ none \| <dashed-ident> ]#` | `none` |
| `view-timeline-axis` | `[ block \| inline \| x \| y ]#` | `block` |
| `view-timeline-inset` | `[ [ auto \| <length-percentage> ]{1,2} ]#` | `auto` |
| `view-timeline` (shorthand) | `[ <'view-timeline-name'> [ <'view-timeline-axis'> \|\| <'view-timeline-inset'> ]? ]#` | — |
| `timeline-scope` | `none \| all \| <dashed-ident>#` | `none` |

Note the shorthand: `view-timeline` resets **all three** longhands including `inset`. That is a live footgun — writing `#editor { view-timeline: --s-editor block }` after a `section { view-timeline-inset: … }` silently throws the inset away. Measured directly: both engines reported `viewTimelineInset: "auto"` under the shorthand form and `"8% 78%"` under longhands (`.scratch`-equivalent probe, §4.2).

`view-timeline-inset` is the direct analogue of the observer's `rootMargin`: it "Adjusts the scrollport when determining the view visibility range". `rootMargin: '-8% 0px -78% 0px'` becomes `view-timeline-inset: 8% 78%` — the same 8%-to-22%-of-viewport reading band, expressed as an inset rather than a negative margin.

### 2.2 `timeline-scope` — and the one thing the spec now says that no shipping engine does

The spec's §4.2 *Named Timeline Scoping and Lookup* opens by saying timeline names are already global:

> Timeline names are global by default: An element referring to a named scroll progress timeline or view progress timeline can find a target timeline defined on itself, defined on an element before itself in tree order, or defined on an element after itself in tree order.
>
> The target timeline for a given element `element` referencing a timeline name `name` is: If `element` defines a timeline matching `name`, That timeline. Otherwise, if `name` is scoped by `element`, or if `element` is the document element, The last defined timeline matching `name` among `element`'s flat tree descendants in flat tree order, or, if no such timeline exists, an inactive timeline. Otherwise, The target timeline for `element`'s flat tree parent referencing `name`.

Read literally, that makes `timeline-scope` **unnecessary** for a page-level table of contents: the recursion reaches the document element, which by that clause searches all its descendants. This is new — the spec's own Changes list records it: "Changed named timeline lookup to nearest-ancestor/last-in-tree-order. ([Issue 12581](https://github.com/w3c/csswg-drafts/issues/12581)), ([Issue 13364](https://github.com/w3c/csswg-drafts/issues/13364))", listed among changes since the 28 April 2023 Working Draft.

**Neither shipping engine does this.** Measured (§4.2, probe A): with the `timeline-scope` declaration removed and nothing else changed, **not one nav link lights, at any scroll position, in either WebKit 26.5 or Chrome 151**. So `timeline-scope` is load-bearing in practice exactly as the ticket predicted, even though the current spec text says it should not be. Anyone writing this CSS must write the `timeline-scope` line and must not be talked out of it by §4.2's first sentence.

For the declaration itself, `timeline-scope` is defined in the spec's **Appendix B** (which carries the note "this section should move to CSS-ANIMATIONS-2" — i.e. it is the least settled part of the module):

> `<dashed-ident>` — Specifies that a matching timeline name defined by this element or its flat tree descendants — whose scope is not already limited by a descendant using `timeline-scope` — to be in scope only for this element's flat tree descendants; and limits descendants to only match timeline names to elements within this subtree.

**It must go on a common ancestor**, and the docs page has one ready: `<nav aria-label="On this page">` (`:118`) and `<div class="docs">` (`:138`) are siblings inside the grid `<div class="mt-14 lg:grid …">` (`:117`). Confirmed against the built page: that div is the nav's `parentElement` and the nav is its `firstElementChild`.

**On multiple elements claiming the same name in one scope**, the spec is now explicit and the two engines disagree with each other. Spec:

> An element may only define one timeline per name: In case of a name conflict, names declared later in the naming property (`scroll-timeline-name`, `view-timeline-name`) take precedence, and scroll progress timelines take precedence over view progress timelines.

and, for the cross-element case, the lookup rule above — "The last defined timeline matching `name` among `element`'s flat tree descendants in flat tree order". The spec's own example spells out the consequence: "Both instances of `animation-timeline:--t` will target the same timeline, i.e. the last one seen in flat tree order, globally."

MDN still documents the *older* rule — "If no timeline (or more than one timeline) exists with the name given, an inactive timeline with the specified name is created" ([MDN `timeline-scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/timeline-scope)) — and that older rule is what Chrome 151 implements. Measured (§4.2, probe C), with `#fence` renamed to claim `--s-cli` alongside `#cli`:

- **WebKit 26.5**: the `cli` link followed the *last* `--s-cli` in tree order (i.e. `#fence`'s) — the new spec rule.
- **Chrome 151**: the `cli` link went dead across the whole conflicted stretch — the old "more than one ⇒ inactive timeline" rule.

WebKit is still moving here: [Safari Technology Preview 249](https://webkit.org/blog/18182/release-notes-for-safari-technology-preview-249/) (29 July 2026) lists "Fixed an issue where `animation-timeline` did not use the last matching timeline when it matched multiple timelines" and "Fixed an issue where `animation-timeline` could match a timeline outside the nearest `timeline-scope` element with that name". Both are post-26.5. This is a corner of CSS whose *semantics* are still landing, not just its implementations.

None of it bites this page as written — eight sections, eight distinct names, one scope — but it is the reason not to reach for cleverness here.

### 2.3 Discrete, not continuous — and the property that makes it so

The marker needs a binary "this one is active", not a fade. That is expressible, and cleanly, without `steps()` or any timing-function trickery:

- write keyframes whose **only** keyframe is `from, to { … }`, so there is nothing to interpolate between; and
- set **`animation-fill-mode: none`**, so that outside the animation's range — in the before-phase and after-phase of the timeline — the animation contributes nothing at all and the link falls back to its resting style.

The result is a two-state property: in range ⇒ the keyframe value, out of range ⇒ no declaration at all. Measured to behave exactly that way in both engines (§4). And measured as a *snap*, not a ramp: sampling the dot's computed `scale` every 25 ms across a boundary crossing gives `none` → `1.25` with no intermediate value in either engine. Today's dot eases, because `transition-transform` (`:130`) is on the element and the JS changes a class; a transition does not observe a value produced by an animation. That is a small, real visual difference and it is in §6.

`animation-fill-mode` has one more use here. The page opens with the reader above the first section's reading band, so nothing would be marked until they scrolled — where today's seeded `$state('editor')` marks the first entry immediately. Setting **`animation-fill-mode: backwards` on the first link only** fills the before-phase (and only the before-phase) with the first keyframe, reproducing the seed. Measured: it closes exactly the three top-of-page samples that otherwise disagreed (§4.3).

### 2.4 `aria-current` — CSS cannot, and this changes what "saved in CSS" means

Stated plainly, because the ticket asks for it plainly: **no. CSS styles; it does not set attributes.** There is no CSS property, function or at-rule that writes a DOM attribute, and this is not an oversight to be worked around — it is what CSS is. `attr()` reads an attribute into a value; nothing reads a value into an attribute. Selectors match on attributes (`[href='#cli']`); they do not assign them.

The consequence is specific rather than abstract, and it runs through the accessibility mapping specs. WAI-ARIA states and properties are **markup**: [Core-AAM 1.2](https://www.w3.org/TR/core-aam-1.2/) (Candidate Recommendation Draft, 05 August 2026) maps `aria-current` with a non-`false` value to `STATE_SYSTEM_SELECTED` (MSAA + IAccessible2), to `AriaProperties: current={value}` (UIA), and to `STATE_SELECTED` (ATK/AT-SPI). It defines no mapping from any CSS property to `aria-current`, and nothing in it derives ARIA state from computed style.

So the honest framing of this whole ticket is: **a CSS marker is a two-thirds marker.** E1 and E2 survive; E3 does not. "Saved in CSS" means "the sighted desktop reader keeps the affordance, and the assistive-technology reader loses it" — which, as §6 argues, may be the *larger* of the two losses, and is one this ticket cannot avoid by trying harder.

### 2.5 `:target` is not an answer

For completeness, in the one or two lines it deserves. [Selectors Level 4](https://drafts.csswg.org/selectors-4/#the-target-pseudo) (ED, 30 July 2026), §8.3: "The `:target` pseudo-class matches the document's target elements… If the document's URL has no fragment identifier, then the document has no target elements." The target element is determined by the URL fragment — i.e. by the reader having *clicked* a nav link or arrived on a deep link. It never changes on scroll, and on a page opened at `/docs` with no fragment it never matches at all. It answers a different question.

---

## 3. Does it hold in WebKit?

### 3.1 First: what has this project actually committed to?

**Nothing explicit.** There is no browser support matrix anywhere in this repo — no `browserslist` key in any `package.json`, no `.browserslistrc`, no `build.target` / `build.cssTarget` / `esbuild.target` in `web/vite.config.ts`, and no "supported browsers" sentence in `SPEC.md`, `README.md`, `CONTEXT.md` or any ticket. Firefox/Gecko is **never mentioned anywhere in the repo**. What exists instead is a set of implied floors and an established verification habit:

| Fact | Source |
|---|---|
| Mobile/tablet **editing** is out of scope; desktop-first | `SPEC.md:30`, `SPEC.md:200` |
| "There is no position in Safari, **which is where this app is developed and a large share of where it runs**" | `wayfinder/tickets/044-json-refusal-copy.md:51` |
| Safari/iOS `foreignObject` capture named "the dominant known risk" and the first implementation checkpoint | `SPEC.md:506` |
| A WebKit-correctness constraint baked into the sheet's CSS ("No positioned boxes, no stacking contexts") | `SPEC.md:359`; `wayfinder/tickets/063-webkit-svg-stacks.md` |
| The standing habit: "Do this in WebKit as well as Chromium — the WebKit checkpoint habit exists because this project has been bitten there before, and Playwright WebKit is the route (Safari's own automation is admin-gated on this machine)." | `wayfinder/tickets/048-views-checkpoint.md:20` |
| `bcc render --svg` drives the **already-installed desktop Chrome** (`channel: 'chrome'`), never a downloaded one | `cli/src/measure.ts:12,81` |
| No test in the suite launches a browser; CI names none | `.github/workflows/ci.yml` |
| CSS floor already implied by shipped code: `@container` and `color-mix()` in the sheet | `web/src/lib/sheet/CanvasSheet.svelte:663,1141,1156,1177` |

So the honest matrix is: **evergreen WebKit/Safari and evergreen Chromium/Chrome are verified; Firefox is unmentioned, untested and unverified.** That is a description of the repo, not a decision — and this ticket should not invent one. **[inferred]**

### 3.2 The versions, pinned

Support did **not** land as one feature, and the pieces differ. All figures from `mdn/browser-compat-data` at `main`, checked 2026-08-15:

| Property | Chrome | Safari | Safari iOS | Firefox |
|---|---|---|---|---|
| `animation-timeline` (incl. `auto`, `none`, `scroll()`, `view()`) | **115** | **26** | mirrors Safari | `preview` |
| `view-timeline-name` | **115** | **26** | mirrors Safari | `preview` |
| `timeline-scope` | **116** | **26** | mirrors Safari | `preview` |

Two footnotes that matter. First, `timeline-scope` landed in Chrome **one version after** the rest, which is the shape the ticket anticipated — the pieces are separable and `timeline-scope` is the laggard. Second, BCD records that Chrome **removed the `all` value in 138**; the `<dashed-ident>` form this proposal uses is unaffected, but `timeline-scope: all` is not a thing to reach for.

**Safari.** [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) (released 15 September 2025) announces the feature — "Scroll-driven animations lets you tie CSS animations to either the timeline of just how far the user has scrolled, or to how far particular content has moved through the viewport, in and out of view" — and names `animation-range`, `animation-range-start`, `animation-range-end` and `animation-timeline`. It does **not** name `view-timeline`, `scroll-timeline` or `timeline-scope`; nor does WebKit's own first-party tutorial, [A guide to Scroll-driven Animations with just CSS](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/) (20 June 2025, Saron Yitbarek), which covers only the anonymous `scroll()` and `view()` forms. WebKit's published prose has never documented the cross-element named-timeline trick. That is a documentation gap, not an implementation one — §4 settles it by measurement.

Since then, in WebKit's own release notes: Safari 26.4 added **Threaded Scroll-driven Animations** ([STP 234](https://webkit.org/blog/17674/release-notes-for-safari-technology-preview-234/), 19 December 2025 — "eligible scroll-driven animations are updated as their associated timeline's source element is scrolled instead of when the page rendering is updated"), and [Safari 26.5](https://webkit.org/blog/17938/webkit-features-for-safari-26-5/) (11 May 2026 — the version on this machine) shipped four scroll-driven fixes: "Scroll-driven animations are a powerful recent addition to CSS, and this release includes four fixes that improve their reliability", specifically the `scroll` timeline range name, `animation-play-state: paused`, "view timeline animations near the 0% and 100% thresholds reported incorrect progress values", and "animation timelines could fail to restore correctly after navigating back to a page from the back-forward cache". The 0%/100% one is directly load-bearing for this technique, whose whole design is about what happens at range edges — and it is fixed in exactly the version this machine runs, not before it.

**Firefox: no.** Not partially, not behind a shipped flag — `timeline-scope` is **not implemented at all**. [Bug 1823500 "\[scroll-animations\] Support `timeline-scope`"](https://bugzilla.mozilla.org/show_bug.cgi?id=1823500) is **NEW**, unassigned, no target milestone; [bug 1849775](https://bugzilla.mozilla.org/show_bug.cgi?id=1849775) was closed as a duplicate of it. The rest of scroll-driven animations is Nightly-only behind `layout.css.scroll-driven-animations.enabled`, enabled by default on **Nightly from 136** and disabled on Developer Edition, Beta and Release ([MDN Experimental features in Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features)). As of 2026-08-15 Firefox stable is **153.0.4** (released 2026-08-14) and Nightly is **156.0a1**, from Mozilla's own [`firefox_versions.json`](https://product-details.mozilla.org/1.0/firefox_versions.json). So even the Firefox that *does* have scroll-driven animations does not have the property this technique cannot work without.

**Baseline.** MDN's `timeline-scope` page carries the banner: "**Limited availability** — This feature is not Baseline because it does not work in some of the most widely-used browsers."

### 3.3 caniuse does not track this

The ticket asks for caniuse alongside the WebKit sources. Worth recording what that turns up: **caniuse has no feature entry for scroll-driven animations.** Enumerating `Fyrd/caniuse` `features-json/` at `main` returns no file matching `timeline` or `scroll-driven`; the nearest entries are `css-animation.json`, `css-scroll-behavior.json` and `web-animation.json`. What caniuse.com *shows* when you search for these properties is its MDN BCD passthrough (`mdn-css_properties_timeline-scope` and friends) — the same data as §3.2, not an independent source. The `web-features` (Baseline) entry `scroll-driven-animations` exists and names the spec, but the copy fetched carried no `status` block. So on this feature there is exactly one compat dataset, MDN's, and one better source: driving the engines.

### 3.4 Measured: what each installed engine says it supports

Engines, identified by their own `browser.version()` and UA string:

| Engine | Version | UA | Provenance |
|---|---|---|---|
| WebKit | **26.5** | `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15` | Playwright's bundled WebKit (`~/Library/Caches/ms-playwright/webkit-2336`), driven via `playwright-core@1.62.1` |
| Chrome | **151.0.7922.138** | `…HeadlessChrome/151.0.0.0 Safari/537.36` | the machine's installed Chrome, via `channel: 'chrome'` — the repo's own pattern (`cli/src/measure.ts:81`) |
| Firefox | — | — | **not installed.** The Playwright cache holds only `ffmpeg-1011`, `webkit-2227`, `webkit-2336`, and `playwright-core` downloads no browsers by design (`cli/src/measure.ts:12`) |

`CSS.supports()` over the whole property set, in both the two-argument and `@supports` at-rule forms, returned **`true` for every one** in both WebKit 26.5 and Chrome 151: `animation-timeline` (with `scroll()`, `view()`, `--x`, `none`), `animation-range`, `animation-range-start`, `scroll-timeline-name`, `scroll-timeline-axis`, `scroll-timeline`, `view-timeline-name`, `view-timeline-axis`, `view-timeline-inset`, `view-timeline`, and **`timeline-scope`** (both `--x` and `none`). Both engines expose `animationTimeline`, `viewTimelineName`, `timelineScope` and `scrollTimelineName` on `getComputedStyle`, and both expose the `ScrollTimeline` and `ViewTimeline` constructors.

`CSS.supports()` is a parse-level check and can lie about behaviour, which is why §4 exists.

---

## 4. Measured: the proposal, driven through both engines

Three probes, all in the session scratchpad; nothing was added to the repo but this file.

### 4.1 A synthetic page

Eight contiguous 140vh sections, a sticky nav of eight links, the CSS of §5.1, and **no `<script>` in the document at all**. Scrolled in steps; at each step, the set of links whose computed style showed the active value was read back.

Both engines: the correct single link is marked across the whole scroll, tracking the reading band. With `view-timeline-inset` omitted (or silently reset by the `view-timeline` shorthand), two adjacent links are lit for most of the scroll — the band becomes the whole viewport and adjacent sections overlap it constantly. With `view-timeline-inset: 8% 78%`, that collapses to one.

### 4.2 Four variants

| Probe | Question | WebKit 26.5 | Chrome 151 |
|---|---|---|---|
| **A** | no `timeline-scope` at all | **nothing lights, ever** | **nothing lights, ever** |
| **B** | `timeline-scope` on the common ancestor | works | works |
| **C** | two sections claiming the same name in one scope | last-in-tree-order wins (new spec rule) | the timeline goes **inactive** (old rule) |
| **D** | `prefers-reduced-motion: reduce` on the context | **no effect** | **no effect** |

A is the crux result and it is the ticket's own prediction confirmed: without `timeline-scope` the cross-DOM trick does not work at all, in either engine, regardless of what §4.2 of the spec now says. C is in §2.2. D deserves a note: the technique *names* an `animation`, and `SPEC.md:305` says "All animation (fades, undo highlight-flash, scroll-to-target) honors `prefers-reduced-motion` by swapping animation for instant state change." A scroll-driven marker with `from, to` keyframes and `fill-mode: none` **is** an instant state change — there is no motion to swap out — so it satisfies the rule as written without a media query. But a reader of the CSS will see `@keyframes` and go looking for one, and any future blanket reset of the shape `@media (prefers-reduced-motion: reduce) { * { animation: none !important } }` would silently delete the marker. **[inferred]**

### 4.3 The real built `/docs` page, against the real observer

The strongest evidence available: `build/docs.html` served over HTTP, in both engines, at 1280×900.

- **Ground truth**: the page as it ships, JavaScript on. At each scroll step, which link carries `aria-current="true"` — i.e. what the `IntersectionObserver` decided.
- **Candidate**: the same page with the app's `*.js` requests aborted, so SvelteKit never hydrates and the observer never runs (the stylesheet still loads, so the page is byte-for-byte the same height, 9,617 px in WebKit / 9,638 px in Chrome, in both runs). The §5.1 CSS is injected as one `<style>`. At each scroll step, which link the CSS marks.

Sampled every 100 px over the full scroll, 88 samples per engine:

| Engine | Agreement | Two lit | None lit | Wrong one lit |
|---|---|---|---|---|
| **Chrome 151.0.7922.138** | **88 / 88** | 0 | 0 | 0 |
| **WebKit 26.5** | **87 / 88** | 1 | 0 | 0 |

The single WebKit divergence is at `y = 6400`, the `remark`→`vscode` boundary, where the CSS lights both for one sample and the observer lights one. It is a boundary artefact, not a wrong answer: at a section boundary two sections genuinely overlap the reading band, and the observer resolves the tie by last-write-wins in its callback loop (`:41` — `if (entry.isIntersecting) active = entry.target.id`) while the CSS has no tie-break to offer. WAI-ARIA's own guidance points the same way — "Authors SHOULD only mark one element in a set of elements as current" — though since the CSS marker sets no `aria-current` at all, this is a visual nicety, not a conformance question.

Before `animation-fill-mode: backwards` was added to the first link, the same run scored 84/88 (WebKit) and 85/88 (Chrome), the three extra misses all being the top-of-page samples where the CSS marked nothing and the seeded `$state('editor')` marked the first entry. One declaration closed them.

**One authoring trap, found by it not working.** `animation` is a shorthand and resets `animation-timeline` to `auto`. If the per-link `animation-timeline` rules are not *at least as specific as* — and after — the rules that set `animation`, every link silently computes `animation-timeline: auto` and nothing happens anywhere. This is exactly what the first draft of §5.1 did, and the failure is invisible: the CSS parses, the properties compute, `getComputedStyle(link).animationTimeline` reads `auto`, and no error appears anywhere.

---

## 5. Is it one self-contained rule set?

### 5.1 The CSS, in full

Written against the page exactly as it stands today; **no template change at all**, since `nav[aria-label='On this page']` (`:118`), the eight ids and `.docs` (`:138`) are all already there. This is the text that was measured in §4.3, character for character.

```css
/* The section marker, in CSS. Desktop only, matching today's `lg:` gate. */
@media (min-width: 64rem) {
	/* The nav and the prose are siblings, so their common parent puts the eight
	   timeline names in scope for the nav (scroll-animations-1, Appendix B). */
	div:has(> nav[aria-label='On this page']) {
		timeline-scope: --s-editor, --s-canvas-file, --s-exports, --s-cli, --s-fence, --s-remark, --s-vscode, --s-mcp;
	}

	/* Each section publishes a view timeline, its scrollport inset to the same
	   reading band the observer used (rootMargin '-8% 0px -78% 0px'). */
	.docs section { view-timeline-axis: block; view-timeline-inset: 8% 78%; }
	#editor { view-timeline-name: --s-editor; }
	#canvas-file { view-timeline-name: --s-canvas-file; }
	#exports { view-timeline-name: --s-exports; }
	#cli { view-timeline-name: --s-cli; }
	#fence { view-timeline-name: --s-fence; }
	#remark { view-timeline-name: --s-remark; }
	#vscode { view-timeline-name: --s-vscode; }
	#mcp { view-timeline-name: --s-mcp; }

	/* Two one-value keyframe pairs. `animation-fill-mode: none` is what makes
	   this a state and not a fade: outside the range the animation has no
	   effect at all, so the link falls back to its resting style. */
	@keyframes marker-dot { from, to { scale: 1.25; } }
	@keyframes marker-label { from, to { color: var(--color-ink); } }
	nav[aria-label='On this page'] a > span:first-child { animation: marker-dot auto linear; animation-fill-mode: none; }
	nav[aria-label='On this page'] a > span:last-child { animation: marker-label auto linear; animation-fill-mode: none; }

	/* Each link's pair reads its own section's timeline. These selectors must
	   be at least as specific as the two above and come after them: `animation`
	   is a shorthand and resets `animation-timeline` to `auto`. `backwards` on
	   the first link fills the before-phase only, so the page opens marked. */
	nav[aria-label='On this page'] a[href='#editor'] > span { animation-timeline: --s-editor; animation-fill-mode: backwards; }
	nav[aria-label='On this page'] a[href='#canvas-file'] > span { animation-timeline: --s-canvas-file; }
	nav[aria-label='On this page'] a[href='#exports'] > span { animation-timeline: --s-exports; }
	nav[aria-label='On this page'] a[href='#cli'] > span { animation-timeline: --s-cli; }
	nav[aria-label='On this page'] a[href='#fence'] > span { animation-timeline: --s-fence; }
	nav[aria-label='On this page'] a[href='#remark'] > span { animation-timeline: --s-remark; }
	nav[aria-label='On this page'] a[href='#vscode'] > span { animation-timeline: --s-vscode; }
	nav[aria-label='On this page'] a[href='#mcp'] > span { animation-timeline: --s-mcp; }
}
```

(The two `div:has(…)` / `nav[aria-label=…]` selectors can be a pair of classes on the template instead — `.docs-grid` and `.docs-nav` — which shortens every line and costs two class names in the markup. Measured with the selectors above; the class form is equivalent. **[inferred]**)

### 5.2 The cost, honestly

**41 lines, 2,664 bytes** as written; **33 lines** if you delete every comment. Against **14 lines, 490 bytes** for the `IntersectionObserver` action it replaces (`:35–48`).

Is it "one block"? It is one block by *placement* — it is contiguous, it lives in one `@media`, and it has no moving parts outside itself. It is **not** one block by *shape*: three of its five groups are eight-line near-identical repetitions, one per section, and adding or renaming a section means touching the block in three places (the `timeline-scope` list, the `view-timeline-name` rule, the `animation-timeline` rule) plus the `sections` array (`:21–30`) that is already the contract. The JavaScript it replaces scales to any number of sections without being edited, because it queries `section[id]`.

So: **one block, five and a half times the bytes, and the only thing on the page that has to be edited per-section three times.** Whether that clears the bar charting set is the decision this note is an input to, not a fact this note can settle. It is, however, worth saying that "a block of CSS beside the nav's own styles" imagined something smaller than this, and that the nav has no styles for it to sit beside.

### 5.3 Tailwind cannot express it

The page is Tailwind-classed and this repo is on **Tailwind 4.3.3** (`node_modules/tailwindcss/package.json`; declared `^4.3.3` at `package.json:52,64`). Tailwind's own v4.3 docs give the two relevant affordances and neither reaches:

- **Arbitrary properties** exist — "If you ever need to use a CSS property that Tailwind doesn't include a utility for out of the box, you can also use square bracket notation to write completely arbitrary CSS", with "When an arbitrary value needs to contain a space, use an underscore (`_`)" ([Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles)). So `[view-timeline-name:--s-editor]` is writable. But `timeline-scope` takes eight comma-separated dashed-idents, and `animation-timeline` must be paired with an `animation` that Tailwind would also have to emit in a controlled order — the specificity trap of §4.3 is not something class utilities can be relied on to get right, since utility order is Tailwind's to choose.
- **`@keyframes` cannot be a utility at all.** Tailwind v4 registers custom animations through the theme, with the keyframes *inside* the `@theme` block ([Animation](https://tailwindcss.com/docs/animation)):
  ```css
  @theme {
    --animate-wiggle: wiggle 1s ease-in-out infinite;
    @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
  }
  ```
  `@theme` is global to the whole site, so two docs-only keyframe pairs would be registered for the homepage and `/edit` as well.

Tailwind's own answer applies: "While Tailwind is designed to handle the bulk of your styling needs, there is nothing stopping you from just writing plain CSS when you need to." **This is hand-written CSS.**

### 5.4 Where it lands

Wherever [stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md) puts the docs stylesheet, with one consequence that ticket should know about: **every selector in §5.1 would need `:global()` inside a Svelte `<style>` block.** Svelte scopes by stamping a `svelte-<hash>` class onto elements *in the template*; under [furniture-boundary](wayfinder/tickets/066-docs-furniture-boundary.md)'s shape 3 the section bodies arrive through `{@html}` and are never stamped. The nav is template markup and would be stamped; the `<section id=…>` wrappers depend on which side of the directive boundary they end up on. A rule set that is half-stamped and half-not is exactly the failure ticket 071 was opened for, and this block would be one more instance of it — 33 lines of it, all `:global`. If 071 lands on a plain `.css` file imported by the route, this block costs nothing extra; if it lands on a `:global()`-wrapped `<style>` block, this block is 33 more `:global()`s. **[inferred]**

One thing it does *not* cost: **no CSP consequence whatsoever.** It adds no script and no hash. `csr = false` remains available, and a page carrying this CSS still emits `script-src 'self' https://static.cloudflareinsights.com` with no `sha256-` at all (`docs/research/markdown-derived-docs.md` §5, finding 3). The marker was objection 4 of that note; this note is its answer.

---

## 6. What is lost if the marker is simply gone?

The nav still lists all eight sections, still links to them, and is still sticky at `lg:`. The `<h2>` chip head at the top of each section still says which section you are in, in the tool's own colour (`:81–84`). The page-level "you are here" is untouched: the header's `<span aria-current="page">Docs</span>` (`:94`) is a different marker and does not move.

**What actually goes:**

1. **A sighted desktop reader loses the answer to "where am I in this page?" while mid-section.** Not "which page" — the header answers that — and not "what are the sections" — the nav still lists them. Specifically: the eight nav entries become eight identical entries, and the reader who has scrolled into the middle of a long section (`remark` is 1,491 px tall; `mcp` is 1,850 px) must scroll up to the section head to place themselves. Below `lg` nothing changes at all, because the marker does not exist there.
2. **An assistive-technology reader loses the exposed current-item state.** `aria-current="true"` maps to `STATE_SYSTEM_SELECTED` / `AriaProperties: current=true` / `STATE_SELECTED` (Core-AAM 1.2, §3.5.2.21), i.e. a screen reader navigating the "On this page" nav landmark would announce one of the eight links as selected/current. Without it, all eight are announced identically.

**How large is loss 2, really?** The fair reading cuts both ways and the ARIA spec itself is the best guide. WAI-ARIA 1.2 (REC, 06 June 2023) says:

> The `aria-current` attribute is used when an element within a set of related elements **is visually styled to indicate it is the current item in the set.**

That framing is the whole argument in one sentence. `aria-current` exists to make an *existing visual distinction* available non-visually. If the visual distinction goes, `aria-current` has nothing to mirror, and dropping both together is the coherent outcome — not a regression but a simplification. What would be incoherent is either half alone: a CSS marker that styles without exposing (which is what §2.4 forces, and is the state ARIA's sentence describes as the one to avoid), or an `aria-current` with nothing visible behind it.

Against that: `aria-current` here is *not* purely mirroring. Because the marker is `lg:`-gated and `aria-current` is not, a screen-reader user at any viewport gets the current-section state today, including at widths where no sighted user gets anything. That user is the one who loses most, and they lose it at every width. **[inferred]** — the spec does not contemplate this asymmetry; it is a fact about this page's implementation, and arguably today's page is the one that is odd.

**Is its absence a defect?** No success criterion requires it. WCAG 2.2 **SC 2.4.8 Location** — "Information about the user's location within a set of web pages is available" — is **Level AAA** and, as its Understanding document makes explicit, is about location *within a set of web pages*, not within one page. Nothing at Level A or AA asks a table of contents to mark the section you are reading. The W3C's own scroll-driven-animation and ARIA material treats a current-item marker as an enhancement, not a requirement.

**Two smaller things, for completeness.** If the marker survives *in CSS*, the dot stops easing and starts snapping (§2.3, measured), and at seven section boundaries two entries may briefly light instead of one (§4.3, WebKit). If the marker is dropped entirely, neither is a question.

---

## 7. Objections

1. **This is a lot of certainty resting on two engines on one laptop.** Everything in §4 is WebKit 26.5 and Chrome 151, headless, at one viewport, on one machine. No Firefox was driven at all — the binary is not installed and `playwright-core` downloads none. No iOS Safari, no real Safari (`safaridriver` is admin-gated here), no other viewport, no zoom, no `writing-mode`, no reduced-data or forced-colors mode. The two-lit boundary artefact appeared once in 88 samples in one engine, which is thin evidence for a claim about its frequency; sampled at 25 px instead of 100 px it might be common. The fidelity numbers are honest for what was measured and should not be read as "this is correct".

2. **The strongest fact in §3 argues against the whole thing, and §4's success obscures it.** `timeline-scope` is unimplemented in Firefox with an unassigned NEW bug, MDN calls the feature "Limited availability… not Baseline", and WebKit is still landing behaviour changes to the lookup rules *after* the version this page would ship against (STP 249, 29 July 2026). A CSS marker would be the first thing in this repo whose correctness depends on a property one of the three major engines has not started. That it works beautifully in two of them is not the same as it being safe. The counter-argument is real too: it degrades to *nothing*, silently and harmlessly, which is precisely the state charting already said was acceptable.

3. **"One block of CSS" flatters it.** §5.2 is honest about the 41 lines, but there is a subtler cost: the block encodes the eight ids a **third** time (after the `sections` array at `:21–30` and the `<section id=…>` wrappers), and the id contract is already the page's most load-bearing fact (`SPEC.md:35`, the homepage's inbound links at `web/src/routes/+page.svelte:61–66`). A ninth section added without touching this block produces a nav entry that silently never lights — no error, no test failure. Nothing proposed here guards that. The JavaScript being replaced has this property for free.

4. **The 88/88 agreement is measuring the technique against a baseline that is itself arbitrary.** The observer's `rootMargin: '-8% 0px -78% 0px'` is a hand-tuned number, not a specification of correctness. Reproducing it exactly is an achievement of the *port*, not evidence that either is right. If the marker were being designed today, `view-timeline-inset` would be tuned on its own terms and the agreement figure would be meaningless.

5. **§2.4's "CSS cannot set attributes" may be answering the wrong question.** The claim is airtight as stated, but the reader who wants `aria-current` back does not want an attribute — they want the accessibility tree to expose a current item. There are markup-only ways to approach that which were not researched here (e.g. whether the section headings' own `<h2>`s plus a properly-labelled nav landmark already give a screen-reader user enough orientation to make the TOC marker redundant, which is a plausible position and would change §6's balance). This note asserts a loss without measuring what an actual screen reader announces on this page today. **[unverified]**

6. **The recommendation in §9 is worth less than it looks, because the ticket already conceded the outcome.** Charting decided the marker is droppable and that nothing depends on it. A research note that then demonstrates it *can* be saved has arguably made the decision harder rather than easier, by converting a clean drop into a judgement about 41 lines. The most useful thing this note does may be §2.4 — the part that says a saved marker is a *different, smaller* marker — rather than anything in §4.

---

## 8. What could not be verified, and what would settle it

- **Firefox, empirically.** No Firefox binary is installed and `playwright-core` downloads none. Everything about Firefox here is from `mdn/browser-compat-data`, Bugzilla and MDN's experimental-features page. **[unverified]** empirically. **Settle by:** `npx playwright install firefox` and re-running the §4.2 probes; expect probe A's result (nothing lights) at every variant.
- **Real Safari, as opposed to Playwright's WebKit.** `safaridriver` is admin-gated on this machine (repo memory; `wayfinder/tickets/048-views-checkpoint.md:20`), so "WebKit 26.5" here is Playwright's build reporting `Version/26.5`, not Safari 26.5. This project has been bitten by exactly this kind of gap before. **Settle by:** opening the probe page in Safari by hand, once.
- **iOS Safari.** Not tested. It is also the platform where the marker does not exist, since the nav is only sticky at `lg:`. **[unverified]**
- **Whether the two-lit boundary artefact is one sample or many.** Measured at 100 px granularity, where it appeared once in WebKit and never in Chrome. **Settle by:** the same sweep at 10 px through one boundary.
- **What a screen reader actually announces on `/docs` today.** Objection 5. Core-AAM gives the platform mapping, not the utterance. **Settle by:** VoiceOver on the built page, rotor into the "On this page" nav.
- **`web-features`' Baseline status string for `scroll-driven-animations`.** The YAML fetched carried `name`, `description`, `spec` and `group` but no `status` block. MDN's own "Limited availability" banner is used instead. **[unverified]**
- **Whether a transition can be made to survive the animation.** §2.3 measured the snap; it did not test whether restructuring (e.g. animating a registered custom property that a transition then reads) could restore the ease. Probably not worth wanting. **[unverified]**
- **The `:global()` count under ticket 071.** §5.4 reasons from `wayfinder/tickets/066-docs-furniture-boundary.md`'s measurement rather than measuring this block. **[inferred]**

---

## 9. Recommendation, offered as an input to the decision

**The finding, stated without a preference: the marker can be saved, at full visual fidelity, in 41 lines of hand-written CSS that adds no script and no CSP hash — and saving it saves two of its three effects, permanently losing `aria-current`.**

If the decision wants a lever, the lever is not "does it work" (it does) or "what does it cost" (41 lines). It is this: **a CSS marker is not the marker.** It is the marker minus its accessibility half, on a page where that half is currently the *only* half a non-desktop assistive-technology user gets. Weighed that way, the two candidate end-states are:

- **Drop it.** Both effects go together, which is the state WAI-ARIA's own framing describes as coherent — nothing is visually styled as current, so nothing claims to be current. No new dependency on a property Firefox has not implemented, no third copy of the eight ids, no 41 lines. The reader keeps a nav that lists and links all eight sections, and loses an orientation cue at desktop widths only.
- **Keep it in CSS.** The sighted desktop reader keeps the affordance at measured 88/88 fidelity in Chrome and 87/88 in WebKit; the assistive-technology reader loses their half outright and permanently; the page gains 41 lines that must be edited per-section and a silent dependency on `timeline-scope`.

There is no third option in which `aria-current` survives without JavaScript, and that is a fact about CSS rather than about this page.

For [docs-spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md), which needs to know what `SPEC.md` should say: both end-states are compatible with "the page ships no client JavaScript". The amendment's wording turns on which one is chosen, and only the second requires `SPEC.md` to acquire a sentence about a browser feature — which would be the first such sentence in it, and would sit oddly beside §13's existing habit of naming engine risks rather than engine requirements.

---

## Sources

- **CSSWG / W3C**: [Scroll-driven Animations Module Level 1](https://drafts.csswg.org/scroll-animations-1/) — Editor's Draft, 14 May 2026; §4.2 Named Timeline Scoping and Lookup, Appendix B `timeline-scope`, §8 Changes · [Selectors Level 4](https://drafts.csswg.org/selectors-4/) — ED, 30 July 2026, §8.3 `:target` · [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) — REC, 06 June 2023, `aria-current` · [Core-AAM 1.2](https://www.w3.org/TR/core-aam-1.2/) — CRD, 05 August 2026, §3.5.2.21 · [Understanding SC 2.4.8 Location](https://www.w3.org/WAI/WCAG22/Understanding/location.html)
- **WebKit (first-party)**: [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) (15 Sep 2025) · [WebKit Features for Safari 26.5](https://webkit.org/blog/17938/webkit-features-for-safari-26-5/) (11 May 2026) · [A guide to Scroll-driven Animations with just CSS](https://webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/) (20 Jun 2025) · [STP 234](https://webkit.org/blog/17674/release-notes-for-safari-technology-preview-234/) (19 Dec 2025) · [STP 249](https://webkit.org/blog/18182/release-notes-for-safari-technology-preview-249/) (29 Jul 2026)
- **Compat data**: `mdn/browser-compat-data` at `main` — [`timeline-scope`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/timeline-scope.json), [`animation-timeline`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/animation-timeline.json), [`view-timeline-name`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/view-timeline-name.json) · [MDN `timeline-scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/timeline-scope) (Baseline banner) · `Fyrd/caniuse` `features-json/` at `main` (no entry for this feature) · [`web-features` `scroll-driven-animations.yml`](https://raw.githubusercontent.com/web-platform-dx/web-features/main/features/scroll-driven-animations.yml)
- **Mozilla**: [bug 1823500 — Support `timeline-scope`](https://bugzilla.mozilla.org/show_bug.cgi?id=1823500) (NEW) · [bug 1849775](https://bugzilla.mozilla.org/show_bug.cgi?id=1849775) (DUPLICATE) · [Experimental features in Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features) · [`firefox_versions.json`](https://product-details.mozilla.org/1.0/firefox_versions.json) (153.0.4 / 156.0a1, 2026-08-15)
- **Tailwind CSS v4.3**: [Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles) · [Animation](https://tailwindcss.com/docs/animation)
- **This repo**: `SPEC.md:30,200,305,359,506` · `package.json:52,58,64` · `web/vite.config.ts` · `web/src/app.css` · `web/src/routes/docs/+page.svelte:21–30,35–48,94,117–136,138,140–496,607–778` · `web/src/routes/+page.svelte:61–66` · `web/src/lib/sheet/CanvasSheet.svelte:663,1141,1156,1177` · `cli/src/measure.ts:12,81` · `.github/workflows/ci.yml` · `docs/research/markdown-derived-docs.md` §5, §10 · `wayfinder/map-docs-page.md:19` · `wayfinder/tickets/044-json-refusal-copy.md:51` · `wayfinder/tickets/048-views-checkpoint.md:20` · `wayfinder/tickets/063-webkit-svg-stacks.md` · `wayfinder/tickets/066-docs-furniture-boundary.md` · `wayfinder/tickets/071-docs-stylesheet-scoping.md`
- **Probes**: session scratchpad — `support.mjs` (CSS.supports across engines), `spy.html` + `run-spy.mjs` (synthetic page), `probe2.mjs` (variants A–D), `marker-final.css` + `fidelity2.mjs` (the real `build/docs.html`, both engines, 88 samples), `snap.mjs` (transition vs. animation). Engines: Playwright WebKit **26.5** (`playwright-core@1.62.1`, `webkit-2336`) and installed Chrome **151.0.7922.138** via `channel: 'chrome'`.
