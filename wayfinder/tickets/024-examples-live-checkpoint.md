---
name: examples-live-checkpoint
title: "Task: live checkpoint — the examples work on the real origin"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [ship-example-chooser]
---

## Question

The destination gate, run against `bc-canvas.pages.dev` on Playwright WebKit (the established checkpoint habit):

- The chooser opens; every roster canvas loads and renders correctly.
- The unexported-changes gate fires when it should and stays silent when it shouldn't; landing is clean; first edit dirties.
- An opened example exports all three formats, and the artifact-leak guarantee still holds (nothing chooser- or beacon-shaped in the artifact bytes).
- Keyboard path through the chooser works as specced.
- A `main` push still redeploys.

Resolution records the checkpoint transcript; green here closes the map.
