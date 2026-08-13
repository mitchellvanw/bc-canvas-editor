---
name: remark-plugin
title: "Task: one remark plugin, every unified-based site"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [fence-shape, headless-renderer, fs-seam]
---

## Question

The best leverage on the map: one plugin covers Astro, Docusaurus, Eleventy and everything else built on unified, because they all expose remark or rehype rather than a diagram API of their own. Build-time, no client bundle, no marketplace, no review queue.

The shape is small — visit `code` nodes with `lang === 'bcc'`, resolve the fence per [fence-shape](wayfinder/tickets/052-fence-shape.md), call the renderer, replace the node with a raw `html` node. What deserves care is everything around it:

- **The `html` node only survives if the pipeline allows raw HTML.** `remark-rehype` drops it unless `allowDangerousHtml` is set, and MDX handles it differently again. Name what each target needs, and what a user has to configure — a plugin that silently renders nothing on a default Docusaurus install is worse than one that says why.
- **The CSS has to reach the page.** The renderer emits scoped CSS and tokens; a site's pipeline has no obvious place to put them. [fence-shape](wayfinder/tickets/052-fence-shape.md) decision 9 fixed the half that both adapters must share — `fontFaceCss()` exactly once per document, before the first fence, since the fonts are ~200 KB and identical every time — and left the scoped CSS free to ride in the same preamble or repeat per fence. Tokens stay on each fence's wrapper ([renderer-shape](wayfinder/tickets/050-renderer-shape.md) decision 5): 26 declarations, not a stylesheet, and the thing that stops a fence repainting its host. What is still open here is *where* a unified pipeline can put a preamble at all — a `<style>` hoisted into the page, or a stylesheet the user imports.
- **Where the sheet's CSS meets the site's.** Docusaurus and Astro ship their own resets and prose styles. The sheet uses generic class names (`.panel`, `.grid`, `.prose`, `.stack`) under Svelte's scoping hash — verify the hash actually isolates it rather than assuming, since a collision here shows up as a subtly wrong sheet rather than a broken one.
- **Path resolution** from the VFile, per 052: relative to the markdown file, `../` legal, leading `/` refused, and containment through `CanvasRoot` with the VFile's `cwd` as the root. The whole step is `readCanvas(root, path)` — which [fs-seam](wayfinder/tickets/061-fs-seam.md) puts in `src/lib/fs/` — so this plugin writes no resolution logic of its own.
- **Failure**, per 052, in the build-time flavour: a visible preamble-free placeholder carrying `readProblem`'s sentence, `detail` on a VFile message rather than the page, and **the build does not fail** — a site escalates through its own fail-on-warn if it wants to. What is left here is the mechanics: which VFile message API, and whether the placeholder survives the same `allowDangerousHtml` gate the sheet does (if it does not, a broken fence in a default pipeline renders nothing, which is the one outcome 052 refused).

Verify against **at least two** of the three targets, not one — the whole claim of this ticket is portability across the unified ecosystem, and one target proves nothing about that. Evidence in `.scratch/remark-plugin/`, per the checkpoint habit.

Done when a markdown file containing a `bcc` fence renders the sheet on two unified-based site generators from a real build, the CSS story is documented for a user who has neither read this ticket nor this repo, and a broken fence behaves the way 052 said it should.

## Resolution

**Built, and both targets render from a real build against `npm pack` — Astro with nothing configured, Docusaurus with two things, neither of them guessable.** Evidence in `.scratch/remark-plugin/`: two scratch sites, three screenshots, both build logs, and `NOTES.md`.

The plugin is 110 lines and holds almost nothing. `src/lib/fence/fence.ts` is the new home of everything 052 settled — the grammar, the resolution, the placeholder, the preamble — and `remark/src/plugin.ts` is left with the three things that are genuinely unified's: walking mdast for `code` nodes, replacing them with raw `html`, and putting the sentence on a VFile message. **That split is a call this ticket made rather than found.** 052's argument for one contract was that a rule living in the fence is a rule two adapters will eventually disagree about; a shared module is that argument taken literally, and it means [vscode-extension](wayfinder/tickets/058-vscode-extension.md) writes an adapter rather than a second implementation. `remark/` mirrors `cli/`: a directory of the root package, not a third package, reached as `bc-canvas-editor/remark` through a new `exports` map, with `remark/dist` added to `files` and the bundle committed and dependency-free for the reasons [cli-home](wayfinder/tickets/051-cli-home.md) already paid for.

### The two things Docusaurus needs, and the second one is a defect in the plan

**1. MDX has no raw HTML.** A default Docusaurus build fails outright — `Cannot handle unknown node 'raw'` — identically for `.md` and `.mdx`, since both go through MDX v3. It is fixed from the site's config with `rehype-raw` and MDX's five node types passed through, which is the documented recipe rather than anything of ours. Loud failure, cheap fix, one README block.

**2. React's server render escapes the text inside `<style>`.** This is the one the ticket could not have predicted and the plan did not survive. With raw HTML working, the build succeeded and **the sheet came out in Times**: React escapes every element's text children, `<style>` included, and `<style>` is a raw-text element the HTML parser never un-escapes — so `font-family: 'Archivo'` arrived as `font-family: &#x27;Archivo&#x27;`, and with it every `[data-meaning="event"]` selector and every `>` combinator in the sheet's 15 KB of scoped CSS. Nothing in the fence can dodge it: quotes and combinators are `CanvasSheet.svelte`'s own CSS, and policing them from an adapter would be a rule the sheet must never break for a reason it cannot see.

So the ticket's open question — *"where a unified pipeline can put a preamble at all — a `<style>` hoisted into the page, or a stylesheet the user imports"* — is answered **both, and which one is not a preference**. `remark/dist/sheet.css` falls out of `remark/build.js` from `fontFaceCss()` and `renderSheetParts()` themselves, is exported as `bc-canvas-editor/sheet.css`, and `{ css: 'imported' }` suppresses the inline preamble. Inline stays the default because a zero-config Astro install has to work, and an unstyled sheet is worse than a placeholder — it is the silent-wrong-render 052 refused. Imported is the better answer for any multi-page site anyway: ~190 KB of fonts fetched once and cached rather than per page.

### Nine calls the ticket left open

1. **`readProblem` gained two levels of disclosure**, `readProblem(result, { detail: false })`, which is SPEC §3.3's own rule rather than a second one — the detail is shown where the offending bytes are on screen, and a rendered page is the case §3.3 was not written for. The deciding argument turned out not to be tidiness: `unreadable`'s detail is the filesystem's message and `outside-root`'s whole sentence is the root's name, so a placeholder carrying either **publishes the author's absolute paths to strangers** on a built site. This corrects `read.ts`'s own doc comment, written by [fs-seam](wayfinder/tickets/061-fs-seam.md) one ticket after 052 said the opposite. Two committed bundles rebuilt for it; the MCP diff is exactly the one function and no string it emits changes.
2. **The scoped CSS is hoisted with the fonts, not repeated per fence.** 052 decision 9 permitted this and left it open; it is taken, and the property it rests on is pinned rather than assumed — all four examples produce byte-identical CSS at 15,312 bytes, including the deliberately sparse mid-workshop one. Svelte injects a component's whole stylesheet whatever its branches took, but that is its behaviour and not its contract.
3. **The preamble goes at the top of the document**, not beside the first fence, so that a fence nested in a list or a blockquote is still preceded by it.
4. **The root is opened once per root and cached across documents**, not once per file: a docs build walks hundreds of markdown files and every one would otherwise re-`realpath` the same directory.
5. **The pointer is turned root-relative before `readCanvas` sees it**, which is what makes every sentence name the path the way the repo does rather than the way this machine does.
6. **The placeholder is a lead plus the sentence** — *"This bcc fence didn't render."* over the path — in the sheet's own paper register, styles inline, no class names, no fonts, nothing it can depend on. One `<div>`.
7. **`file.message(reason, node)` is the channel**, with `source`/`ruleId` set so a fail-on-warn pipeline can select on it. **Neither Astro nor Docusaurus prints VFile messages**, measured in both build logs, so on those targets the placeholder is the whole story and `detail` reaches nobody. The message is still right: it is unified's own channel, and a plugin writing to stderr from inside someone else's build would be shouting over its host. The README says so plainly rather than implying a channel that is usually deaf.
8. **`lib` is `es2023` with no `dom`**, unlike `cli/tsconfig.json` — a fence draws through `$lib/render` and `$lib/fence` and touches nothing browser-shaped, so the guarantee is free here where the CLI had to buy it back with a runtime test.
9. **A fence may sit anywhere in the tree** — the walk recurses rather than scanning top-level children — and every other fence, `js` or bare, is untouched.

### What was checked rather than assumed

The isolation question cuts both ways and both were measured in the built pages. Docusaurus's Infima resets and prose styles do not reach inside the sheet: every class carries Svelte's `svelte-18zyimi` hash. And the sheet does not reach out — `--color-ink` is unset on `:root` on both sites and each keeps its own `body` font, which is [renderer-shape](wayfinder/tickets/050-renderer-shape.md) decision 5 doing exactly the job it was written for, now that a whole site imports the stylesheet. One live surprise, harmless: **Docusaurus's PostCSS rewrites our stylesheet**, expanding `system-ui` inside `--font-sans` into a device stack — Archivo is embedded and first, so nothing downstream of it is ever reached.

The sheet at 823px inside Docusaurus's content column engages the `@container` two-column tier, which is the responsive work from [canonical-v5-checkpoint](wayfinder/tickets/040-canonical-v5-checkpoint.md) earning its keep on a surface it was not written for.

**Eleventy, the ticket's third name, is the odd one out**: its markdown is markdown-it, not unified, so it is not a remark host by default. Astro and Docusaurus are the two, and the claim they carry is about unified rather than about themselves.

### Two things that were in the way

`examples/` held eight untracked renders from [bcc-cli](wayfinder/tickets/055-bcc-cli.md)'s verification, which made `bcc check`'s test read *"8 canvases check out"*. They are moved to `.scratch/stray-renders/` rather than deleted, and [committed-images-build](wayfinder/tickets/062-committed-images-build.md) is the ticket that authors the real ones — and that will have to update that same assertion when it does. `cli/dist` and `mcp/dist` were both stale after the `read.ts` edit, caught by their own guards, rebuilt in order.

SPEC §1 gains the fence; `CONTEXT.md` gains **Fence** — the entry 052 deferred to whichever adapter landed first — carrying **adapter** with it. §10 gains nothing: like the CLI's, these strings are read by a developer at a build, and their register is deliberately not §10's.
