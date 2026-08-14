# CONTEXT — bc-canvas-editor

Glossary for the bounded context canvas editor. The app's own domain — not the vocabulary *inside* a user's canvas (that belongs to whatever context they're modeling).

## Terms

**BC Canvas** — the app's name. Title bar reads `<canvas name> — BC Canvas` (`Untitled — BC Canvas` when unnamed).

**Canvas** — the single document the app edits: one ddd-crew Bounded Context Canvas. Structured per the canvas template (name, purpose, strategic classification, domain roles, inbound/outbound communication, ubiquitous language, business decisions, assumptions, verification metrics, open questions).

**Section** — one named area of the Canvas (e.g. Strategic Classification, Inbound Communication). Each Section has its own structure: free text, pick-one enums, or typed rows.

**Message** — an item of communication in the Inbound or Outbound Communication sections, typed as **Command**, **Query**, or **Event**. Rendered in Event Storming colors: Command = blue, Query = green, Event = orange.

**Collaborator** — the other party in an inbound/outbound communication lane. Has a name, and may carry a **kind**: bounded context, external system, frontend, or direct user interaction. The kind is optional — a Collaborator whose kind is unstated is not thereby a bounded context, it is simply unclassified.

**Lane** — one Collaborator together with the Messages exchanged with it, within the Inbound or Outbound Communication section. The unit of structure in those sections: a Canvas's communication is a list of Lanes, each holding its own Messages. A Lane may also carry a Relationship type at each end.

**Relationship type** — a context-mapping pattern naming how one side of a Lane's boundary stands toward the other. A Lane has two ends, and each may name its own: the Collaborator's and this context's. Where the pattern is symmetric both ends carry the same one; where it is asymmetric they differ, which is the case a single value cannot express. Not to be confused with a Domain Role: a Relationship type describes a boundary, a Domain Role describes this context's own character.

**View** — one of three ways of looking at the same Canvas: the **Sheet** (the canvas as drawn), the **Canvas file's JSON**, and **Markdown**. Three renderings of one document, not three documents and not three exports: switching View never changes what the Canvas is. In the editor the Sheet and the JSON are editable and the Markdown is read; in an Artifact all three are read-only. Markdown is additionally a one-way export (`.bcc.md`) and never an import. One function renders it (`web/src/lib/model/digest.ts`), which the MCP server calls a **digest** — internal jargon for the model-facing audience, never a user-facing string.

**Render** — turning a Canvas into bytes somebody else can read, as against drawing it live for someone editing it. One component draws a Canvas anywhere (`CanvasSheet`), compiled two ways from that one source: a headless server compile that renders in plain Node with no browser, and the client mount the editor and the PNG use. A Render is that headless output inside a **container** that decides what file it is — the HTML Artifact, the SVG image, or a bare fragment for a Fence. It is a verb the product says out loud: `bcc render`. Because every container is built on the one function, the sheet a Render writes and the sheet the editor exports are the same sheet by construction rather than by agreement.

**Fence** — a fenced code block in someone else's markdown file, marked `bcc`, holding one path to a Canvas file. Where the file is built or previewed, the Fence is replaced by the Sheet; everywhere else the path is what a reader sees, which is why the Fence holds a pointer rather than a canvas. It is read-only and has no options: it resolves the path relative to the markdown file that holds it, draws a Render's bare fragment, and where it cannot, puts a visible placeholder saying why in the same place. An **adapter** is one host's share of that — a remark plugin, a markdown-it rule — and holds nothing of the contract itself.

**Artifact** — a read-only export of a Canvas for sharing: a self-contained single-file HTML render, a PNG, or an SVG. An Artifact is read-only as a document — it is never edited in place. The HTML Artifact carries the Canvas file embedded within it and can be imported back; the two images are presentation only. The HTML Artifact carries all three Views, pre-rendered into the file so none of them depends on script to be readable; the images are the Sheet only. The SVG is the one meant to be **committed** beside its Canvas file, where a markdown host that will never draw a Fence can still point an `<img>` at it; a check re-renders it and compares the bytes, so an Artifact left behind by its Canvas is caught rather than believed.

**Canvas file** — the portable, re-importable serialization of a Canvas (JSON; schema owned by this project, versioned). The durable format; localStorage autosave is only a safety net.

**Example** — one of a fixed, curated set of Canvases bundled with the app, choosable from the chrome. Opening one reuses the import path (confirmation over unexported changes, history cleared) and lands clean; its Canvas file is published as a downloadable, re-importable `examples/*.bcc.json`.

**Commit** — one discrete accepted change to the Canvas: a field edit accepted on blur, or a single structural action (add, remove, reorder, pick). The unit of undo/redo and of autosave.

**Unexported changes** — the Canvas has changed since it was last carried out of the browser in a re-importable form: cleared by Canvas-file export/import and by HTML-Artifact export/import, never by the lossy exports — PNG, SVG and Markdown. The only dirtiness that can cost the user work.

**Canvas root** — the one directory a canvas surface off the filesystem works within (`--root`, defaulting to where it was launched). Every path is resolved inside it before anything touches the filesystem, symlinks resolved first; there is no second root, and nothing outside it exists as far as that surface is concerned. It bounds the walk that finds canvases and gives paths a base to be named against; it is not a lock, since a caller that opens it at `/` gets `/`.

**Plugin** — the installable bundle that carries the MCP server together with its facilitation layer (the workshop and drafting skills, the reviewer agent) into Claude surfaces. The server is the floor any MCP host gets on its own; the Plugin is choreography on top of it, owning procedure and never content. Procedure is its whole cargo: the server reads a Canvas and explains the method, `bcc` changes files, and the Plugin is what knows in which order to do either.

**Reference** — the app's single consult-and-dismiss teaching surface: a dialog listing the keyboard shortcuts and linking to the ddd-crew method material. Everything else the app teaches at point of use (picker descriptions, placeholder questions, the footer legend); the Reference exists for what cannot be taught in place.
