---
name: review-prompt-and-readme
title: "Task: the review-canvas prompt and the server's README"
labels: [wayfinder:task]
status: closed
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

## Resolution

Built on `main` (`17aeece`). `mcp/src/prompt.ts` and `mcp/README.md` are new; `errors.ts` grows one function, `server.ts` and `resource.ts` each change two lines, and the root `README.md` gains a pointer paragraph. 81 tests in the package, 312 in the app, both green; `tsc --noEmit` and `svelte-check` clean.

### `review-canvas`

`server.registerPrompt('review-canvas', …)` with `title: 'Review a canvas'` and one required argument, `path`, wrapped in `completable()` over `catalog(root)` — the same listing `bcc_list_canvases` and the resource template read, so a Desktop user with no filesystem picker types against what is actually there. `capabilities` gains `prompts: {}`; it is declared rather than inferred, as the other three are.

Two user messages. The first is an **embedded resource** carrying the digest under the canvas's own `bcc://canvas/<path>` URI and `text/markdown`, so the review costs no round trip and the host can render the same thing it would render if the canvas had been attached. The second is the facilitation body, which closes by naming the path to write back to and pointing at `view: 'json'` for the exact bytes.

The body as written:

> Review the canvas above the way a facilitator would: by asking, not by filling in.
>
> Say back:
>
> - What this context is responsible for, in one sentence drawn only from what the canvas says. If that sentence will not come out, say so — the canvas has not yet settled what the context is for.
> - Which sections are empty, and which of those matter for a context like this one. An empty section is a question nobody has answered yet.
> - Where the canvas disagrees with itself: a business decision nothing inbound triggers, an outbound event no collaborator consumes, a word the description leans on that the ubiquitous language never defines.
> - The questions the canvas raises, alongside the ones already under Open questions.
>
> Leave the questions open. Do not answer them and do not draft the rows that are missing: the answers belong to the people who own this context, and an invented collaborator is harder to get out of a canvas than a blank line is to fill.
>
> Call bcc_read_canvas with view: 'json' if you need the exact file, and bcc_write_canvas back to `<path>` once those questions have been answered.

The four bullets are ordered so the questions come last and the prohibition lands after them, where it is about to be violated. "Identify gaps and suggest improvements" — the phrasing the ticket warned about — is what produces eleven plausible sections nobody agreed to; the last paragraph says why not filling them in is the point, because a model told only *not* to do something reliably finds a way to be helpful anyway.

The prompt's own `description` field is set per call to `Review <canvas name>` (the path where the canvas is unnamed) — hosts show it above the thread, and "review-canvas" there says nothing the menu item did not already say.

### The `-32602` path

Accepted as the ticket framed it, and made precise: a bad `path` throws `ProtocolError(INVALID_PARAMS, …)` rather than a bare `Error`, so the wire code is `-32602` and not `-32603`. The message is the same sentence the resource template would have thrown — a newer format version, a traversal out of the root, or the parser's path-carrying detail from ticket 026 (`name: expected a string, got a number`).

That sentence now has one home. `errors.ts` gains **`readProblem(result): string`**, and `resource.ts` was rewritten onto it; both surfaces are JSON-RPC-error-shaped, with no tool result to put a teaching refusal in, and a third hand-written copy of the four branches was one too many. `readRefusal` is unchanged — it says more, because a tool result can be answered.

### `mcp/README.md`

Sections: what it is, install, Claude Code, Claude Desktop, what it offers, what counts as a canvas, conflicts, protocol, development, attribution.

- **Both hosts, split by why.** Claude Code gets `claude mcp add bc-canvas -- node …/dist/server.js` and one line saying no `--root` is needed because the default is the working directory. Desktop gets the `claude_desktop_config.json` block with `--root` spelled out, prefaced by the reason it needs one: no project directory to inherit.
- **The four tools in a sentence each, the prompt in two, the resource in one.** The prompt is named as the thing to reach for from Desktop, since it is the only day-one reason Desktop has anything to invoke.
- **The last-write-wins warning is its own section**, "Conflicts, and the tab you left open", and builds the antecedent before the consequence: no conflict check → because canvases are committed and git is the guard → the gap that leaves is a browser tab holding an older autosave → export or close the tab before letting an agent write. The remedy is the last sentence, not a footnote.
- **The extension rule with its reason**, in the section that also says what discovery walks and skips: `.bcc.json` is the key the listing globs on and what Import… accepts, so `shipping.json` is invisible to both.
- **Protocol in two sentences**: 2026-07-28 over stdio through `serveStdio`, 2025-era clients accepted, and clients older than 2025-06-18 get only the text because they do not understand structured results — which costs nothing, since the prose carries the same facts.

The root `README.md` gains one paragraph pointing at it. SPEC.md is untouched, per decision 23.

### Interpolations — for sign-off

1. **The digest goes first, the instructions second.** Both `role: 'user'`. The alternative — instructions, then the canvas — puts the prohibition further from the moment it matters.
2. **The prompt's per-call `description` is `Review <canvas name>`.** Not specified in (16); hosts display it, and the static name is dead weight there.
3. **`ProtocolError(INVALID_PARAMS, …)` rather than a thrown `Error`.** (16) named `-32602` as the accepted cost, and a bare throw would have produced `-32603` instead — the accepted cost, unaccepted.
4. **`readProblem` extracted and `resource.ts` moved onto it.** A shared sentence for the two JSON-RPC-error surfaces; a behaviour change in one branch, where an unreadable file now reads `<path>: could not be read (ENOENT …)` instead of the raw errno string.
5. **The README documents the discovery skip list and the `.bcc.html` read path.** Not in (23)'s list, but the first question a human asks of a server that globs their repo is what it walks.
6. **A pointer paragraph in the root `README.md`.** Decision 23 gives `mcp/README.md` the content; discovery still needs a door, and a link is not a second document.

### Test roster

`mcp/src/prompt.test.ts`, driving a real client over an in-memory transport:

- `prompts/list` returns the one prompt with `path` required, and `completion/complete` on `ref/prompt` returns the canvases matching a prefix.
- The first message is an embedded `text/markdown` resource at the canvas's `bcc://` URI, carrying the digest and not the JSON.
- The body says "by asking, not by filling in", "Leave the questions open", and "do not draft the rows that are missing" — the three sentences the whole prompt exists for.
- The write-back path is named; the per-call description is `Review Order Fulfillment`.
- A canvas read out of a `.bcc.html` artifact, since the prompt goes through the same door as everything else.
- Three failures, all `-32602`: a path naming nothing, a path leaving the root, and a file on disk that is not a canvas (which surfaces ticket 026's detail).

`mcp/src/server.test.ts` gains `prompts/list` at the raw-JSON-lines level against the built bundle, and asserts `capabilities.prompts` in the 2025-era `initialize` result.
