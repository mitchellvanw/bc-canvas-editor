---
name: state-undo-autosave
title: "Decision: document state, undo/redo & autosave model"
labels: [wayfinder:grilling]
status: open
assignee: mitchell
blocked-by: [canvas-file-schema, inline-editing-prototype]
---

## Question

Define the in-memory document model and its behavior over time: relationship between runtime state and the Canvas file schema (same shape or mapped?); the single linear undo/redo history — what constitutes one history entry given the editing interactions (per keystroke? per field commit? per structural change?); autosave-to-localStorage details (debounce, storage key, behavior across multiple tabs, dirty/saved indicator); and what happens on import over unsaved work.
