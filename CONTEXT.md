# CONTEXT — bc-canvas-editor

Glossary for the bounded context canvas editor. The app's own domain — not the vocabulary *inside* a user's canvas (that belongs to whatever context they're modeling).

## Terms

**BC Canvas** — the app's name. Title bar reads `<canvas name> — BC Canvas` (`Untitled — BC Canvas` when unnamed).

**Canvas** — the single document the app edits: one ddd-crew Bounded Context Canvas. Structured per the canvas template (name, purpose, strategic classification, domain roles, inbound/outbound communication, ubiquitous language, business decisions, assumptions, verification metrics, open questions).

**Section** — one named area of the Canvas (e.g. Strategic Classification, Inbound Communication). Each Section has its own structure: free text, pick-one enums, or typed rows.

**Message** — an item of communication in the Inbound or Outbound Communication sections, typed as **Command**, **Query**, or **Event**. Rendered in Event Storming colors: Command = blue, Query = green, Event = orange.

**Collaborator** — the other party in an inbound/outbound communication lane: another bounded context, a frontend, or a direct user. Identified by name alone; may carry a relationship type (context-mapping pattern), which only applies when the collaborator is another bounded context.

**Lane** — one Collaborator together with the Messages exchanged with it, within the Inbound or Outbound Communication section. The unit of structure in those sections: a Canvas's communication is a list of Lanes, each holding its own Messages.

**Artifact** — a read-only export of a Canvas for sharing: a self-contained single-file HTML render, or a PNG. An Artifact is read-only as a document — it is never edited in place. The HTML Artifact carries the Canvas file embedded within it and can be imported back; the PNG is presentation only.

**Canvas file** — the portable, re-importable serialization of a Canvas (JSON; schema owned by this project, versioned). The durable format; localStorage autosave is only a safety net.

**Commit** — one discrete accepted change to the Canvas: a field edit accepted on blur, or a single structural action (add, remove, reorder, pick). The unit of undo/redo and of autosave.

**Unexported changes** — the Canvas has changed since it was last carried out of the browser in a re-importable form: cleared by Canvas-file export/import and by HTML-Artifact export/import, never by PNG export. The only dirtiness that can cost the user work.

**Reference** — the app's single consult-and-dismiss teaching surface: a dialog listing the keyboard shortcuts and linking to the ddd-crew method material. Everything else the app teaches at point of use (picker descriptions, placeholder questions, the footer legend); the Reference exists for what cannot be taught in place.
