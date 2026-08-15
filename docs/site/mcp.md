The server's whole job is getting a canvas into a conversation, as prose. It never
writes — changing files is `bcc`'s job — and that split is the design:
reading is a server, writing is a command line, and the plugin is what knows the
choreography. stdio only; nothing leaves the machine.

### Install

The server ships inside the **bc-canvas** plugin, together with two
skills and a reviewer agent. There is nothing to build — the plugin carries the
server ready to run, and Node is its only requirement:

:::term
```console
/plugin marketplace add mitchellvanw/bc-canvas-editor
/plugin install bc-canvas@bc-canvas-editor
```
:::

The plugin does not carry `bcc`; set up the
[`npx` alias](#cli) in the project you are working in.

### What the server offers

- **`bcc_read_canvas`** — one canvas as prose: the sheet in
  words, a third to a half shorter than the file. It reads a
  `.bcc.json` or the canvas embedded in a `.bcc.html`, and
  brings an older file up to date on the way through.
- **`bcc_explain`** — what a section is for, in the
  ddd-crew's own questions, with the vocabulary it draws on and a row to calibrate
  against.
- **Resources** — every canvas under the root, at
  `bcc://canvas/<path>`. Attach one from the host's own UI to give
  a conversation a context to work against.

### What the plugin adds

The facilitation layer, findable by typing `/` and the name:

- **canvas-workshop** — a facilitated session. The model asks, one
  section at a time; you answer; the sheet fills in your words, and what you defer
  lands under Open questions instead of staying silently blank.
- **draft-canvas-from-code** — a draft drawn from what the code shows,
  handed back for correction. The judgments a codebase cannot answer arrive as open
  questions rather than invented rows.
- **canvas-reviewer** — an agent that reviews by asking: it names what
  is missing or thin and puts the open questions back to you, answering none of
  them.

### Claude Code, and Claude Desktop

:::note
Export or close an editor tab before you let an agent write — an export from that tab lands on top of the agent’s file, silently.
:::

In Claude Code the plugin is the whole setup: the server's root defaults to the
project the session started in, and `bcc` runs over Bash like any other
command. Claude Desktop has no shell, so it has no `bcc` — Desktop gets
reading and explaining, and the skills cannot write there. Desktop also starts
servers at the filesystem root, so `--root` is required — the plugin's
own server entry leaves it out and is refused at launch rather than walking your
disk. Connect the server yourself, naming the directory your canvases live under:

:::filecard{name="claude_desktop_config.json"}
```
{
  "mcpServers": {
    "bc-canvas": {
      "command": "node",
      "args": [
        "/path/to/bc-canvas-editor/mcp/dist/server.js",
        "--root", "/path/to/your-project"
      ]
    }
  }
}
```
:::

`--root` is the only directory the server reads — a path that resolves
outside it is refused, symlinks followed out of it included — and it is fixed for
the life of the config, whichever project you happen to be standing in.

### Conflicts

There is no conflict check — no mtime, no revision hash. Canvases are committed
files, so git is already the conflict detector and git is already the undo;
anything here would be a second, weaker history. The rest — protocol revision,
development setup, what the resource listing leaves out and why — is in
[mcp/README.md](https://github.com/mitchellvanw/bc-canvas-editor/blob/main/mcp/README.md).
