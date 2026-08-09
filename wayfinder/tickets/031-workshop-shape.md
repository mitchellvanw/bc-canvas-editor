---
name: workshop-shape
title: "Grilling: what does the facilitated workshop need, now that day one has been driven?"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [mcp-hosts-checkpoint]
---

## Question

[mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) deferred the workshop deliberately: `bcc_edit_canvas` and its natural-key addressing, the `canvas-workshop` and `draft-canvas-from-code` prompts. The reasoning was that authoring sixteen operation shapes before driving the tools once is how you get the wrong sixteen. [mcp-hosts-checkpoint](wayfinder/tickets/030-mcp-hosts-checkpoint.md) has now driven them, and produced the evidence this ticket is supposed to be decided on.

**What day one actually taught, and what each thing forces:**

- **A host with an `outputSchema` throws the prose away.** Both Claude Code and Claude Desktop hand the model only `structuredContent` for `bcc_list_canvases` and `bcc_write_canvas`; the `content` text block never arrives. The facts survive in `empty` and `warnings` — what is lost is the register, and the register is the product. So: does `outputSchema` earn its place on a tool whose value is its wording? The workshop tools will face the same choice on the way in, so it is decided here rather than per tool.
- **The prompt has a discovery problem, not a quality problem.** Free text reached the same review without `review-canvas`, and Cowork does not surface MCP prompts at all. But the prompt's embedded resource is what let it run with no tool access. What does that say about `canvas-workshop` and `draft-canvas-from-code` — are they prompts, tools, or the tool descriptions doing the work already?
- **Discovery has no ignore rule beyond five hard-coded names.** In this repo that is 13 canvases, 9 of them checkpoint fixtures under `.scratch/`, including a mangled v1-era file presenting itself as real. The listing is the tool the descriptions say to start with. Gitignore? A configured ignore? Nothing, and let the model judge?
- **`--root` is fixed at config time.** One Desktop root serves every project, whichever one you are standing in. Roots-as-a-protocol-feature, several config entries, or accepted as-is?

**And the workshop's own question, which none of that answers:** what is a facilitated session actually made of? Whether `bcc_edit_canvas` needs the Commit-shaped operation union at all, or whether whole-document writes plus a good digest are enough — day one never once wanted a partial edit, which is evidence, though a workshop is the case that would.

Natural-key collision policy only matters if rows become addressable, so it rides on that answer rather than preceding it.

Use `/grilling` and `/domain-modeling`. The checkpoint's findings are the input; read its Resolution first.

## Resolution

Settled in a grilling session (2026-08-09), seven rounds. The pivotal fact arrived mid-session and reversed two early answers: **plugins reach every Claude surface, and the skills they bundle are findable from `/` in the one host where MCP prompts are invisible** ([Anthropic's plugin doc](https://support.claude.com/en/articles/13837440-use-plugins-in-claude) — skills work in web chat, Desktop's Chat tab and Cowork; hooks and sub-agents in Cowork and Claude Code only; a plugin may include local MCP servers). Finding 7's discovery problem has a fix, and it was never an MCP primitive.

### The four findings, answered

1. **`outputSchema` is dropped everywhere, as a standing rule.** No tool on this server declares one; every result speaks in prose. The spec's own backwards-compat advice — a tool returning structured content SHOULD also serialize it into the text block — means a host is *entitled* to treat our text as a duplicate and discard it: finding 1 was not a host bug. This server's product is its wording, and there is no programmatic consumer; `empty`, `warnings` and `unreadable` were always written for a model reader, who reads a sentence better than an array. Decision 11 dropped `outputSchema` from `bcc_read_canvas` on the neighbouring argument; uniformity is the honest end of it.
2. **Discovery skips every dot-directory.** One line, subsuming `.git` and `.svelte-kit` from the skip list, and it would have caught all nine noise canvases — `.scratch` is a dot-directory, and a committed canvas does not live in a hidden one. Gitignore semantics stay rejected (decision 22 held): same catch here, at the cost of a subprocess and behaviour that diverges between a checkout and a plain folder. When a listing finds nothing at all, it now says hidden and generated directories were not searched — the one moment the rule is worth spending words on.
3. **`--root` fixed at config time is accepted.** Roots-as-a-protocol-feature is deprecated in the very revision we target (SEP-2577), with the spec's migration advice being server configuration — which is what we do. A per-call root was rejected in decision 6 and rejects the same way now. The README's remedy stands: name the folder, or one entry per project under different server names. This is a host limitation on the far side of the boundary the server ends at, like Cowork not surfacing prompts.
4. **The prompt's discovery problem is solved from outside MCP.** The facilitation layer ships as a **plugin**: the server, two skills, one agent.

### The facilitation layer

- **Two skills, no new prompts: `canvas-workshop` and `draft-canvas-from-code`.** A skill beats an MCP prompt on every axis these were judged on — findable in every surface including Cowork, arbitrarily long at zero `tools/list` cost, loaded on demand. `draft-canvas-from-code` nearly died on day-one evidence (the host drafted eleven sections unscripted), but what "eleven sections filled, no warnings" cannot show is how many were confidently invented — nobody checked, because nothing had said not to. The drafting discipline is the skill's whole cargo.
- **`review-canvas` stays as the sole MCP prompt, unchanged, with `canvas-reviewer` beside it** — the Cowork/Code-native reviewer, an agent in the plugin. The prompt holds two properties an agent structurally cannot have: it runs with **no tool access at all** (finding 8 — the embedded digest carried a full review through a session where every tool call was denied, an agent being the opposite shape: a tool-calling loop that has nothing when denied), and it lives in the **server**, the floor every MCP host gets, where plugin components reach only Claude surfaces — sub-agents narrower still. The drift risk between them is answered by the thinness rule below, not by deleting the one entry point that survives everything.
- **The seam: the server owns content and validation; plugin components own only procedure.** SPEC §10 verbatim, the vocabularies, the parser, canonical bytes and the digest stay behind the tools. A skill never restates what `bcc_explain` returns — it says *call `bcc_explain('inboundCommunication')` and put its question to the human*, not what the question is. The agent stays thin the same way: the stance (ask, don't fill; leave the questions open; write nothing back unasked) plus the tools, never the section questions. Ticket 001's lesson wearing a new coat: two artifacts describing one thing drift. Consequence: **no `workshop` topic in `bcc_explain`** — the procedure lives in the skill, whose reachability was the topic's only reason — while the **`canvas` topic gains the drafting discipline**, because "strategic classification, domain roles, business decisions, assumptions and verification metrics are business judgments a codebase cannot answer — put them under Open questions rather than filling them" is method knowledge, not procedure, and content in a skill would be content lost to every non-Claude MCP client.
- **The workshop procedure:** one section at a time, in the sheet's own order; for each, call `bcc_explain`, put its question in the facilitator's own words, transcribe what comes back in the human's vocabulary; anything deferred goes under Open questions rather than being left blank silently; **the whole document is written back after every section**, with the previous write read back as `view: 'json'` before each next one, so every rewrite starts from disk truth rather than the model's memory of it — the cheapest defence against silent row alteration; close with a review-style readback.
- **`bcc_write_section` is not built, and its trigger is named in advance:** an observed loss or unrequested alteration of a row across rewrites — never token cost, which is ~850 a write and affordable eleven times over. Its shape if triggered is **section-scoped, never an operation union**: a workshop moves section by section, so section grain is the activity's own grain, and it disposes of row addressing and the natural-key collision policy entirely rather than deferring them again.
- **Elicitation is a dead fork.** With the workshop in a skill, the human is already in the conversation — asking is native chat. `elicitInput` was only interesting while the workshop might have been server-side.

### Distribution

- **A marketplace manifest in this repo** — installing is `/plugin marketplace add` against the GitHub remote, nothing published to a registry, so decision 1's line is uncrossed. It also keeps the drive honest: the Cowork half has to install this the way a user would, and a path install is the one shape that never resembles real use.
- **The built `dist/server.js` is committed** — a marketplace install fetches files and runs no build step, so `mcp/dist` leaves `.gitignore` and a rebuild-and-diff suite check keeps the bundle from going stale silently. The price of registry-free distribution, paid in one file.
- **The plugin's server entry passes no `--root`.** Correct in Claude Code, where cwd is the repo; refused at launch in Cowork, where cwd is `/` — the refusal doing exactly the job it was built for, failing where a reader can act. The hand-written `mcpServers` entry with an explicit root remains the documented Desktop/Cowork path, and the plugin's skills ride on whichever server is connected. Per-install root parameterization is worth revisiting only if the drive shows the two-config story confusing in practice.

### The route from here

Three tickets, blocked in sequence: [mcp-prose-and-discovery](wayfinder/tickets/032-mcp-prose-and-discovery.md) (the server repairs), [bcc-plugin](wayfinder/tickets/033-bcc-plugin.md) (manifest, bundle, two skills, the agent), and [workshop-drive](wayfinder/tickets/034-workshop-drive.md) — a real facilitated session in both hosts, whose observations are the (build `bcc_write_section` / leave it / the tools were already enough) fork this grilling deliberately left to evidence. The map's Destination gains the second gate.
