One plugin covers every site generator built on
[unified](https://remark.js.org). Two lines for Astro; two paragraphs for
Docusaurus, because two of its choices fight raw HTML and inline styles. Install
this repo — there is no registry package; `#<sha>` pins a commit:

:::term
```console
$ npm i github:mitchellvanw/bc-canvas-editor
```
:::

### Astro

:::filecard{name="astro.config.mjs"}
```
import remarkBcc from 'bc-canvas-editor/remark';

export default defineConfig({ markdown: { remarkPlugins: [remarkBcc] } });
```
:::

### Docusaurus

Docusaurus compiles both `.md` and `.mdx` through MDX, which
fails the build on a raw HTML node unless `rehype-raw` is in the
pipeline. And it renders through React, whose server pass escapes the text inside a
`<style>` element — an inlined stylesheet arrives mangled and the
sheet draws in Times. So the CSS comes from a file instead:

:::filecard{name="docusaurus.config.js"}
```
// inside the docs/blog preset options
remarkPlugins: [[remarkBcc, { css: 'imported' }]],
rehypePlugins: [[rehypeRaw, { passThrough: ['mdxjsEsm', 'mdxFlowExpression',
  'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression'] }]]
```
:::

:::filecard{name="src/css/custom.css"}
```
@import 'bc-canvas-editor/sheet.css';
```
:::

### Anywhere else

Two rules. Raw HTML has to survive the pipeline — `remark-rehype` and
`rehype-stringify` both take `allowDangerousHtml: true` — and
the sheet's CSS has to reach the page one of two ways:

:::scroller
| `css` | what it does | when |
| --- | --- | --- |
| `'inline'` (default) | a `<style>` in the page, once, ahead of the first fence | one or two pages; nothing to configure |
| `'imported'` | nothing — you import `bc-canvas-editor/sheet.css` | React-rendered sites, and fences on many pages: the fonts are ~190&nbsp;KB and a stylesheet is fetched once |
:::

:::note
Most generators discard VFile warnings, so the placeholder in the page is usually the whole story a reader gets.
:::

The sheet brings its own fonts, its own reset and its own design tokens, all under
one `.bcc-canvas` wrapper — it neither picks up your site's styles nor
pushes anything onto the page around it. When a fence cannot be drawn, the
placeholder lands in the page and the plugin puts a warning on the VFile;
escalating is your site's call, through its own fail-on-warn. `root` is
the other option the plugin takes: paths never resolve outside it, and it defaults
to the directory the build runs in.
