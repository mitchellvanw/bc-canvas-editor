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
- **The CSS has to reach the page.** The renderer emits scoped CSS and tokens; a site's pipeline has no obvious place to put them. Once per page in a `<style>`, or a stylesheet the user imports? Emitting the full token block per fence is the obvious wrong answer and the easy accident.
- **Where the sheet's CSS meets the site's.** Docusaurus and Astro ship their own resets and prose styles. The sheet uses generic class names (`.panel`, `.grid`, `.prose`, `.stack`) under Svelte's scoping hash — verify the hash actually isolates it rather than assuming, since a collision here shows up as a subtly wrong sheet rather than a broken one.
- **Path resolution** from the VFile, per 052, with the containment rule 052 chose.
- **Failure**, per 052, in the build-time flavour: what the build prints, whether it fails, and what lands on the page.

Verify against **at least two** of the three targets, not one — the whole claim of this ticket is portability across the unified ecosystem, and one target proves nothing about that. Evidence in `.scratch/remark-plugin/`, per the checkpoint habit.

Done when a markdown file containing a `bcc` fence renders the sheet on two unified-based site generators from a real build, the CSS story is documented for a user who has neither read this ticket nor this repo, and a broken fence behaves the way 052 said it should.
