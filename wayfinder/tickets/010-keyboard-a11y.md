---
name: keyboard-a11y
title: "Decision: keyboard model & accessibility"
labels: [wayfinder:grilling]
status: open
assignee:
blocked-by: []
---

## Question

What does keyboard-only editing mean in a modeless, contenteditable canvas (the live-sheet model from [inline-editing-prototype](wayfinder/tickets/005-inline-editing-prototype.md))? To settle: tab order across editable fields, chips and lanes on the 2D grid; how hover-only affordances (ghost adds, ×, drag grips) are reached without a pointer — and what the keyboard equivalent of drag-reorder is; popover picker keyboard operation (open, navigate, escape hatch); focus visibility on the quiet sheet; semantics for assistive tech (roles/labels for contenteditable spans, chips, popovers, live announcements on structural changes); and how far WCAG conformance is a goal for the editor vs the exported HTML artifact.

Use `/grilling` + `/domain-modeling`. May spin off a `research` ticket on contenteditable/ARIA patterns if the discussion hits an evidence gap.
