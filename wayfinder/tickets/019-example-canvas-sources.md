---
name: example-canvas-sources
title: "Research: published example canvases & what CC BY asks of derived ones"
labels: [wayfinder:research]
status: closed
assignee:
blocked-by: []
---

## Question

The [example roster](wayfinder/tickets/020-example-roster.md) decision wants outside facts first:

- What example Bounded Context Canvases already exist publicly — the ddd-crew repo's own examples, talks/articles from the canvas authors (Nick Tune et al.), community write-ups? For each: which domain, how filled-in, and is it a V5 canvas or an older revision?
- What does the ddd-crew guidance itself say makes example content *good* — their design-process notes, section-by-section advice, worked tutorials?
- Licensing: the canvas is CC BY 4.0. If our examples derive from (or transcribe) a published example, what attribution does that add beyond the ddd-crew line the app already carries? Does inventing our own domains sidestep this cleanly?

Findings feed the roster grilling: candidate domains, what the published sets demonstrate (and fail to demonstrate), and whether derivation is worth its attribution cost versus inventing.

## Resolution

**Published examples are scarcer than expected.** The ddd-crew repo has no `examples/` directory — exactly one complete filled canvas exists there: **"Scoring"** (`resources/BCCanvasExample.jpg`), a retail mortgage credit-scoring context, **V5, all eleven sections filled** but sparse (1–5 stickies each, with genuinely quantified verification metrics like "75% of changes to the application form will have no impact on Scoring"); authored by Maxime Sanglan-Charlier (2021), updated to V5 by Michael Plöd (2022). Beyond it: an inbound-panel *fragment* (showroom/sales) in the same repo, Nick Tune's 2019 workshop-recipe article (three progressive canvases, explicitly fictional domain, **V1**), his Use Case Swimlanes recipe (booking domain, partial V4 variant), and Kenny Baas-Schwegler's BDD extension (movie-theatre seat allocation, pre-V4). The translated "filled" v5 images are placeholder templates, not examples. Only Scoring is both complete and V5 — the published corpus demonstrates fill *density*, not domain variety; every non-repo example needs V1/V4→V5 translation (revision map pinned to commits in the notes).

**Good-content guidance (README section definitions + design tips):** purpose in business language with no technical detail; classification as one pick per curated axis; domain roles characterizing *behaviour*; messages implementation-agnostic in the three types, judged by the interface-critique bar (coherent names, right type, small surface, no internals leaking); context-specific language terms; top-3 distilled business decisions, not a rule dump; assumptions made explicit; quantified falsifiable verification metrics; open questions as an uncertainty gauge. The Scoring example confirms **sparse is canonical** — a workshop artifact, not documentation prose.

**Licensing: invent, don't derive.** Transcribing the Scoring example would trigger CC §3(a) adapted-material attribution *per example* (TASL — title/author/source/license — plus a modification notice) on top of the generic ddd-crew line the app carries; worse, the repo's license signals conflict (README + artwork say CC **BY** 4.0, but `LICENCE.md` has carried the **BY-SA** legalcode since day one, and GitHub detects BY-SA), so a derived example might also owe ShareAlike; the Medium/blog examples carry no CC grant at all. Inventing our own domains sidesteps everything cleanly: the canvas *structure* is already covered by the existing attribution line, invented fill content is our own expression, and following the guidance is copying uncopyrightable ideas. Deriving costs per-example attribution machinery plus a license ambiguity; inventing costs nothing new.

Full notes on branch research/example-canvas-sources.
