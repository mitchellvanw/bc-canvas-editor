---
name: canvas-file-schema
title: "Decision: the Canvas file schema"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: [contexture-schema-lessons]
---

## Question

Define the versioned JSON schema for the Canvas file — the durable, re-importable serialization. To settle: field names and nesting for all 11 V5 sections; how picker-plus-escape-hatch values are encoded (enum value vs free text — one field or two?); the message row shape (type: command/query/event, name, description?); collaborator lanes with relationship type; the `version` field and the migration/forward-compat stance; file extension and naming convention (`.bcc.json`?); what, if any, non-content metadata rides along (timestamps, app version).

Prior art from [contexture-schema-lessons](wayfinder/tickets/001-contexture-schema-lessons.md) informs this. Update `CONTEXT.md` if terms sharpen.

## Resolution

Settled in a grilling session (2026-08-07). The Canvas file is a flat camelCase JSON document: integer root `version`, then the eleven V5 sections in canonical order.

**Reference example:**

```json
{
  "version": 1,
  "name": "Order Fulfillment",
  "description": "Coordinates picking, packing and shipping once an order is paid.",
  "strategicClassification": {
    "domain": "core",
    "businessModel": "revenue",
    "evolution": "custom-built"
  },
  "domainRoles": [
    { "name": "execution context", "description": "Carries out the fulfillment workflow." }
  ],
  "inboundCommunication": [
    {
      "collaborator": "Checkout",
      "relationship": "customer-supplier",
      "messages": [
        { "type": "command", "name": "Place Order" },
        { "type": "event", "name": "Payment Confirmed", "description": "Triggers fulfillment." }
      ]
    }
  ],
  "ubiquitousLanguage": [
    { "term": "Shipment", "definition": "A physical parcel dispatched against an order." }
  ],
  "businessDecisions": [
    { "name": "No partial shipments", "description": "An order ships complete or not at all." }
  ],
  "outboundCommunication": [
    { "collaborator": "Notifications", "messages": [{ "type": "event", "name": "Order Shipped" }] }
  ],
  "assumptions": ["Warehouse stock counts are accurate within the hour."],
  "verificationMetrics": ["Time from payment to dispatch under 4 hours."],
  "openQuestions": ["Who owns returns — this context or a new one?"]
}
```

**Decisions:**

- **Escape hatch = single string field.** Curated values are canonical well-known strings; any other string is a custom value the picker renders as-is. No tagged unions. Unknown values round-trip by construction.
- **Message row:** `{ type, name, description? }` with `type` a genuinely closed enum `command | query | event` — no escape hatch (it carries the Event Storming color semantics).
- **Lane:** `{ collaborator, relationship?, messages }`. Collaborator is a plain name string — **no `kind` field** (nothing in scope consumes it; adding an optional field later is the cheapest schema change; the bounded-context/frontend/user distinction stays glossary prose). `relationship` is a single optional escape-hatched string; no structured relationship taxonomy (Contexture's cost them a migration).
- **Versioning:** integer root `version`, ordered raw-JSON migrations applied on load. Files with a version *newer* than the app knows are refused with a clear message and never mutated — no best-effort parsing.
- **File naming:** extension `.bcc.json`; default filename slugged from the canvas name (`order-fulfillment.bcc.json`).
- **No metadata envelope:** `version` + content only. No timestamps, no generator string — deterministic output, clean git diffs.
- **List sections:** `businessDecisions` as `{ name, description? }` rows; `assumptions`, `verificationMetrics`, `openQuestions` as plain string arrays (one-liner stickies).
- **No row ids:** the file is pure content; runtime keys are ephemeral (feeds ticket 006). Ids would be an additive migration if ever needed.
- **Naming:** full canvas vocabulary — `inboundCommunication`/`outboundCommunication`, `description` (not `purpose`). Ubiquitous language rows are `{ term, definition? }` — domain vocabulary over structural uniformity.
- **Canonical spellings:** kebab-case for classification axes (`core | supporting | generic`; `revenue | engagement | compliance | cost-reduction`; `genesis | custom-built | product | commodity`) and relationship patterns (`partnership | shared-kernel | customer-supplier | conformist | anticorruption-layer | open-host-service | published-language | separate-ways | big-ball-of-mud`). Domain role names are natural lowercase prose (`"execution context"`), not slugs. The exact 15-trait list is pinned during [assemble-spec](wayfinder/tickets/008-assemble-spec.md).
- **Presence & serialization:** all eleven section keys always present (empty arrays/strings, never missing); optional fields (`description`, `definition`, `relationship`, unset classification axes) omitted entirely, never `null`; saves use 2-space indent and fixed key order so unchanged canvases are byte-identical.

## Amended 2026-08-11 by canonical-v5-amendments

Three of the decisions above were reversed on new evidence by [canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md), on the [canonical-v5 map](wayfinder/map-canonical-v5.md). **Read them there before acting on them here.** The reasoning above was sound on what was known at the time; what changed is the canonical sources being read and written down ([docs/research/canonical-canvas-v5.md](docs/research/canonical-canvas-v5.md)), and the exported artifact becoming the product.

- **Lane / collaborator.** The collaborator is no longer a plain name string: it becomes `{ name, kind? }` with `kind` a closed enum `bounded-context | external-system | frontend | user`. This ticket's own reasoning — "adding an optional field later is the cheapest schema change" — is what it was budgeting for.
- **Lane / relationship.** No longer a single optional string: `relationship?: { theirs?, ours? }`, both optional and both still escape-hatched free text. Canonical marks a role at each end of a lane, and one string cannot express an asymmetric pairing.
- **Naming.** `description` → `purpose`, which is upstream's own v4→v5 rename. The rest of the naming decision stands.

Everything else above is unchanged — including the escape-hatch rule, the closed message `type`, the versioning and refusal policy, the absence of row ids and of a metadata envelope, and the serialization rules. Canvas file version goes to **2**; the migration is `MIGRATIONS[1]`, the first this schema has ever run.
