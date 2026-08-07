# Research: Contexture's canvas JSON — lessons for our Canvas file schema

Resolves wayfinder ticket [001-contexture-schema-lessons](../../wayfinder/tickets/001-contexture-schema-lessons.md).
Feeds [003-canvas-file-schema](../../wayfinder/tickets/003-canvas-file-schema.md).

Researched 2026-08-07. All findings below are grounded in files actually fetched from
`https://github.com/trustbit/Contexture` (raw.githubusercontent.com, `main` branch) and
`https://github.com/grjsmith/bounded_context_canvas_md` (HEAD). Anything not directly
observed is marked **unverified**. Note: Contexture's README refers to the project as
living at `Softwarepark/Contexture`; the `trustbit/Contexture` repo still serves the same
content (likely a rename/redirect — the exact relationship is unverified).

## 1. What Contexture is, and how it persists data

Contexture is a multi-canvas cataloguing tool: an F# (Giraffe) API plus a Vue frontend
for documenting *many* domains, bounded contexts, and the collaborations between them.
Its README positions it for capturing insights *after* a modelling session.

Two storage backends (per README):

- **File-based**: one JSON file for the whole database — "supports no versioning or
  change dates at the moment" (i.e. no history, but the file *format* is versioned; see §5).
- **SQL Server**: event-sourced storage with version info and change dates.

Snapshot export/import exists as HTTP endpoints, producing the same JSON shape without
history.

Source files examined:

- `backend/Contexture.Api/Entities/BoundedContext.fs` — canvas aggregate + value objects
- `backend/Contexture.Api/Entities/Collaboration.fs` — relationship model
- `backend/Contexture.Api/Entities/Domain.fs` — domain aggregate
- `backend/Contexture.Api/Filebased/Database.fs` — serialization, file format, migrations
- `frontend-vue/src/types/boundedContext.ts` — what the client actually consumes
- `example/restaurant-db.json` — a real serialized database (format version 2)

## 2. Top-level file shape

`example/restaurant-db.json` (and the `Serialization.Root` record in
`Filebased/Database.fs`):

```json
{
  "version": 2,
  "domains": [...],
  "boundedContexts": [...],
  "collaborations": [...],
  "namespaceTemplates": [...]
}
```

Key structural point: **the file is a database, not a canvas**. A bounded context is one
row among many; collaborations are a *separate top-level collection* referencing contexts
by id. Our Canvas file is the opposite — one document per canvas — so most of Contexture's
nesting exists to serve cross-context cataloguing, not the canvas itself.

Serializer settings (`Filebased/Database.fs`, `serializerOptions`): camelCase property
names, nulls omitted (`IgnoreNullValues = true` — F# `option` `None` fields simply vanish
from the JSON), indented output, and FSharp.SystemTextJson union encoding
`Default ||| Untagged ||| UnwrapRecordCases ||| UnwrapFieldlessTags`. That last flag set
explains every union shape seen in the example JSON (see §4, §6). Writes are atomic:
serialize to a temp file, then `File.Move(tempFile, path, true)`.

## 3. The bounded context (canvas) record

From `Entities/BoundedContext.fs` (`Projections.BoundedContext`) and the example JSON:

```json
{
  "id": "f51b00e7-...",
  "domainId": "37827e03-...",
  "key": "PRO",                     // renamed to "shortName" in format v3
  "name": "Procurement",
  "description": "Make sure we buy the right amount of inventory",
  "classification": { "domainType": "Generic", "businessModel": ["CostReduction"], "evolution": "Product" },
  "businessDecisions": [],           // [{ name, description? }]
  "ubiquitousLanguage": {},          // map: lowercased term -> { term, description? }
  "messages": {
    "commandsHandled": [], "commandsSent": [],
    "eventsHandled": [],  "eventsPublished": [],
    "queriesHandled": [], "queriesInvoked": []
  },
  "domainRoles": [],                 // [{ name, description? }]
  "namespaces": [...]                // app-specific labels/metadata, not canvas content
}
```

Observations:

- Sections map to fields on one flat record — no "sections" wrapper, no ordering
  metadata. Field names are the canvas vocabulary, camelCased.
- `description` doubles as the V5 "Purpose" section. There are **no fields at all** for
  V5's Assumptions, Verification Metrics, or Open Questions — Contexture covers a subset
  of the canvas.
- `ubiquitousLanguage` is a JSON *object keyed by term* (`Map<string, UbiquitousLanguageTerm>`
  in F#; the key is a normalized/lowercased copy of `term` — key derivation is enforced by
  the API layer, **unverified** exactly where). The value repeats the term with original
  casing. This key-by-content choice makes renaming a term a delete+insert and forbids
  duplicate terms; a plain array of `{term, description}` rows would have been simpler.
- `businessDecisions` and `domainRoles` are `{ name, description? }` rows — free text,
  no enum. The frontend suggests preset role names (Specification Provider, Execution
  Orchestrator, etc. — **unverified**, not checked in this pass), but the schema itself
  stays open. This is the right call: domain roles are a suggestion list, not a taxonomy.

## 4. Strategic classification — open enums via "Other" cases

`Entities/BoundedContext.fs`, `ValueObjects`:

```fsharp
type DomainType     = Core | Supporting | Generic | OtherDomainType of string
type BusinessModel  = Revenue | Engagement | Compliance | CostReduction | OtherBusinessModel of string
type Evolution      = Genesis | CustomBuilt | Product | Commodity
type StrategicClassification =
    { DomainType: DomainType option
      BusinessModel: BusinessModel list
      Evolution: Evolution option }
```

- All three axes are **optional/empty by default** (`StrategicClassification.Unknown`) —
  a blank canvas serializes without pretending to know its classification.
- `businessModel` is a **list**, not a single pick. (The ddd-crew canvas treats business
  model as one choice; Contexture deliberately allows several.)
- With `UnwrapFieldlessTags` + `Untagged` encoding, known values serialize as bare strings
  (`"domainType": "Generic"`), and the `Other* of string` cases serialize as the bare
  free-text string in the same position — the JSON cannot tell "known enum" from "escape
  hatch"; the reader decides by matching against known names. One field, not two.
  (Serialization of `Other*` inferred from the encoding flags; no `Other*` instance
  appears in the example file — **unverified** as a round-trip.)
- `Evolution` has **no** Other-case: it's a genuinely closed Wardley scale.
- Trap observed: the Vue client (`frontend-vue/src/types/boundedContext.ts`) models
  `DomainType`/`BusinessModel` as **closed** TypeScript enums — the backend's escape
  hatch is invisible to the current UI. An escape hatch that only one layer honors decays
  into dead schema.

## 5. Format versioning and migration — the strongest part

`Filebased/Database.fs`, `Serialization` module:

- Root carries `"version": int` (`Version: int option` — absent means version 0).
- On load: deserialize *only* `{ version }` first (`HasVersion`), then run an **ordered
  chain of pure JSON→JSON migrations** on the raw text before deserializing into the
  current types:

  ```fsharp
  let applyMigrations version json =
      [ 0, Migrations.toVersion1; 1, Migrations.toVersion2; 2, Migrations.toVersion3 ]
      |> List.skipWhile (fun (v, _) -> version > v)
      |> List.map snd
      |> List.fold (fun j migration -> migration j) json
  ```

- Real migrations they needed, one version apart:
  - **v1**: restructure `relationship` → tagged `relationshipType`, fix enum value casing
    (`"upstream"` → `"Upstream"`), fold `tools`/`deployment` into `technicalDescription`,
    rename `domainId` → `parentDomainId` on domains.
  - **v2**: replace legacy **integer ids with deterministic UUIDs** (SHA-1
    name-based UUIDs per entity namespace — ~90 lines of hashing code), rewrite every
    cross-reference (`initiator`/`recipient`), add empty `namespaces` arrays.
  - **v3**: rename `key` → `shortName` on domains and bounded contexts.
- Migrations manipulate `JObject`s, never the typed model — old shapes don't need types.
- The shipped `example/restaurant-db.json` still says `"version": 2` (with `"key"`),
  proving migrations run on load rather than files being kept current.
- No *forward*-compat stance: a file with a version newer than the code knows is not
  handled specially (it would skip all migrations and likely fail typed deserialization) —
  **unverified** behavior, inferred from `applyMigrations`.

## 6. Collaborations, relationship types, and messages

`Entities/Collaboration.fs` + example JSON. A collaboration is its own entity:

```json
{
  "id": "8223f6d5-...",
  "description": "Notify about empty inventory",   // optional
  "initiator": { "boundedContext": "e2fee2e6-..." },
  "recipient": { "boundedContext": "e6598848-..." },
  "relationshipType": {
    "upstreamDownstream": {
      "initiatorRole": "Downstream", "upstreamType": "OpenHost", "downstreamType": "AntiCorruptionLayer"
    }
  }
}
```

- **Collaborator** is a union: `BoundedContext of id | Domain of id | ExternalSystem of
  string | Frontend of string | UserInteraction of string` — serialized as a one-key
  object whose key names the kind (`{"boundedContext": "<guid>"}`,
  `{"frontend": "Mobile App"}`). Non-context collaborators are **plain strings, not
  references** — exactly what a single-canvas file needs everywhere.
- **RelationshipType** is a three-level union:
  `Symmetric (SharedKernel | Partnership | SeparateWays | BigBallOfMud)`,
  `UpstreamDownstream` (either `CustomerSupplierRelationship of role`, serialized
  `{"upstreamDownstream": {"role": "Customer"}}`, or the full triple
  `initiatorRole × upstreamType(Upstream|PublishedLanguage|OpenHost) ×
  downstreamType(Downstream|AntiCorruptionLayer|Conformist)`), or `Unknown`.
  It is `option`al — most collaborations in the example file have none.
- The two `upstreamDownstream` record shapes are disambiguated **only by field shape**
  (untagged encoding) — this ambiguity already forced migration work (v1's
  `processRelationship` pattern-matches on `initiatorRole` + property count). Cautionary.
- **Messages are disconnected from collaborators.** The canvas's `messages` are six flat
  `string[]` lists on the bounded context; collaborations carry no messages. Contexture
  *cannot express* "the `OrderPlaced` event comes from the Checkout context" — the exact
  lane structure (collaborator + their messages) that the V5 canvas draws. Its
  inbound/outbound notion lives only in the *command* names
  (`DefineInboundConnection`/`DefineOutboundConnection`), which collapse to the same
  stored `initiator`/`recipient` pair.
- Messages are bare strings: no per-message description, no explicit `type` field — type
  is encoded positionally by which list a string sits in.

## 7. Secondary: grjsmith/bounded_context_canvas_md

Fetched `bounded_context_canvas_md_template.md` (plus repo listing). It is a *simplified*
canvas as a Markdown template — headings as sections, blockquote placeholders, and
free-form **embedded YAML code blocks** for inbound/outbound data payloads, with events
listed as indented bullet lists grouped by topic. No strategic classification, no domain
roles, no relationship types; it adds `Business rules` (GIVEN/WHEN/THEN), `Assumptions`,
and a created-by/date header line.

What it suggests: (a) people want the *export* to read as a document with the canvas's
section names as headings; (b) a schema without structure (all prose) can't render
typed message rows or classification pickers — it's an export target, not a storage
format; (c) assumptions/business rules sections are genuinely used free-text — don't
over-structure them.

## 8. Lessons for our Canvas file schema

**Copy:**

1. **Flat record, canvas vocabulary, camelCase** — one object per canvas whose fields
   *are* the section names (`strategicClassification`, `domainRoles`,
   `ubiquitousLanguage`, ...). No generic `sections: []` indirection.
2. **Integer `version` at the root + ordered raw-JSON migrations on load.** Read the
   version with a minimal probe first; migrate text-to-text (or parsed-JSON-to-JSON)
   before validating against current types. Contexture needed three migrations in a
   young project — we will need them too.
3. **Classification axes optional and independently absent.** `Unknown`/empty is the
   serialized default; omit-null keeps blank canvases clean.
4. **Known values as plain enum strings; free-text via an escape hatch** — but see
   avoid #2 for the encoding.
5. **Non-context collaborators as plain strings** (frontend name, user description,
   external system) — no registry, no ids, matching a single-document file.
6. **Domain roles and business decisions as open `{name, description?}` rows**; preset
   role names belong in the UI's suggestion list, not the schema.
7. **Closed enum where the domain is closed** (evolution/Wardley stage; symmetric
   relationship patterns), open where it isn't (domain type, business model).
8. **Atomic writes** (temp file + rename) if/when we write to disk ourselves.

**Avoid:**

1. **Splitting messages from collaborators.** Contexture's six flat message lists cannot
   express the V5 lane (collaborator ↔ the messages exchanged with them). Our inbound/
   outbound sections should nest message rows under (or reference) their collaborator
   lane, with `type: "command" | "query" | "event"` explicit per row — not positional —
   plus optional description.
2. **Untagged/shape-disambiguated unions.** Contexture's `{"upstreamDownstream": {...}}`
   with two possible record shapes inside already required a migration and confuses
   clients. Use an explicit discriminator field (`kind`/`type`) for anything union-like,
   including the escape hatch: prefer `{"value": "core"}` vs
   `{"value": "other", "label": "..."}`, or a single string field documented as
   "one of the known values, else free text" — but then *every* consumer must implement
   the else-branch (see avoid #3).
3. **An escape hatch only the schema knows about.** Contexture's `OtherDomainType` exists
   in F# but not in the Vue client's closed enums. Whatever picker-plus-escape-hatch
   encoding ticket 003 chooses, the editor UI must round-trip unknown values from day one.
4. **Keying collections by content** (`ubiquitousLanguage` as a term-keyed map): makes
   rename awkward, forbids duplicates-in-progress, and invents a derived key that needs a
   normalization rule. Use arrays of rows; order is also presentation the user chose.
5. **Modeling relationship types as a deep closed taxonomy.** Contexture's faithful
   context-mapping union (3 levels, 12+ leaf shapes) is its most complex serialized type,
   most of its example collaborations carry *no* relationship type, and V5 canvases often
   just annotate a lane with a pattern name. A single optional field per lane — known
   pattern names (SharedKernel, Partnership, CustomerSupplier, Conformist, ACL, OHS,
   PublishedLanguage, SeparateWays, BigBallOfMud...) plus free text — captures the canvas
   without the taxonomy fights. If we later need the upstream/downstream detail, a
   migration can widen one field.
6. **Coupling canvas content to app/catalogue metadata.** Contexture's `namespaces`
   (labels, links, team members) and `domainId`/cross-entity GUID references are app
   database concerns riding inside the context record — the v2 id-rewrite migration is
   the cost of that coupling. Our Canvas file should contain canvas content only;
   timestamps/app-version, if kept at all, go in a clearly separated `meta` (or stay out
   of the file entirely so exports of identical content are byte-identical).
7. **Repurposing one field for two sections** (`description`-as-purpose) and **omitting
   V5 sections** (assumptions, verification metrics, open questions). Name the purpose
   field `purpose` (V5's "Description" wording notwithstanding) or `description` — but
   pick per ticket 003 — and include all 11 sections even when empty-by-default.

**Traps observed in the wild:**

- Renames happen (`key` → `shortName`) and enum-casing mistakes happen (`"upstream"` vs
  `"Upstream"`) — migrations must be cheap to write, so keep them raw-JSON transforms.
- Ids chosen casually (Contexture's original ints) forced the most painful migration.
  If our rows need ids at all (for React keys/undo), generate UUIDs from the start — or
  keep ids out of the serialized file entirely.
- No forward-compat plan in Contexture: decide explicitly what our loader does with a
  `version` greater than it knows (refuse loudly, don't silently mangle).

## Sources

- README: https://raw.githubusercontent.com/trustbit/Contexture/main/README.md
- Canvas aggregate: https://raw.githubusercontent.com/trustbit/Contexture/main/backend/Contexture.Api/Entities/BoundedContext.fs
- Collaborations: https://raw.githubusercontent.com/trustbit/Contexture/main/backend/Contexture.Api/Entities/Collaboration.fs
- Domains: https://raw.githubusercontent.com/trustbit/Contexture/main/backend/Contexture.Api/Entities/Domain.fs
- File format, serializer options, migrations: https://raw.githubusercontent.com/trustbit/Contexture/main/backend/Contexture.Api/Filebased/Database.fs
- Example database (format v2): https://raw.githubusercontent.com/trustbit/Contexture/main/example/restaurant-db.json
- Frontend types (closed enums): https://raw.githubusercontent.com/trustbit/Contexture/main/frontend-vue/src/types/boundedContext.ts
- Markdown canvas template: https://raw.githubusercontent.com/grjsmith/bounded_context_canvas_md/HEAD/bounded_context_canvas_md_template.md
