---
name: contexture-schema-lessons
title: "Research: Contexture's canvas JSON — lessons for our schema"
labels: [wayfinder:research]
status: open
assignee: research-subagent
blocked-by: []
---

## Question

What shape does Contexture (github.com/trustbit/Contexture) use to serialize bounded context canvases — and what should our own versioned Canvas file schema copy or avoid? Secondary glance: grjsmith/bounded_context_canvas_md (community markdown/YAML canvas).

Specifically: field naming and nesting for the V5 sections; how they encode strategic classification (enums? free text?), domain roles, and inbound/outbound messages; whether they version the format and handle migration; anything about their model that fights the canvas or users.

Findings land on branch `research/contexture-schema` as `docs/research/contexture-schema.md`. Feeds [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md).
