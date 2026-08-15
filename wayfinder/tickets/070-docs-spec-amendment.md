---
name: docs-spec-amendment
title: "Decision: what SPEC.md says, and what exactly is handed off"
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: [docs-css-section-marker, docs-source-set, docs-markdown-read-shape, docs-stylesheet-scoping, docs-directive-vocabulary]
---

## Question

The map's gate. This map **decides and does not build**, so the way is clear only when the decisions are written where a builder can pick them up without re-deriving them.

1. **What does `SPEC.md` §2 say?** Today it states the three prerendered pages, the static 404, and the eight docs anchor ids "the homepage links into, which makes those ids a contract" (`SPEC.md:35`). It must gain: that `/docs` renders from committed Markdown, and that it carries no client script — or, if [css-section-marker](wayfinder/tickets/067-docs-css-section-marker.md) came back yes, that the section marker is CSS. Restate the anchor-id contract as the thing that **survives** the move, since that is the invariant every other decision was shaped around.
2. **Does the prose stay outside the spec?** `SPEC.md:35` declares the docs copy documentary and outside itself. Moving it into files does not obviously change that, but it is now *committed source with a path*, which is exactly the kind of thing a spec usually names. Decide, and say why.
3. **Does `CONTEXT.md` gain anything?** Charting said no: the section marker is website furniture, and `CONTEXT.md` is the canvas domain's glossary. Confirm that still holds once 066–069 have landed, and in particular that nothing in the source set has invented a term the glossary should own.
4. **What is the hand-off, precisely?** The Markdown authoring and the pipeline code are not this map's to write. Name what the builder receives: which tickets hold which decisions, what `SPEC.md` now asserts, what the two guard tests must check, and what is deliberately left to their judgement. A hand-off that says "see the map" has not been written.
5. **Anything the route revealed as out of scope?** Rule it out here rather than resolving it — a scope boundary is not a step on the route, and it belongs in the map's Out of scope with the closed ticket linked.

Use `/grilling` and `/domain-modeling`; `writing-copy` for the spec prose itself.
