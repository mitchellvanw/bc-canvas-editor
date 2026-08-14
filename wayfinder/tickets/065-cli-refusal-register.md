---
name: cli-refusal-register
title: "Task: OutsideRoot from --out crashes raw instead of refusing in the CLI's voice"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: []
---

## Question

Found incidentally by [render-checkpoint](wayfinder/tickets/060-render-checkpoint.md) leg 5: `bcc render --out /tmp/x.svg <canvas>` with the out-path outside the root dies as an **uncaught `OutsideRoot`** — full Node stack trace, `Node.js v26` footer — on both the npx build and the current local bundle. The refusal sentence is right there in the error object ("outside the canvas root. Paths are relative to …, and a path out of it is not followed.") and never reaches the CLI's register, where every other refusal is a sentence and an exit code ([055](wayfinder/tickets/055-bcc-cli.md)'s three-code contract: this should be a 1, or arguably a 2 as a caller mistake — decide which while fixing).

Sweep `cli/src` for other paths where a thrown refusal escapes `run()` uncaught rather than being caught and printed — `--out` resolution is the one observed; the fix should cover the class, not the instance.
