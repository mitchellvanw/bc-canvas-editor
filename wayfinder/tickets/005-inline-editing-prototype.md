---
name: inline-editing-prototype
title: "Prototype: inline editing interactions"
labels: [wayfinder:prototype]
status: open
assignee: mitchell
blocked-by: [layout-visual-prototype]
---

## Question

How does editing feel, in place, on the rendered canvas? Raise the layout prototype's fidelity to answer: contenteditable vs swap-in inputs for free-text sections; pick-one enum UI for strategic classification with the escape hatch; the 15-trait domain-role picker (with trait descriptions surfaced); adding/removing/reordering message rows and collaborator lanes; how a section signals "click to edit" without cluttering the presentation view.

Use `/prototype`. The reaction here fixes the interaction model the spec describes, and feeds undo/redo granularity in [state-undo-autosave](wayfinder/tickets/006-state-undo-autosave.md).
