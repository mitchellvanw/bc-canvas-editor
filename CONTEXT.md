# CONTEXT — bc-canvas-editor

Glossary for the bounded context canvas editor. The app's own domain — not the vocabulary *inside* a user's canvas (that belongs to whatever context they're modeling).

## Terms

**Canvas** — the single document the app edits: one ddd-crew Bounded Context Canvas. Structured per the canvas template (name, purpose, strategic classification, domain roles, inbound/outbound communication, ubiquitous language, business decisions, assumptions, verification metrics, open questions).

**Section** — one named area of the Canvas (e.g. Strategic Classification, Inbound Communication). Each Section has its own structure: free text, pick-one enums, or typed rows.

**Message** — an item of communication in the Inbound or Outbound Communication sections, typed as **Command**, **Query**, or **Event**. Rendered in Event Storming colors: Command = blue, Query = green, Event = orange.

**Collaborator** — the other party in an inbound/outbound communication lane: another bounded context, a frontend, or a direct user. Carries a relationship type (context-mapping pattern).

**Artifact** — a read-only export of a Canvas for sharing: a self-contained single-file HTML render, or a PNG. An Artifact is not re-importable; it is presentation only.

**Canvas file** — the portable, re-importable serialization of a Canvas (JSON; schema owned by this project, versioned). The durable format; localStorage autosave is only a safety net.
