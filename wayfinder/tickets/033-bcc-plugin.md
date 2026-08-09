---
name: bcc-plugin
title: "Task: the plugin — server bundled, two skills, one agent"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [mcp-prose-and-discovery]
---

## Question

Build the facilitation layer [workshop-shape](wayfinder/tickets/031-workshop-shape.md) decided: an installable plugin carrying the MCP server, the `canvas-workshop` and `draft-canvas-from-code` skills, and the `canvas-reviewer` agent. `review-canvas` is untouched — it stays the server's sole prompt, the one entry point that runs with no tools at all.

**The bundle.** A marketplace manifest in this repo, so installing is `/plugin marketplace add` against the GitHub remote — nothing published to a registry. `mcp/dist` leaves `.gitignore` and `dist/server.js` is committed, since a marketplace install fetches files and runs no build step; a suite check rebuilds and diffs against the committed bytes so the bundle cannot go stale silently. The plugin's `.mcp.json` entry launches the server with **no `--root`**: correct in Claude Code where cwd is the repo, refused at launch in Cowork where cwd is `/` — the refusal failing where a reader can act, with the hand-written `mcpServers` entry as the documented Desktop path. One layout fact to verify before anything is placed: what a marketplace install actually copies, so the committed bundle is inside it — plugin root, manifest paths and `${CLAUDE_PLUGIN_ROOT}` fall out of that.

**The seam, enforced everywhere.** Skills and agent own procedure only. They never restate what `bcc_explain` returns — they say *call it and put its question to the human*, not what the question is. No section questions, no vocabulary lists, no digest shapes in any skill or agent body.

**`canvas-workshop`** — the facilitated session: one section at a time in the sheet's own order; `bcc_explain` per section, its question put in the facilitator's own words; answers transcribed in the human's vocabulary, not paraphrased; anything deferred goes under Open questions rather than being left blank silently; the whole document written back after every section, and the previous write read back as `view: 'json'` before each next one, so every rewrite starts from disk truth; close with a review-style readback of the finished sheet.

**`draft-canvas-from-code`** — the disciplined draft: every row drawn from what the code actually shows (an inbound message is a handler that exists, a collaborator is a caller you can name); the five judgment sections go under Open questions per the strengthened `canvas` topic; the context named in the code's own vocabulary; close by handing the draft back for correction — a drafted canvas is a starting point, not an output.

**`canvas-reviewer`** — thin by rule: the stance (review by asking, not filling; leave the questions open; write nothing back unasked) plus *lean on `bcc_read_canvas` and `bcc_explain`*. The review contract's full text lives in `review-canvas`; the agent shares the server's floor with it, not a script.

**Docs.** `mcp/README.md` gains the install path and the two-config story — Claude Code gets the server free via the plugin, Desktop/Cowork keeps the explicit-root entry, the skills ride on whichever is connected. Root README pointer updated.

`writing-copy` throughout — skill descriptions, agent description and every body sentence are copy, and the model is a reader. Suite green, `tsc` clean.
