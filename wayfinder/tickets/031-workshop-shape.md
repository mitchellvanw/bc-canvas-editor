---
name: workshop-shape
title: "Grilling: what does the facilitated workshop need, now that day one has been driven?"
labels: [wayfinder:grilling]
status: open
assignee:
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
