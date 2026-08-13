---
name: remark-plugin
title: "Task: one remark plugin, every unified-based site"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [fence-shape, headless-renderer]
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
