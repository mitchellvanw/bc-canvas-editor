---
name: contexture-schema-lessons
title: "Research: Contexture's canvas JSON — lessons for our schema"
labels: [wayfinder:research]
status: closed
assignee: research-subagent
blocked-by: []
---

## Question

What shape does Contexture (github.com/trustbit/Contexture) use to serialize bounded context canvases — and what should our own versioned Canvas file schema copy or avoid? Secondary glance: grjsmith/bounded_context_canvas_md (community markdown/YAML canvas).

Specifically: field naming and nesting for the V5 sections; how they encode strategic classification (enums? free text?), domain roles, and inbound/outbound messages; whether they version the format and handle migration; anything about their model that fights the canvas or users.

Findings land on branch `research/contexture-schema` as `docs/research/contexture-schema.md`. Feeds [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md).

## Resolution

Full findings: `docs/research/contexture-schema.md` on branch `research/contexture-schema` (commit `f37d406`, 306 lines, source-cited from Contexture's F# domain types, example JSON, Vue frontend types, and the grjsmith markdown template).

**Copy:** flat camelCase record using canvas vocabulary as field names; integer root `version` with ordered raw-JSON migrations applied on load (Contexture needed three — relationship restructure, int→UUID ids, `key`→`shortName` rename); classification axes optional, omitted when null; open `{name, description?}` rows for domain roles; plain strings for non-context collaborators; closed enums only where the domain is genuinely closed (e.g. evolution).

**Avoid:** Contexture stores messages as six flat `string[]` lists on the context, separate from collaborations — it cannot express the V5 lane "collaborator + their messages"; our schema must nest messages under their lane with an explicit per-row `type: command|query|event`. Avoid untagged unions disambiguated by shape (their `upstreamDownstream` dual-shape cost a migration); avoid term-keyed maps for ubiquitous language (use rows); avoid a deep closed relationship-type taxonomy — a single optional pattern field per lane suffices; keep app metadata out of canvas content.

**Traps for [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md):** Contexture's backend has an `OtherDomainType of string` escape hatch that its frontend's closed enums can't display — whatever picker-plus-escape-hatch encoding we choose, the UI must round-trip unknown values from day one. Also define explicit loader behavior for files with a *newer* version than the app knows (Contexture has none).
