`bcc` treats canvases the way a toolchain treats source: list them, check
them, format them, build artifacts from them. It runs in plain Node, straight off
this repo — nothing is published, and there is nothing to install:

:::term
```console
$ alias bcc='npx --yes github:mitchellvanw/bc-canvas-editor'
```
:::

:::note
Inside a checkout of this repo, run npm run bcc -- ls instead — the npx alias would fetch a second copy of the repo rather than the bundle you just built.
:::

The first call clones and installs; later ones come out of npm's cache and start in
about a second. `npx` resolves `main` at the moment it runs —
pin a commit (`…bc-canvas-editor#<sha>`) if you need
reproducibility.

:::term
```console
$ bcc ls                        # what canvases are here, what each is for, how full each one is
$ bcc check                     # do they all still read, and are the images beside them current
$ bcc fmt                       # canonical bytes, in place
$ bcc render orders.bcc.json    # the HTML artifact, beside the canvas
$ bcc render --svg orders.bcc.json
```
:::

`check` and `fmt` are what make a canvas behave like source
code rather than an attachment. `check` reads every canvas through the
parser the editor's Import… uses — a canvas that passes here opens there — and exits
1 if anything does not check out, stale images included. `fmt` rewrites a
canvas in its canonical bytes; `fmt --check` names what would change and
writes nothing, for CI. `render` writes the `.bcc.html`
artifact, or a `.bcc.svg` with `--svg` —
`--out <file>` redirects a single render, and only
`render --svg` ever needs a browser, and only to measure a height that
`--height <pixels>` can supply instead.

### The root, and what counts as a canvas

Every command takes `--root <directory>`: where `bcc`
looks, and the furthest it goes. It defaults to the working directory, and no
path — symlinks resolved first — ever reaches outside it. A canvas is any
`*.bcc.json`, or the canvas embedded in a `*.bcc.html`
artifact, found by walking the root and skipping hidden directories,
`node_modules`, `dist` and `build`. A directory the
walk cannot open stops that branch and nothing else; `bcc ls` names it at
the end rather than losing every canvas already found.
