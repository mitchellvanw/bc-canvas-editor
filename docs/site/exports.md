Five ways out of the browser; two of them come back. The split is the one that
matters, because the editor's only dirty state is a canvas that has not left in a
form that can return — and the editor's export and `bcc render` call the
same function, so the files are byte-identical whichever wrote them.

::::grid{cols="even"}

:::card{label="comes back" tone="solid"}
- `.bcc.json` — Canvas file

  The canvas itself. The durable form; everything else is derived from it.

- `.bcc.html` — HTML artifact

  One self-contained file for sharing: all three views pre-rendered so none
  needs script, with the Canvas file embedded inside — importing the artifact
  recovers the canvas whole.
:::

:::card{label="one way out" tone="dashed"}
- `.bcc.svg` — image

  The sheet as one self-contained image — the one meant to be
  *committed* beside its canvas, so any markdown host that will never
  draw a fence can still point an `<img>` at it.
  `bcc check` re-renders committed images and compares bytes, so a
  stale picture fails a check instead of being believed.

- `.bcc.png` — image

  The sheet as pixels, for chat and slides.

- `.bcc.md` — Markdown

  The canvas as prose. There is no Markdown import — keep the Canvas file if
  you mean to edit again.
:::

::::
