---
name: docs-css-section-marker
title: "Research: can the section marker be expressed in CSS alone?"
labels: [wayfinder:research]
status: open
assignee:
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
