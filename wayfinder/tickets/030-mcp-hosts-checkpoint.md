---
name: mcp-hosts-checkpoint
title: "Task: the destination gate — round-trip holds, both hosts drive it"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [review-prompt-and-readme]
---

## Question

The destination gate, per [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) (3, 20) and the checkpoint habit this project has kept since the hosting map. Two halves, and the first is load-bearing.

**The round-trip property.** If bytes don't survive the boundary, nothing else about the server matters.

- A canvas the server writes opens in the live app and renders correctly — through the real import path, not a test harness.
- A canvas the app exports reads in the server unchanged, `.bcc.html` included, since `extractEmbeddedCanvas()` puts artifacts on the same path.
- Byte-identity both directions, allowing only the trailing-newline convention SPEC §3.5 defines.

**Both hosts, driven by hand.** Automated tests can't see what a host actually does with a `tools/list`, and Desktop is the one you can't reason about from a terminal.

- **Claude Code:** all four tools exercised against a real repo — draft a canvas for an actual service from its code, list, read both views, and write. The drafted canvas then opens in the app.
- **Claude Desktop:** the config snippet from the README works as written, on a `--root` that is not a repo. `review-canvas` appears as a slash command, its `path` completion offers discovered canvases, and the review runs.
- The teaching paths, since they are the reason the server exists rather than a skill: `bcc_explain` returns the SPEC §10 question verbatim for a spot-checked section; an off-vocabulary relationship value is **accepted with a warning**, not refused; a file with a bad `message.type` produces an error that names the field path; a hand-bumped `version` is refused with the file untouched on disk.

Record the transcript and evidence in `.scratch/mcp-hosts-checkpoint/`, following the habit from [examples-live-checkpoint](wayfinder/tickets/024-examples-live-checkpoint.md).

Green here closes the map, and unblocks the workshop phase — `bcc_edit_canvas`, `canvas-workshop` and `draft-canvas-from-code` — which graduates from the map's *Not yet specified* to a decision ticket informed by what driving the day-one server actually felt like. Note anything that annoyed you: that list is the workshop ticket's real input.
