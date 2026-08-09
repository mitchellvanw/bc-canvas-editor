# bc-canvas-mcp

A local MCP server over the Bounded Context Canvas files in a project. It lists the canvases under a directory, reads them as prose or as their exact bytes, and writes them back in the form [BC Canvas](https://bc-canvas.pages.dev) imports — so an agent can draft a canvas from the code it is looking at, and read the neighbouring ones as context. stdio only; nothing leaves the machine.

The canvases are meant to be committed alongside the code they describe. That is the workflow, not a rule the server enforces: it works the same over a plain folder.

## Install

```sh
cd mcp
npm install
npm run build
```

`npm run build` bundles `dist/server.js`, which is what a host launches. The package is not published, so the snippets below need the path to this checkout.

## Claude Code

```sh
claude mcp add bc-canvas -- node /path/to/bc-canvas-editor/mcp/dist/server.js
```

No `--root` needed. The server defaults to its working directory, which is the project Claude Code started it in.

## Claude Desktop

Desktop starts the server at the filesystem root, so `--root` is not optional here — leave it out and the first listing tries to walk your whole disk. In `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"bc-canvas": {
			"command": "node",
			"args": [
				"/path/to/bc-canvas-editor/mcp/dist/server.js",
				"--root",
				"/path/to/your-project"
			]
		}
	}
}
```

`--root` is the only directory the server reads or writes. A path that resolves outside it is refused, symlinks followed out of it included.

It is also fixed for the life of the config, and that is worth knowing before you pick it. A Cowork session opened on a project does not move the root: whatever folder you name here is the folder every Desktop conversation sees, whichever project you happen to be standing in. Name the directory your canvases live under, not a single project — or run one entry per project under different server names.

## What it offers

Four tools:

- **`bcc_list_canvases`** — every canvas under the root, each with how many of the eleven sections it fills and which ones are still empty.
- **`bcc_read_canvas`** — one canvas, as prose (`view: 'digest'`) or as its exact file bytes (`view: 'json'`). The digest runs a third to a half shorter than the file, and the fuller the canvas the less it saves; the bytes are what you hand back to rewrite it.
- **`bcc_write_canvas`** — a whole canvas to a `.bcc.json` file. Whole document every time, and the result names which sections came out empty, so nothing gets dropped by omission.
- **`bcc_explain`** — what a section is for, in the ddd-crew's own questions, with the vocabulary it draws on and a row to calibrate against.

One prompt, **Review a canvas**, which is the thing to reach for from Desktop. It embeds the canvas you pick and asks the model to name what is missing and put the open questions back to you, rather than answering them itself.

Canvases are resources too, at `bcc://canvas/<path>`. Attach one from the host's own UI to give a conversation a context to work against.

## What counts as a canvas

`*.bcc.json` and `*.bcc.html`, found by walking the root and skipping `node_modules`, `.git`, `dist`, `build` and `.svelte-kit`. An HTML artifact is read through the Canvas file embedded in it. The server never writes one — that would mean rendering the sheet, which needs a browser.

A directory the walk cannot open stops that branch and nothing else, and the listing names it at the end — a wide root usually has one or two, and losing every canvas already found to a directory the OS keeps to itself would be a poor trade.

`bcc_write_canvas` refuses any other extension. `.bcc.json` is the key the listing globs on and the extension the editor's **Import…** accepts, so a canvas written as `shipping.json` is invisible to both. The directory and the filename are otherwise yours.

## Conflicts, and the tab you left open

There is no conflict check — no mtime, no revision hash. Canvases are committed files, so git is already the conflict detector and git is already the undo; anything the server added would be a second, weaker history.

That leaves one gap worth knowing about. A browser tab with the editor open is holding its own autosaved copy of whatever you last had in it. If you export from that tab after an agent has written the same file, the export lands on top, silently — the editor's multi-tab notice cannot see across this boundary. Export or close the tab before you let an agent write.

## Protocol

Serves revision **2026-07-28** over stdio through `serveStdio`, and accepts 2025-era clients, which is still most of them. Clients older than 2025-06-18 do not understand structured results and get only the text — the same facts, in the sentences the model reads anyway.

## Development

```sh
npm test          # vitest, including the round trip over every committed example
npm run check     # tsc --noEmit
```

The server reuses `src/lib/model/*` from the app unchanged, through a `$lib/*` path mapping. That is deliberate: one parser and one serializer decide what a Canvas file is, so the bytes this server writes open in the editor and the bytes the editor exports read here.

## License & attribution

The Bounded Context Canvas is by the [ddd-crew](https://github.com/ddd-crew/bounded-context-canvas), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
