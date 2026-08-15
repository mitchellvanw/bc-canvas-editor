### Docusaurus

Docusaurus compiles both `.md` and `.mdx` through MDX, which fails the build on
a raw HTML node unless `rehype-raw` is in the pipeline. And it renders through
React, whose server pass escapes the text inside a `<style>` element — an
inlined stylesheet arrives mangled and the sheet draws in Times. So the CSS
comes from a file instead:
