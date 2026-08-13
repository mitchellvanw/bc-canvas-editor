---
name: fence-shape
title: "Grilling: what goes in a bcc fence, and what comes out of it"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

The fence is the whole user-facing idea — ` ```bcc ` in a markdown file — and both adapter tickets ([remark-plugin](wayfinder/tickets/057-remark-plugin.md), [vscode-extension](wayfinder/tickets/058-vscode-extension.md)) need its contract before they can be written.

### 1. The payload

Measured on `order-fulfillment` during charting:

| | | |
|---|---|---|
| The Canvas file JSON | 168 lines / 3,851 bytes | Zero new machinery. SPEC §3.2 requires all eleven keys present, so even an empty canvas costs ~15 lines of boilerplate, and `serialize.ts` escapes every `<` as `<` — correct for the artifact's script embed, unpleasant to read in a fence. |
| A terse DSL | 40 lines / 1,708 bytes | **Ruled out of scope on the map.** Recorded here so the ticket does not re-open it. |
| A pointer | 1 line / 49 bytes | `docs/contexts/order-fulfillment.bcc.json`. One parser, one format, one source of truth. |

The pointer is the map's expectation and the argument for it is structural rather than economic: mermaid inlines its source because a diagram has no other home, and a canvas already has one — [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) decision 2 fixed canvases as committed files beside the code they describe. Inlining would duplicate the canvas into markdown and create the sync problem this project has avoided everywhere else; a pointer makes the markdown file **a fourth View of one canvas**, which is a concept the codebase already runs on (`CONTEXT.md`).

Settle it, and settle its edges: does the fence accept *both* a pointer and inline JSON (a machine-written fence is a real case — the MCP server or an agent emitting one into a doc)? If both, what disambiguates them, and does accepting inline JSON quietly reintroduce the sync problem the pointer was chosen to avoid?

### Inputs from [vscode-preview-spike](wayfinder/tickets/053-vscode-preview-spike.md), settled before this ticket opens

**The pointer fence stands** — a synchronous disk read inside a markdown-it *renderer* rule works, because `extendMarkdownIt` runs in the extension-host process with full Node rather than in the webview. This ticket does not need to redesign around a read it cannot do. Four items to absorb into the contract:

1. **Resolution must happen in a renderer rule, not a parse rule.** `env.currentDocument` is populated at render and hard-coded `undefined` at parse, and parse output is cached against document text — so a `core`/`block`/`inline` rule can neither see the document nor re-run when a *referenced* file changes.
2. **The read must be synchronous.** Renderer rules return a string; there is no async escape. Whatever this ticket specifies has to be satisfiable by `readFileSync`.
3. **There is a no-document case that needs defined behaviour.** `env.currentDocument` is `undefined` when a caller passes a string rather than a document — which the public `markdown.api.render` command does. A readable refusal, not a throw.
4. **Containment has a natural ceiling worth matching deliberately.** `localResourceRoots` already stops at the workspace folders, so a pointer escaping the repo is refused by the platform for *assets* — but the extension host would happily read the JSON. The fence should refuse it itself, at the same seam `root.ts` uses, rather than relying on a platform behaviour that only covers half the case.

And one limit that is a fact about the fence rather than about VS Code: **a `bcc` fence in a notebook cell will not resolve a pointer.** The notebook markdown renderer is a separate contribution with no Node and no `env.currentDocument`. If notebooks matter, that is an argument for accepting inline JSON as well — and if they do not, say so here so nobody rediscovers it.

### 2. Path resolution

`ctx.sourcePath` in Obsidian, the VFile path in remark, the document URI in VS Code — every adapter can resolve a path relative to the markdown file. Decide the rule once: relative to the markdown file, or to a repo root? What about `../`, absolute paths, and a path escaping the repo — the MCP server answers exactly this with `root.ts`'s containment seam, and the fence should not answer it differently.

### 3. What renders

The `.bcc.html` artifact carries all three Views. A fence almost certainly wants the Sheet alone — a JSON dump in a README is nobody's diagram. Confirm, and decide whether the fence can ask for something else (` ```bcc view=markdown `), or whether options are a thing this fence simply does not have.

### 4. Failure

The pointer names a file that does not exist, or names one that is not a Canvas file, or names one written by a newer format version. `parseCanvasFile` already produces a path-carrying refusal for the last two (SPEC §3.3), and there is a live precedent for how much of it to show: SPEC's rule is that `detail` reaches a human *where the offending bytes are on screen* — the JSON View shows it, the import dialog withholds it. A fence in a build is neither. What does a reader of the rendered markdown see, and what does the build do — warn and render nothing, warn and render a placeholder, or fail the build? These differ per surface: a broken fence in VS Code's live preview and a broken fence in a CI docs build are not the same event.

### 5. The fence name

`bcc` is the assumption. It is unclaimed, matches the file extension family, and is short. Confirm or change it now — it is the one decision here that is expensive to revisit, because it lands in every markdown file anyone writes.

Done when a fence's content, its resolution rule, its output and its failure behaviour are pinned tightly enough that two adapters can be built from this ticket without agreeing anything further between themselves.

## Resolution

**A `bcc` fence holds one path to a Canvas file and nothing else, resolved relative to the markdown file that holds it, rendered as the Sheet alone.** The fence adds no parser, no second opinion about what a Canvas file is, and no options — because the resolution step it needs already exists as `readCanvas`, and every rule the fence could invent on top of it is a rule that would have to be re-implemented identically in two adapters and would eventually not be.

### The contract, in one place

```
info string   `bcc`, exactly. A tail after it is a refusal, not an ignored option.
body          one line: a path to a Canvas file. Nothing else — no JSON, no
              second path, no comments. Surrounding whitespace is trimmed.
resolution    relative to the markdown file holding the fence. `../` legal.
              Leading `/` refused. Escaping the root refused.
              `readCanvas(root, path)` — containment, read and parse in one call.
              Synchronous, in a renderer rule, per 053.
output        the Sheet, from `renderSheetParts`. No other View, ever.
preamble      `fontFaceCss()` exactly once per document, before the first fence.
failure       a visible, preamble-free placeholder in the fence's place, carrying
              `readProblem`'s sentence. `detail` goes to the adapter's warning
              channel, never the placeholder. The build does not fail.
```

### The nine decisions

**1. The name is `bcc`.** Confirmed rather than re-argued: it matches the extension family, it is short, and it is claimed by neither Linguist nor highlight.js — so a surface that does not know the fence renders it as an unhighlighted code block rather than mis-highlighting it as something else. This is the one decision here that is expensive to revisit, and it is now spent.

**2. A pointer, and only a pointer — one per fence.** The structural argument was already on the ticket (mermaid inlines because a diagram has no other home; a canvas has one, fixed by [mcp-server-shape](wayfinder/tickets/025-mcp-server-shape.md) decision 2). Grilling added a second that cuts the same way: **on any surface that does not know the fence, the fence's content is what a reader sees.** A path is a readable fallback that says where the canvas is; 168 lines of JSON with every `<` escaped as `&lt;` is a wall in the middle of a README. Inline JSON was the live alternative and it is refused, because it has no reconciliation story — a canvas inlined in a doc and the same canvas on disk drift silently, with no dirtiness flag anywhere in this project able to catch it, and the machine-writing case it was meant to serve has the better move already available: write the file, point at it.

The consequence is stated rather than left to be rediscovered: **a `bcc` fence in a notebook cell will never render.** The notebook markdown renderer is a separate contribution with no Node and no `env.currentDocument` ([vscode-preview-spike](wayfinder/tickets/053-vscode-preview-spike.md)), so a pointer cannot resolve there and inline JSON was the only thing that would have worked. Notebooks are not a surface this map serves.

**3. Paths resolve relative to the markdown file holding the fence.** It is the only thing all three adapters have without inventing anything — `ctx.sourcePath`, the VFile path, the document URI — where relative-to-repo-root would need each adapter to *find* a root and they would disagree about how (git dir, workspace folder, nearest manifest). It also makes a doc and its canvases movable as a unit. `../` is legal, because `docs/architecture.md` pointing at `../examples/order-fulfillment.bcc.json` is the ordinary case rather than the exotic one. **A leading `/` is refused**: it reads as repo-root-relative to anyone who has used a static site generator and as a filesystem absolute to `readFileSync`, and one syntax carrying two meanings is how the two adapters end up disagreeing in a way nobody notices for a year.

**4. Containment is `CanvasRoot`, with the adapter supplying the root** — VS Code the workspace folder holding the document, remark the VFile's `cwd`, `bcc` its `--root`. [vscode-preview-spike](wayfinder/tickets/053-vscode-preview-spike.md) found `localResourceRoots` stops at the workspace folder for *assets* while the extension host would happily read the JSON, so the platform covers half the case; the fence refuses at the same seam the server uses rather than inheriting half a rule. This gives `OutsideRoot`'s audience-neutral rewrite in [fs-seam](wayfinder/tickets/061-fs-seam.md) a third reader — worth knowing before that copy is written, since it is now a sentence for a model, a developer at a terminal, *and* a developer reading a preview.

**5. The Sheet alone, and the fence has no options.** A JSON dump in a README is nobody's diagram and a Markdown View inside a markdown file is a joke the file is already telling, so `view=` had no case to answer. The live half was what an *unrecognised* tail does, and it is **refused, not ignored** — silently ignoring means a typo renders the wrong thing quietly, where refusing keeps the grammar genuinely open for later, since nothing will have been accepted with the wrong meaning in the meantime. The cost is one refusal string now.

**6. The fence resolves through `readCanvas`, and `read.ts` moves with the filesystem seam.** This is the decision the ticket did not know it was making. `readCanvas(root, input)` is already containment-then-read-then-parse returning a closed union — `outside-root`, `unreadable`, `newer-version`, `not-canvas` — which is decisions 3, 4 and 8 already implemented and tested, and `readProblem` already turns each into one path-first sentence in exactly the register the fence needs. So the fence writes no resolution logic of its own.

**Amendment to [fs-seam](wayfinder/tickets/061-fs-seam.md), which is on the frontier and does not know this yet:** `mcp/src/read.ts` and `readProblem` from `mcp/src/errors.ts` move to `src/lib/fs/` with the rest of the cluster. That ticket's inventory was right when written — the server was the only caller — and the fence makes it three. Leaving `read.ts` in `mcp/` would have the remark plugin and the VS Code extension importing out of the *plugin* package, inverting the seam [cli-home](wayfinder/tickets/051-cli-home.md) just established. `readRefusal` and `refuse` stay behind: they are MCP-shaped down to `isError` and the tool names in their tails.

**7. A pointer may name whatever `readCanvas` accepts** — which includes a `.bcc.html` artifact carrying an embedded Canvas file, since it parses through `parseCanvasImport`, the same acceptance the editor's Import… has. Requiring `.bcc.json` was the instinct and it is wrong: it is a rule existing only in the fence, and `read.ts` is explicit that it declines to hold a second opinion about what a Canvas file is. Pointing a fence at an artifact to re-render it is a strange loop, and a harmless one. Anything that is not a canvas already fails as `not-canvas`, with a sentence.

**8. Failure is always a visible placeholder, and the build never fails.** Six cases, one shape. Four are `CanvasRead`'s reasons and take `readProblem`'s sentence; two are fence-only and have no reason behind them — the no-document case (`markdown.api.render` passes a string, per [vscode-preview-spike](wayfinder/tickets/053-vscode-preview-spike.md) item 3) and a malformed fence (a tail after `bcc`, an empty body, more than one line). Silence is never an option: a reader who sees a gap where a diagram should be learns nothing.

**`detail` is withheld from the placeholder and carried on the adapter's warning channel** — a VFile message in remark, the output channel in VS Code. This keeps SPEC §3.3's rule by its reasoning rather than its letter. The rule is that `detail` reaches a human *where the offending bytes are on screen*, and a rendered markdown file is the case it was not written for: the offending bytes are in a *different file*. The placeholder is not where they are; the developer's channel is where the action is.

**The build warns and does not fail.** A docs build that dies on a broken fence takes the choice away from the site, where a VFile warning lets a pipeline escalate through its own fail-on-warn setting. Choosing failure for someone else's build is not this project's call to make.

Draft strings for the two fence-only refusals, in `errors.ts`'s register — path first, one step more technical than the app. Shape confirmed, bytes pending a `writing-copy` pass in whichever adapter lands first:

> `docs/contexts/order-fulfillment.bcc.json: no document to resolve against; a bcc fence needs the location of the file that holds it.`
> `bcc takes no options; this fence's info string reads "bcc view=markdown".`
> `A bcc fence holds one path to a Canvas file and nothing else.`

**9. One preamble per document; the placeholder needs none.** [renderer-shape](wayfinder/tickets/050-renderer-shape.md) decision 6 left de-duplication expressible rather than flagged, and this is where it is exercised. [vscode-preview-spike](wayfinder/tickets/053-vscode-preview-spike.md) found `localResourceRoots` — not CSP — stops an extension serving a font from its own directory, so **the fonts must be base64 inline**, which at ~200 KB makes three self-contained fences in one document 600 KB. So `fontFaceCss()` is emitted **once per document**, before the first fence, hoisted by the adapter: trivial in remark, and available in VS Code through a flag on `env`, which is per-render and therefore correctly scoped. The same hoisting is *permitted but not required* for the sheet's scoped CSS — it is byte-identical across fences and does not depend on which canvas is drawn — so an adapter may lift it into the same preamble; the requirement is only that whatever the preamble holds is emitted exactly once and before the first fence. Tokens stay on each fence's own wrapper, per [renderer-shape](wayfinder/tickets/050-renderer-shape.md) decision 5, and are 26 declarations rather than a stylesheet.

**The placeholder is preamble-free** — plain markup with its handful of styles inline, identical in both adapters. It is the one output that renders when everything else has failed, which makes it the worst possible candidate for depending on a preamble that may be exactly what failed.

### What is not decided here

`CONTEXT.md` gets no **Fence** entry yet. The term is settled, but the glossary describes the app as it is, and this would be its first entry for a surface nobody can use; it lands with the first adapter, alongside whatever [headless-renderer](wayfinder/tickets/054-headless-renderer.md) does to **Render**. SPEC is untouched for the same reason and by the same precedent [renderer-shape](wayfinder/tickets/050-renderer-shape.md) and [cli-home](wayfinder/tickets/051-cli-home.md) set — §1 and §10 are amended when the strings exist.

Left to the adapters, deliberately, because they are surface-local rather than contract: what a build has to configure for a raw `html` node to survive ([remark-plugin](wayfinder/tickets/057-remark-plugin.md)), and re-rendering when the *canvas* changes under a live preview ([vscode-extension](wayfinder/tickets/058-vscode-extension.md)). Neither is something the two adapters need to agree with each other about.
