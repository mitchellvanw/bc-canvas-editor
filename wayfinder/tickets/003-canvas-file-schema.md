---
name: canvas-file-schema
title: "Decision: the Canvas file schema"
labels: [wayfinder:grilling]
status: open
assignee: mitchell
blocked-by: [contexture-schema-lessons]
---

## Question

Define the versioned JSON schema for the Canvas file — the durable, re-importable serialization. To settle: field names and nesting for all 11 V5 sections; how picker-plus-escape-hatch values are encoded (enum value vs free text — one field or two?); the message row shape (type: command/query/event, name, description?); collaborator lanes with relationship type; the `version` field and the migration/forward-compat stance; file extension and naming convention (`.bcc.json`?); what, if any, non-content metadata rides along (timestamps, app version).

Prior art from [contexture-schema-lessons](wayfinder/tickets/001-contexture-schema-lessons.md) informs this. Update `CONTEXT.md` if terms sharpen.
