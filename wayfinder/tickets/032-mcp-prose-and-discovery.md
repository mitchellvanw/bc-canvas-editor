---
name: mcp-prose-and-discovery
title: "Task: server repairs — every result speaks in prose, discovery skips dot-directories, the canvas topic teaches drafting"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [workshop-shape]
---

## Question

Three repairs from [workshop-shape](wayfinder/tickets/031-workshop-shape.md), all on existing green code. AFK.

**Drop `outputSchema` everywhere, as a standing rule.** `bcc_list_canvases` and `bcc_write_canvas` lose theirs; no tool on this server declares one from now on, and a comment at the registration site says why — the spec entitles a host to treat the text block as a duplicate serialization once structure is declared, and both hosts do, which is how the register got thrown away (checkpoint finding 1). `WRITE_OUTPUT` in `schema.ts` goes; results keep only their prose. The tests that pin `structuredContent` in `tools.test.ts` and `server.test.ts` move their assertions to the text, which is the honest place now that the text is the whole result.

**Discovery skips every dot-directory.** The skip rule becomes: any name starting with `.`, plus `node_modules`, `dist`, `build` (subsuming `.git` and `.svelte-kit`). This repo's listing drops from 13 canvases to the 4 real ones — the nine `.scratch/` fixtures, including the mangled v1-era file, disappear from the tool whose description says to start there. And when a listing finds nothing at all, the empty-root sentence now also says that hidden and generated directories were not searched — the one moment the rule is worth spending words on. `discover.test.ts` pins both.

**`bcc_explain`'s `canvas` topic gains the drafting discipline.** The five judgment sections — strategic classification, domain roles, business decisions, assumptions, verification metrics — are business judgments a codebase cannot answer; a model reading code will produce plausible strings for all five. The topic now says so, and says where the honest draft puts them: as questions under Open questions, not as filled rows. This is method knowledge and it lives server-side on purpose ([workshop-shape](wayfinder/tickets/031-workshop-shape.md)'s seam): content in a skill would be lost to every non-Claude MCP client. No `workshop` topic is added — the procedure belongs to the skill.

`writing-copy` for every changed sentence. Suite green, `tsc` clean, and the built bundle re-verified over raw stdio the way the scaffold ticket pinned it.
