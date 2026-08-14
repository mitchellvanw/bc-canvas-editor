---
name: mcp-diet
title: "Grilling: what is left for the server once the filesystem has a CLI?"
labels: [wayfinder:grilling]
status: open
assignee: mitchell
blocked-by: [workshop-drive, bcc-cli]
---

## Question

The same question the rest of this map asks, from the other end. With a CLI in the repo and Claude Desktop out of scope for now, what does an MCP server still do that only an MCP server can?

**The measurement** (charting, 2026-08-13, by driving the committed bundle over stdio): `tools/list` costs **3,526 tokens**, standing, every session, whether or not a canvas is ever touched.

| Tool | ≈ tokens | Share |
|---|---|---|
| `bcc_write_canvas` | 2,978 | 85% |
| `bcc_read_canvas` | 225 | 6% |
| `bcc_explain` | 205 | 6% |
| `bcc_list_canvases` | 115 | 3% |

For scale, a whole canvas costs 283–470 tokens as a digest — so the standing tax is eight to twelve canvases' worth of context. Of the write tool's 2,978, roughly 1,340 is generated vocabulary text, and 403 of that is the relationship one-liner block emitted **twice, byte-identically**, once for inbound and once for outbound.

### What the map has already settled

- The ticket **may propose the full re-shape** — server becomes the resource, `bcc_read_canvas` and `bcc_explain`; listing and writing become `bcc ls` and `bcc write`. Scoping it narrower now would decide the interesting question by declining to ask it.
- **The plugin's procedure moves in this ticket, not a follow-up.** [workshop-shape](wayfinder/tickets/031-workshop-shape.md) set the seam as server-owns-content, plugin-owns-procedure, so a tool moving to the CLI *is* a procedure change. Both skills name `bcc_write_canvas` and `bcc_read_canvas view:'json'` in nearly every step; `canvas-reviewer` names two tools. Splitting the rewrite out would leave the plugin instructing a tool that does not exist for as long as the second ticket sat open.

### What it has to weigh

1. **`bcc_list_canvases` cannot be replaced by the resource, and this is the trap.** `bcc://canvas/{+path}` already has `list`, path completion, and serves the digest and exact bytes under one URI — but resources are **application-driven** ([mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) decision 10). A person attaches one. A self-directed agent drafting from code cannot count on one being there, and "read the neighbouring canvas first" is the most valuable instruction in both skills. The replacement for the tool is `bcc ls` over Bash, not the resource.
2. **What survives the substitution.** In Claude Code, `bcc_list_canvases` ≈ `Glob`, `bcc_read_canvas view:'json'` ≈ `Read`, `bcc_write_canvas` ≈ `Write` plus `bcc check`. What no filesystem tool replaces: the **digest** (a rendering, not a read), the **vocabularies at the moment of the pick**, the parser's **path-carrying refusal**, **canonical byte identity**, and **empty-section accounting**.
3. **Decision 13 is what a vocabulary cut reverses**, and it had a real argument: the write schema makes the vocabularies *unskippable*, and *"a model confident enough to guess won't call `bcc_explain`, and a wrong-but-legal `conformist` is the failure this server exists to prevent."* Weigh against the fact that the tool is now three times the size that decision priced it at — `schema.ts:8` still says "about 400 tokens"; measured, the vocabularies alone are ~1,340.
4. **The cheap fix, and the one that does not work.** Hoisting the duplicated relationship block to a shared constant the way `explain.ts` does with `LANE_VOCABULARY` changes **nothing** in the emitted schema: Zod's default is `reused: 'inline'`, and the SDK converts with no `reused` option and no hook on the `inputSchema: <zod>` path. Forcing `$ref` means leaving Zod for the SDK's `fromJsonSchema()`, which swaps in ajv, changes the refusal path a model reads from `canvas.inboundCommunication.0.messages.0.type` to ajv's slash form, breaks `tools.test.ts:272-273`, and drops the typed handler destructuring. What *does* work is prose: `lane()` already takes `direction`, so emit the pattern list on the inbound lane only and have the outbound describe point at it. ~350 tokens, `properties` tree and every `.enum` structurally identical, `tools.test.ts:104-120` untouched.
5. **What `workshop-drive` found.** Its observations 1 and 5 — whether whole-document write loses or alters rows across eleven cycles, and whether read-before-write is honoured or silently skipped — are direct evidence for whether writing through a model is sound at all. This ticket is blocked on it for exactly that reason. If it found `bcc_write_section`'s trigger, that fires as its own map and this ticket has to say how the two relate.

### The costs of any cut

`mcp/dist/server.js` is committed and byte-diffed against a fresh build, so every change is source plus a rebuilt 1.2 MB bundle. Three tests pin the exact tool names and order (`tools.test.ts:84-89`, `server.test.ts:29` asserted in both protocol eras). And the tools cross-reference each other in **result text and refusals** — `errors.ts:51,55,67`, `tools.ts:61,178`, and `bcc_explain`'s own output — which is easier to miss than the descriptions and is where a removal actually cascades.

Done when the server's shape is settled with reasons, the plugin's skills and agent match it, `mcp/README.md` and the root README describe the server and the CLI as one story, both suites are green and the bundle is rebuilt.
