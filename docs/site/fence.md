A fence is how documentation stops lying: point it at the canvas, and the sheet is
drawn where the fence stands every time the file is built or previewed. The canvas
stays the single source, and the picture can no longer fall behind it.

::::grid{cols="wider-right"}

:::filecard{name="orders.md"}
````markdown
```bcc
../canvases/order-fulfillment.bcc.json
```
````
:::

:::card{label="what the fence draws" tone="framed"}
::figure{alt="The Order Fulfillment canvas as a rendered sheet"}
:::

::::

:::note
A leading / reads as the repo root to some tools and a filesystem path to others. Relative paths only — ../ is fine.
:::

One path, resolved relative to the markdown file holding it. Nothing else goes in
the fence — no JSON, no options. Everywhere the fence is *not* drawn, the
path is what a reader sees, which is why it holds a pointer rather than a canvas.

Two adapters draw it — the [remark plugin](#remark) when a site builds,
the [VS Code extension](#vscode) while you write — over one shared
contract, with the same renderer inlined into both: a fence means the same thing on
both, and the sheet it draws cannot drift from the one the editor exports. A fence
that cannot be drawn leaves **a visible placeholder saying why**, never
a blank, and the build or preview carries on.
