# bc-canvas-mcp

Tooling for the Bounded Context Canvas files in a project: a facilitated workshop, a draft-from-code pass, and a reviewer — over canvases that open unchanged in [BC Canvas](https://bc-canvas.pages.dev).

Two surfaces carry it, and the split is worth knowing before you reach for either. **The MCP server is how a canvas gets into a conversation** — it reads one as prose and explains what each section is for. **`bcc` is how a canvas changes on disk** — it lists, checks, formats and renders. The server does not write. Without `bcc` beside it you can read canvases and learn the method, and that is all.

stdio only; nothing leaves the machine.

The canvases are meant to be committed alongside the code they describe. That is the workflow, not a rule anything enforces: it works the same over a plain folder.

## Install

The server ships inside the **bc-canvas** plugin, together with two skills — a facilitated canvas workshop and a disciplined draft-from-code — and a reviewer agent:

```
/plugin marketplace add mitchellvanw/bc-canvas-editor
/plugin install bc-canvas@bc-canvas-editor
```

There is nothing to build: the plugin carries `dist/server.js` ready to run, and Node is its only requirement.

The plugin does not carry `bcc`. Install it once in the project you are working in:

```sh
alias bcc='npx --yes github:mitchellvanw/bc-canvas-editor'   # in your project, not in a bc-canvas-editor checkout
```

The first call clones and installs; later ones come out of npm's cache and start in about a second.

## Claude Code

The plugin is the whole setup. Its server entry passes no `--root`, and none is needed: the server defaults to its working directory, which is the project Claude Code started it in. `bcc` runs over Bash like any other command.

Without the plugin, a checkout works too:

```sh
claude mcp add bc-canvas -- node /path/to/bc-canvas-editor/mcp/dist/server.js
```

## Claude Desktop

Desktop has no shell, so it has no `bcc` — which means the workshop and drafting skills cannot write there, and what Desktop gets is reading and explaining. That is a real limit, not an oversight: the writing surface moved to the command line deliberately, and Desktop is not currently a target.

If reading is what you want, Desktop starts the server at the filesystem root, so `--root` is not optional — the plugin's own server entry leaves it out and is refused at launch, saying so on stderr rather than walking your whole disk. Connect the server yourself with an explicit root in `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

`--root` is the only directory the server reads. A path that resolves outside it is refused, symlinks followed out of it included.

It is also fixed for the life of the config. Whatever folder you name here is the folder every Desktop conversation sees, whichever project you happen to be standing in. Name the directory your canvases live under, not a single project — or run one entry per project under different server names.

## What the server offers

Two tools:

- **`bcc_read_canvas`** — one canvas as prose: the sheet in words, a third to a half shorter than the file, and the fuller the canvas the less it saves. It reads a `.bcc.json` or the canvas embedded in a `.bcc.html` artifact, and brings an older file up to date on the way through.
- **`bcc_explain`** — what a section is for, in the ddd-crew's own questions, with the vocabulary it draws on and a row to calibrate against.

Canvases are resources too, at `bcc://canvas/<path>`. Attach one from the host's own UI to give a conversation a context to work against — that is the one thing here no file tool substitutes for, and it is why the server exists at all.

Both tools are read-only, and the list is deliberately short: `tools/list` sits at the front of every session's context whether or not a canvas is ever touched, so anything standing there has to earn it against the file tools the host already has.

## What the plugin adds

Beside the server, the plugin carries the facilitation layer — findable by typing `/` and the name in any Claude surface:

- **canvas-workshop** — a facilitated session. The model asks, one section at a time; you answer; the sheet fills in your words, and what you defer lands under Open questions instead of staying silently blank.
- **draft-canvas-from-code** — a draft drawn from what the code shows, handed back for correction. The business judgments a codebase cannot answer arrive as open questions rather than invented rows.
- **canvas-reviewer** — an agent that reviews by asking: it names what is missing or thin and puts the open questions back to you, answering none of them. Reach for it on a canvas nobody is currently facilitating; a workshop in progress is reviewed by the facilitator running it, who knows which rows you said and which it drafted.

## `bcc`, the command line

```sh
bcc ls                        # what canvases are here, what each is for, how full each one is
bcc check                     # do they all still read, and are the images beside them current
bcc fmt                       # canonical bytes, in place
bcc render orders.bcc.json    # the HTML artifact, beside the canvas
bcc render --svg orders.bcc.json
```

`check` and `fmt` are what make a canvas behave like source code rather than an attachment: `check` reads every canvas through the parser the editor's **Import…** uses, so a canvas that passes opens there, and `fmt` rewrites one in the bytes an export would have written. Writing a canvas is your own file tools followed by `bcc fmt` — which refuses anything that is not a Canvas file, so a malformed section is caught before the editor sees it.

`render` writes the `.bcc.html` artifact — the same function the editor's Export HTML calls, so the two files are byte-identical — or a `.bcc.svg` image with `--svg`, which is what lets a README show a canvas.

It takes the same `--root <directory>` this server does, defaulting to the working directory, and reads canvases through the same parser. It is unpublished: there is no registry package, and `npx` resolves this repo's `main` at the moment it runs. Pin a commit if you need reproducibility (`…bc-canvas-editor#<sha>`).

## What counts as a canvas

`*.bcc.json` and `*.bcc.html`, found by walking the root and skipping every hidden directory — any name starting with a dot — plus `node_modules`, `dist` and `build`. A canvas you mean to keep lives in neither, and scratch fixtures under a `.scratch/` or a cache should not turn up in a listing. An HTML artifact is read through the Canvas file embedded in it.

`.bcc.json` is the extension `bcc ls` globs on and the one the editor's **Import…** accepts, so a canvas written as `shipping.json` is invisible to both. The directory and the filename are otherwise yours.

A directory the walk cannot open stops that branch and nothing else. `bcc ls` names it at the end — a wide root usually has one or two, and losing every canvas already found to a directory the OS keeps to itself would be a poor trade. The resource listing leaves such a directory unmentioned, and leaves out unreadable files too: it feeds a picker of things you are about to attach, where an entry that fails on attach is worse than an absence. `bcc ls` is where you find out.

## Conflicts, and the tab you left open

There is no conflict check — no mtime, no revision hash. Canvases are committed files, so git is already the conflict detector and git is already the undo; anything here would be a second, weaker history.

That leaves one gap worth knowing about. A browser tab with the editor open is holding its own autosaved copy of whatever you last had in it. If you export from that tab after an agent has written the same file, the export lands on top, silently — the editor's multi-tab notice cannot see across this boundary. Export or close the tab before you let an agent write.

## Protocol

Serves revision **2026-07-28** over stdio through `serveStdio`, and accepts 2025-era clients, which is still most of them. Clients older than 2025-06-18 do not understand structured results and get only the text — the same facts, in the sentences the model reads anyway.

## Development

```sh
npm install
npm test          # vitest, including a byte-diff of the committed bundle
npm run check     # tsc --noEmit
npm run build     # refresh dist/server.js after changing src/
```

`dist/server.js` is committed, because a plugin install copies files as they sit in the repo and runs no build step. It inlines everything but Node itself. The suite diffs the committed bytes against a fresh build, so a bundle left stale after a source change fails the tests instead of shipping.

Read-then-write byte identity — the property that a canvas survives a round trip unchanged — is tested where the writing happens: `bcc fmt --check` over `examples/` in the root suite, and export → import → export in `web/src/lib/model/parse.test.ts`.

The server reuses `web/src/lib/model/*` and `web/src/lib/fs/*` from the app unchanged, through a `$lib/*` path mapping. That is deliberate: one parser decides what a Canvas file is, so what this server reads and what the editor exports are the same document. `web/src/lib/fs/*` is the same story one layer out — the root and its containment rule, the walk that finds canvases, and reading one through the parser — so that a path means the same thing to everything that reads a canvas off disk, not just to this server.

Only `web/src/` is shared, and only in that direction: nothing in the app imports out of `mcp/`.

## License & attribution

The Bounded Context Canvas is by the [ddd-crew](https://github.com/ddd-crew/bounded-context-canvas), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
