The extension puts the drawn sheet in VS Code's built-in markdown preview, live:
edit the canvas, and every preview holding a fence to it redraws — including a fence
pointing at a file you have not written yet, which heals the moment you write it.

:::note
Reload any window that was already open (Developer: Reload Window) — a window builds its markdown engine at startup and keeps it.
:::

There is no marketplace listing. Build a `.vsix` from a checkout of the
repo and install it by hand:

:::term
```console
$ cd vscode && npx --yes @vscode/vsce package --no-dependencies
$ code --install-extension bc-canvas-fence-0.0.1.vsix
```
:::

A fence that cannot be drawn gets the same visible placeholder as everywhere else;
the full detail, which names paths on your machine, goes to an output channel
instead — **BC Canvas: Show fence log** in the command palette. A
problem is reported once, not once per keystroke.

### Where it does not reach

- **Notebook cells.** The notebook markdown renderer runs in a webview
  with no filesystem; a `bcc` fence there stays a code block.
- **Web hosts** (vscode.dev, github.dev) have no filesystem for a
  synchronous render to read, so the extension does not load there.
- **A file opened outside any workspace folder** resolves against its
  own directory — a pointer beside it reads, `../` does not.
