---
name: docs-css-section-marker
title: "Research: can the section marker be expressed in CSS alone?"
labels: [wayfinder:research]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

The **section marker** is the sticky nav bolding whichever of the eight sections is under a notional reading line. Today it is the docs page's only runtime JavaScript: an `IntersectionObserver` with `rootMargin: '-8% 0px -78% 0px'`, setting `active` (`web/src/routes/docs/+page.svelte:36–48`).

Charting decided the marker is **droppable** and that `csr = false` is not hostage to it. This ticket is the marker's chance to survive, not a precondition for anything.

1. **Can CSS express it at all?** The shape to test is a named view timeline — `view-timeline-name` on each `<section>`, `timeline-scope` on a common ancestor, and each nav link animating on its section's timeline. That drives a *nav link's* style from a *section's* scroll position, which is the whole trick. Verify against the CSS Scroll-Driven Animations spec, not a blog post. `:target` is not an answer — it responds to clicks, not scrolling.
2. **Does it hold in WebKit?** This project has been burned there specifically ([webkit-svg-stacks](wayfinder/tickets/063-webkit-svg-stacks.md)), and the repo's habit is to check WebKit rather than assume it. Safari 26.5 and the engines the project actually targets — find what the project has committed to before assuming a matrix.
3. **Is it one self-contained rule set?** The bar set at charting: if saving the marker costs more than a block of CSS that lives beside the nav's own styles, it is not worth saving. Report the cost honestly rather than reaching for exotica to force a yes.
4. **What does the marker look like when it is simply gone?** The nav still lists eight sections and still links to them. Say plainly what a reader loses, so the decision to drop it is made on the real loss rather than on the word "regression".

Findings land as a Markdown file in `docs/research/`, matching the convention of `markdown-derived-docs.md` and its two neighbours. Primary sources only, versions pinned, `[unverified]` marked as such.

Independent of every other ticket on this map — nothing blocks it and it blocks only [docs-spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md), which needs to know whether `SPEC.md` says "no client script" or "one block of CSS doing what a script used to".

## Resolution

**The marker is dropped. It can be saved, and saving it is not worth what saving it costs — because a CSS marker is not the marker.**

Full findings, with every claim sourced and every measurement reproducible: `docs/research/css-only-scroll-spy.md`.

### The four questions

1. **Can CSS express it? Yes — both *visual* halves, at measured fidelity.** `view-timeline-name` per section, `timeline-scope` on the grid div the nav and the prose already share (`+page.svelte:117`), `animation-timeline` per link. Discreteness comes free: `from, to { … }` keyframes leave nothing to interpolate, and `animation-fill-mode: none` means the animation contributes nothing outside its range, so it is a two-state property rather than a fade. `view-timeline-inset: 8% 78%` is the exact analogue of the observer's `rootMargin: '-8% 0px -78% 0px'`. Driven against the real `build/docs.html` with the app's JS blocked, compared to the shipping `aria-current` at 88 scroll samples: **Chrome 151 — 88/88; WebKit 26.5 — 87/88** (one boundary sample lights two entries). `:target` is not an answer — Selectors-4 §8.3, it is set by the URL fragment and never changes on scroll.

2. **But it cannot express `aria-current` — and that is a category boundary, not a gap.** CSS styles; it does not set attributes. `attr()` reads an attribute into a value; nothing reads a value into an attribute. Core-AAM 1.2 derives ARIA state from markup only, and defines no mapping from computed style to `aria-current`. **So a CSS marker is a two-thirds marker**: the sighted desktop reader keeps the affordance, the assistive-technology reader loses theirs permanently. The ticket asked this as an aside; it is the answer.

3. **Does it hold in WebKit? Yes, measured — and Firefox has not started.** The repo turns out to have **no browser-support commitment anywhere** — no browserslist, no vite target, no sentence in `SPEC.md`; only implied floors (`@container`, `color-mix()` already shipped in the sheet) and the WebKit-checkpoint habit. Pinned: `timeline-scope` is Chrome 116 / Safari 26 / **Firefox not implemented at all** (bug 1823500, NEW, unassigned; the rest of the module is Nightly-136-only behind a pref). MDN: "Limited availability — not Baseline". caniuse has **no entry** for this feature; what it displays is MDN BCD passthrough, so there is exactly one compat dataset and one better source — driving the engines. Empirically both installed engines support every property including `timeline-scope`. Three findings worth keeping: without `timeline-scope` **nothing works in either engine**, despite the 14-May-2026 ED now saying names are global by default; the engines **disagree** on duplicate names (WebKit last-wins, Chrome inactive); and WebKit is still changing this lookup *after* 26.5 (STP 249, 29 Jul 2026).

4. **One self-contained rule set? One block, five and a half times the bytes.** 41 lines / 2,664 bytes against the observer's 14 lines / 490. Contiguous and self-contained by placement, but three of its five groups are eight near-identical per-section repetitions — so a ninth section means editing it in three places, and it encodes the eight ids a **third** time with no guard: a section added without touching it gets a nav entry that silently never lights. The JavaScript it replaces scales for free, because it queries `section[id]`. **Tailwind 4.3.3 cannot express it** — `@keyframes` can only be registered globally in `@theme`, and the specificity ordering cannot be left to utility order. It is hand-written CSS, and under [stylesheet-scoping](wayfinder/tickets/071-docs-stylesheet-scoping.md) every selector would need `:global()`. No CSP consequence at all.

### Why dropped

Charting called the marker droppable and this ticket was its chance to survive. It survives only as something smaller than itself, and the shape of that loss is what decides it.

**WAI-ARIA's own sentence is the argument**: `aria-current` "is used when an element within a set of related elements **is visually styled to indicate it is the current item in the set**." It exists to mirror a visual distinction. Drop both and nothing claims to be current — coherent. Keep the CSS half alone and the page styles a current item without exposing it, which is precisely the state that sentence describes as the one to avoid.

**And the asymmetry runs the wrong way.** E1 and E2 are `lg:`-gated; `aria-current` is not. A screen-reader user gets the current-section state at *every* width today, including widths where no sighted user gets anything. The CSS marker keeps the affordance for the reader who has the most other recourse — the sighted desktop reader, who also has eight coloured chip heads and a nav that still lists and links all eight sections — and removes it, at every width, from the reader who has the least. Paying 41 lines to redistribute an affordance in that direction is not a saving.

Against a drop, honestly: the technique measured beautifully, and it degrades to nothing rather than to something broken. That is real, and it is why this is a judgement rather than a refutation. But it is 41 lines that must be edited per-section, a third unguarded copy of the id contract, and the first thing in this repo whose correctness depends on a property one major engine has not begun — bought for two thirds of an affordance that is already desktop-only.

**What a reader actually loses:** on desktop, the answer to "where am I?" while mid-section — `remark` is 1,491 px tall, `mcp` is 1,850 px — so they scroll up to the section head to place themselves. Below `lg`, nothing, because the marker does not exist there. No success criterion is missed: WCAG 2.2 SC 2.4.8 Location is Level AAA and is about location within a *set of pages*, not within one.

### For [spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md)

`SPEC.md` says **"the page ships no client JavaScript"**, flatly, with no clause about a browser feature. Both end-states were compatible with that wording; only the CSS one would have required `SPEC.md` to acquire a sentence about `timeline-scope` — which would have been the first browser-*requirement* sentence in a document whose §13 habit is to name engine *risks*. The amendment should record that the marker was dropped deliberately, and that `aria-current` went with it because CSS cannot set attributes.

### Reversible, and where

This is the one call on this map made without Mitchell in the room, since research tickets are AFK. If it should go the other way, [spec-amendment](wayfinder/tickets/070-docs-spec-amendment.md) is the gate that writes it down — the CSS is in §5.1 of the research note, measured and ready, and nothing else on the map depends on which way this went.

### Left unverified

Firefox empirically (no binary installed; `playwright-core` downloads none by design) · real Safari as opposed to Playwright's WebKit (`safaridriver` is admin-gated here) · iOS Safari · whether the two-lit boundary artefact is one sample or many at finer granularity · what a screen reader actually announces on `/docs` today, which is the gap under the `aria-current` argument and is objection 5 of the note.
