---
name: review-prompt-and-readme
title: "Task: the review-canvas prompt and the server's README"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [mcp-tools-and-resource]
---

## Question

The two surfaces a human touches directly — the only day-one reason Claude Desktop has anything to invoke.

**`review-canvas`** (16):

- Required `path` argument, wrapped in `completable()` over discovered canvases. Prompt arguments and resource-template variables are the only places `completion/complete` applies at all, so this is the one spot in the design where the host can offer a picker.
- The prompt **embeds the digest** as an embedded resource rather than telling the model to call `bcc_read_canvas` — the user already picked a canvas, so "review this" shouldn't cost a round trip.
- Its body is facilitation copy and gets written as copy (`writing-copy`, the habit from ticket 011): read the canvas, name what is missing, and **ask the open questions back** rather than answering them. The temptation to write "identify gaps and suggest improvements" is exactly what produces a model that fills in plausible strings — the method's value is in the asking.
- Accept knowingly: a bad `path` surfaces as JSON-RPC `-32602`, blunter than a tool's teaching error. Acceptable when the path came from the server's own completion list.

**`mcp/README.md`** (23) — this is where a human learns the thing exists, so it is copy too:

- Install and the config snippet for both hosts, with `--root` explained: Claude Code gets the repo free via CWD, Desktop needs the folder named.
- What the four tools do, in a sentence each.
- **The last-write-wins warning** from (20), stated plainly: there is no conflict check because canvases are committed and git is the guard — but a browser tab holding an older autosave can export over the agent's work later. Say what to do about it (export or close the tab before letting an agent write), not just that it can happen.
- The `.bcc.json` extension requirement and why (21).
- One line on protocol support: 2026-07-28 via `serveStdio`, legacy clients accepted.
- A note that a pre-2025-06-18 client sees only the digest, since `bcc_write_canvas` declines the spec's advice to serialize its structured payload into a text block as well.

Resolution records the final prompt copy and the README as written.
