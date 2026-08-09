---
name: bcc-plugin
title: "Task: the plugin — server bundled, two skills, one agent"
labels: [wayfinder:task]
status: closed
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

## Resolution

Built and green (2026-08-09). The layout fact was verified first, against the official plugin docs (code.claude.com/docs/en/plugin-marketplaces.md, plugins-reference.md), and it decided everything: a marketplace install clones the repo, copies **only the plugin's `source` subdirectory** into `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`, runs no build step, and `../` paths never resolve afterwards. So the plugin root is **`mcp/` itself** — the package that already existed becomes the plugin, the committed bundle sits inside it as `${CLAUDE_PLUGIN_ROOT}/dist/server.js`, and nothing is committed twice.

**The bundle.** `.claude-plugin/marketplace.json` at the repo root (marketplace `bc-canvas-editor`) points `source: "./mcp"`; `mcp/.claude-plugin/plugin.json` names the plugin `bc-canvas`, so installing is `/plugin marketplace add mitchellvanw/bc-canvas-editor` then `/plugin install bc-canvas@bc-canvas-editor`. Two consequences the ticket's text had not priced: with no `npm install` at install time, the committed `dist/server.js` must run with nothing beside it but Node, so **the build now inlines its dependencies** (`packages: 'external'` dropped; 1.2 MB, byte-deterministic across rebuilds, no machine paths in the output) — and the sourcemap is dropped rather than committed, since it would double the price to serve a file only ever read in this checkout. `mcp/dist` left `.gitignore`; `build.js` takes an optional outfile argument. The staleness check is the suite's shape now: `server.test.ts` stopped rebuilding `dist/` in `beforeAll` and instead **drives the committed bundle**, with a first test that builds to a scratch path and byte-compares, failing with "run `npm run build` in mcp/ and commit the result". `mcp/.mcp.json` launches the server with no `--root` — correct in Claude Code, refused at launch in Cowork exactly as decided, with the hand-written Desktop entry as the documented remedy.

**The seam, held.** `skills/canvas-workshop/SKILL.md` and `skills/draft-canvas-from-code/SKILL.md` carry procedure only: both open by taking the sheet's order and the sections' meaning from `bcc_explain` rather than restating them — no section questions, no vocabulary, no digest shapes anywhere in the plugin. The workshop skill pins the disk-truth loop (write whole document after every section, read back as `view: 'json'` before the next) and closes on a review-style readback; its done-line requires every section filled in the human's words or accounted for under Open questions. The draft skill's ground rules are the evidence discipline (an inbound message is a handler that exists, a collaborator a caller you can name; a row you cannot back with a file is a question, not a row), delegation of the judgment sections to what `bcc_explain('canvas')` says, and the code's own vocabulary; it closes by handing the draft back for correction. `agents/canvas-reviewer.md` is the stance plus the two tools, four sentences of body.

**Docs.** `mcp/README.md`: Install now leads with the plugin and the line "what the install gives you differs by host, and the difference is `--root`" — Claude Code needs nothing more, Desktop keeps the explicit-root entry with the skills riding on whichever server is connected; a "What the plugin adds" section names the three components; Development documents the committed bundle and the diff check. Root README pointer updated.

Validated by the plugin-dev structure validator (pass, no issues), `npm test` green in `mcp/` (89) and at the root (313), `tsc`/`svelte-check` clean in both. Not driven in a real host here — that is [workshop-drive](wayfinder/tickets/034-workshop-drive.md)'s whole job, now the sole frontier ticket.
