# Research: the canonical Bounded Context Canvas v5 vs. what BC Canvas implements

Ticket: none (exploratory, at Mitchell's request).
Researched: 2026-08-10, against primary sources (the `ddd-crew/bounded-context-canvas` repository at `master` — README, `resources/`, `tools/`, the git history of the v5 change — plus `ddd-crew/context-mapping`). Every canonical claim below cites the file it came from. Claims not confirmed against a primary source are marked **[unverified]**.

Context: BC Canvas advertises itself as an editor for "the ddd-crew Bounded Context Canvas (V5 canonical layout)" (`SPEC.md:3`, `README.md:3`) and stamps `Bounded Context Canvas · V5` into the sheet's title block (`src/lib/sheet/CanvasSheet.svelte:211`). Mitchell noticed two apparent departures: no explicit **Strategic Classification** heading, and **Description** where v5 says **Purpose**. This note establishes what v5 actually specifies, reads what this repo actually implements, and lists every deviation. It proposes nothing.

---

## 1. The canonical canvas, as sourced

### 1.1 There is no machine-readable schema — the sources are prose plus drawings

The whole repository is 50-odd files ([tree at `master`](https://github.com/ddd-crew/bounded-context-canvas/tree/master), read via `gh api repos/ddd-crew/bounded-context-canvas/git/trees/HEAD?recursive=1` on 2026-08-10). There is **no JSON Schema, no YAML, no versioned data format**. The authorities are:

| Source | What it pins down |
|---|---|
| [`README.md`](https://github.com/ddd-crew/bounded-context-canvas/blob/master/README.md) | Section names, section definitions, the three classification option lists, message/collaborator/relationship semantics |
| [`resources/bounded-context-canvas-5v-blank.jpg`](https://github.com/ddd-crew/bounded-context-canvas/blob/master/resources/bounded-context-canvas-5v-blank.jpg) | The v5 layout, the printed sub-labels, and the option lists *as drawn on the canvas* |
| [`resources/bounded-context-canvas-v5.jpg`](https://github.com/ddd-crew/bounded-context-canvas/blob/master/resources/bounded-context-canvas-v5.jpg) | The v5 template with placeholder cards (`<Query> <Command> <Event>`, `<Domain Term>/<definition>`, `<Decision>`) |
| [`tools/excalidraw-version/bounded-context-canvas-v5.excalidraw`](https://github.com/ddd-crew/bounded-context-canvas/blob/master/tools/excalidraw-version/bounded-context-canvas-v5.excalidraw) | The same, as parseable JSON — element text and fill colours |
| [`tools/html-version/bounded-context-canvas-template.html`](https://github.com/ddd-crew/bounded-context-canvas/blob/master/tools/html-version/bounded-context-canvas-template.html) | The closest thing to a field list: an HTML form headed `Bounded Context Canvas (v5)` |
| [`resources/model-traits-worksheet.md`](https://github.com/ddd-crew/bounded-context-canvas/blob/master/resources/model-traits-worksheet.md) | The community trait list behind Domain Roles |
| [`resources/collaborator-types.jpeg`](https://github.com/ddd-crew/bounded-context-canvas/blob/master/resources/collaborator-types.jpeg) | The four collaborator types and the relationship-type marker |
| [`ddd-crew/context-mapping`](https://github.com/ddd-crew/context-mapping/blob/master/README.md) | The relationship vocabulary the canvas defers to |

Note the README's own caveat about Miro: "The current version of the template on Miroverse is v4 at the moment", with a v5 board backup committed at `resources/bounded-context-canvas-v5-miro.rtb`. So even upstream, tool artifacts lag the README.

### 1.2 The eleven sections and their canonical names

README "Section Definitions" lists, in this order — and the README says to fill the canvas "in the order the sections are presented in Section Definitions":

1. **Name** — 2. **Purpose** — 3. **Strategic Classification** — 4. **Domain Roles** — 5. **Inbound Communication** (sub-headings *Messages*, *Collaborators*, *Relationship Type*, *Organising Into Swimlanes*) — 6. **Outbound Communication** — 7. **Ubiquitous Language** — 8. **Business Decisions** — 9. **Assumptions** — 10. **Verification Metrics** — 11. **Open Questions**.

Spatially the v5 blank canvas arranges these as three rows: `Purpose | Strategic Classification | Domain Roles`; then `Inbound Communication | (Ubiquitous Language over Business Decisions, in one shared box) | Outbound Communication`; then `Assumptions | Verification Metrics | Open Questions`. Sub-labels drawn on the sheet: `Domain`, `Business Model`, `Evolution` under Strategic Classification; `Role Types` under Domain Roles; `Collaborator`/`Messages` under Inbound and `Messages`/`Collaborator` (mirrored) under Outbound; `Context-specific domain terminology` under Ubiquitous Language; `Key business rules, policies, and decisions` under Business Decisions.

Ubiquitous Language and Business Decisions are drawn inside **one** outer rectangle but are two separate sections in the README — the box is layout, not nesting.

### 1.3 The enumerations

**Strategic Classification.** The README and the drawn canvas disagree slightly, and the disagreement matters:

| Axis | README prose | Printed on the v5 canvas / Excalidraw / HTML form |
|---|---|---|
| Domain | `core domain`, `supporting domain`, `generic` | `- core`, `- supporting`, `- generic`, `- other?` |
| Business Model | `revenue generator`, `engagement creator`, `compliance enforcer` (**three**) | `- revenue`, `- engagement`, `- compliance`, `- cost reduction` (**four**) |
| Evolution | `genesis`, `custom built`, `product`, `commodity` | `- genesis`, `- custom built`, `- product`, `- commodity` |

So **`cost reduction` is a fourth business-model value that exists on the canvas and in the HTML form but not in the README prose** — the HTML form's radio group `name="business-model"` carries labels `Revenue / Engagement / Compliance / Cost reduction`. The `- other?` on the Domain axis is the canvas's own escape hatch. (The Excalidraw file writes the Evolution list as `generic / custom built / product / commodity`; the rendered JPG and the HTML form both say `genesis`, so the Excalidraw is a typo, not a variant.) The README points to [Core Domain Charts](https://github.com/ddd-crew/core-domain-charts) for help with this section.

**Message types.** "There are three types of conversation that can occur between bounded contexts. A request to do something (a command), a request for some information (a query), or notification that something has happened (an event)." The README is emphatic that this is not an implementation claim: "No message bus or asynchronous workflow is obligatory." Colours from the Excalidraw template's own legend rectangles: query `#bae4cd` (green), command `#9accfe` (blue), event `#fed1ac` (orange), decision `#eee0ee` (lilac).

**Collaborator types.** `resources/collaborator-types.jpeg` names exactly four, each with an icon: **Bounded Context** (cloud), **External System** (gear), **Frontend** (monitor), **Direct User Interaction** (person) — plus, under a heading "Other", a **Relationship Type** marker. The README adds: "If the Bounded Context owns the user interface (e.g. micro-frontend) then the collaborator type is direct user interaction." Direct user interaction was added in [`6317f2e`](https://github.com/ddd-crew/bounded-context-canvas/commit/6317f2e) (2020-09-09).

**Relationship types.** The README does not enumerate them; it delegates: "The relationship type between two bounded contexts indicates how the models and teams influence each other. See [Context Mapping](https://github.com/ddd-crew/context-mapping) to learn about relationship types." That repo's "Context Map Patterns" are: Open-host Service, Conformist, Anticorruption Layer, Shared Kernel, Partnership, Customer/Supplier Development, Published Language, Separate Ways, Big Ball Of Mud — nine — above which it lists three coarser "Team Relationships" (Mutually Dependent, Upstream Downstream, Free).

**How relationships are drawn.** `resources/collaborator-example.jpeg` shows the notation in use: each swimlane carries **two** vertical dark markers — one immediately right of the collaborator (`CF`, `PNR`) and one at this context's own boundary at the right edge of the panel (`OHS`, `PNR`). That is the standard two-sided context-map reading: a role for each side of the boundary. The expansions `CF` = Conformist, `OHS` = Open-host Service, `PNR` = Partnership are **[unverified]** — the repo prints abbreviations without a key.

**Swimlanes.** "Collaborators can be organised into horizontal swim lanes showing the messages that they send" — the example image confirms one collaborator per lane, its messages to its right, lanes divided by dotted rules.

### 1.4 Domain Roles

The README refuses to enumerate: it asks "How can you characterise the behaviour of this bounded context?", cites Brandolini's Bounded Context Archetypes and Wirfs-Brock's Object Role Stereotypes, and points at `resources/model-traits-worksheet.md`, which "contains community-generated examples of roles (model traits was the former name for domain roles)". The worksheet is explicitly open: "Review the list below and choose which one applies to the context you are working on **or think of your own traits**." Its 15 rows:

Specification/Draft Model · Execution Model · Analysis/Audit Model · Approver · Enforcer · Octopus Enforcer · Interchanger · Gateway · Gateway Interchange · Dogfood Context · Bubble Context · Autonomous Bubble · Brain Context (likely anti-pattern) · Funnel Context · Engagement Context.

The canvas itself prints a shorter teaching list under `Role Types`: `- draft context`, `- execution context`, `- analysis context`, `- gateway context`, `- other`. The HTML form calls the field `Model traits` with helper text "draft, execute, audit, enforcer, interchange, gateway, etc." — i.e. upstream's own tools are inconsistent about the section's name.

### 1.5 What v4 → v5 changed

One commit: [`f438279`](https://github.com/ddd-crew/bounded-context-canvas/commit/f438279), 2022-11-19, *"Version 5 proposal: renamed description, added metrics, assumptions and questions"*. Its README diff is exactly two things:

- `### Description` → `### Purpose`, with the body rewritten from "Writing down the **description** forces you…" to "Writing down the **purpose** forces you…" and a new sentence: "Describe the purpose from a business perspective, you may also name key actors for whom the bounded context provides value."
- Three new sections appended: **Assumptions**, **Verification Metrics**, **Open Questions**.

Confirmed by the images: `resources/bounded-context-canvas-4v-blank.jpeg` is headed `V4`, says **Description**, and has no bottom row at all; `resources/bounded-context-canvas-5v-blank.jpg` is headed `V5`, says **Purpose**, and carries the bottom row. Everything else — Strategic Classification, Domain Roles, the two communication panels, the Ubiquitous Language/Business Decisions box, and all three option lists including `cost reduction` — is identical between v4 and v5.

**So "Description" is not an arbitrary rename in this project: it is the v4 name for the section, retained inside an otherwise-v5 canvas.**

---

## 2. What this project implements

### 2.1 The Canvas file

`src/lib/model/canvas.ts:43` declares the file shape — flat camelCase, integer `version`, eleven keys in a fixed order:

`version` · `name` · `description` · `strategicClassification` · `domainRoles` · `inboundCommunication` · `ubiquitousLanguage` · `businessDecisions` · `outboundCommunication` · `assumptions` · `verificationMetrics` · `openQuestions`

Row shapes: `Message = { type: 'command'|'query'|'event', name, description? }` (`src/lib/model/canvas.ts:9`); `Lane = { collaborator: string, relationship?: string, messages: Message[] }` (`:15`); `DomainRole = { name }` (`:21`); `UbiquitousTerm = { term, definition? }` (`:25`); `BusinessDecision = { name, description? }` (`:30`); `StrategicClassification = { domain?, businessModel?, evolution? }` (`:35`). `assumptions`, `verificationMetrics`, `openQuestions` are `string[]`. The rules are restated at `SPEC.md:82`.

The naming was a deliberate decision, recorded verbatim: "**Naming:** full canvas vocabulary — `inboundCommunication`/`outboundCommunication`, `description` (not `purpose`)" (`wayfinder/tickets/003-canvas-file-schema.md:70`). The same ticket records "Collaborator is a plain name string — **no `kind` field** (nothing in scope consumes it; adding an optional field later is the cheapest schema change; the bounded-context/frontend/user distinction stays glossary prose)" and "`relationship` is a single optional escape-hatched string; no structured relationship taxonomy" (`wayfinder/tickets/003-canvas-file-schema.md:64`).

### 2.2 The sheet

`src/lib/sheet/CanvasSheet.svelte` renders panel headings: `Description` (`:243`), `Domain roles` (`:261`), `Inbound communication` (`:293`), `Ubiquitous language` (`:300`), `Business decisions` (`:346`), `Outbound communication` (`:391`), `Assumptions` (`:398`), `Verification metrics` (`:407`), `Open questions` (`:416`). Sentence case throughout; canonical uses Title Case.

There is **no `Strategic Classification` panel**. The three axes are rendered as a `<dl>` of `Domain` / `Business model` / `Evolution` label-value pairs inside the near-black title block, beside the canvas name (`src/lib/sheet/CanvasSheet.svelte:74`, `:222`–`:238`). This is a designed choice, written down at `SPEC.md:168`: "**Title block:** near-black ink block … with spaced-caps eyebrow 'Bounded Context Canvas · V5', the context name in Archivo 700, and strategic classification as three label + mono-value pairs inside the block."

Layout (`src/lib/sheet/CanvasSheet.svelte:507`) is a 12-column grid:

```
description ×7  roles ×5
inbound ×4  language ×4  outbound ×4
inbound ×4  decisions ×4  outbound ×4
assumptions ×4  metrics ×4  questions ×4
```

which is the v5 arrangement, minus the classification block moving up into the header. A lane renders the collaborator name as an `h3` with the relationship as quiet right-aligned text on the same row (`:97`–`:120`); messages are chips inside the lane (`:122`–`:150`). The footer legend (`:56`) is `command · query · event · decision · collaborator · open question`, and the palette at `SPEC.md:172` is command blue / query green / event orange / policy lilac — the same assignments as the canonical Excalidraw legend.

### 2.3 The vocabularies

`src/lib/editor/vocab.ts:26` — `domain: core | supporting | generic`; `businessModel: revenue | engagement | compliance | cost-reduction`; `evolution: genesis | custom-built | product | commodity`; `relationship:` the nine context-mapping patterns as kebab-case (`partnership`, `shared-kernel`, `customer-supplier`, `conformist`, `anticorruption-layer`, `open-host-service`, `published-language`, `separate-ways`, `big-ball-of-mud`), each with a one-line teaching description. `src/lib/editor/vocab.ts:84` lists the fifteen domain-role traits. Every one of these is a picker with a **custom…** escape hatch plus a clear entry (`src/lib/editor/vocab.ts:18`, `SPEC.md:111`).

### 2.4 What the parser actually enforces

`src/lib/model/parse.ts` is strict about *shape* and lax about *vocabulary*. `asClassification` (`:140`) accepts any string on each axis. `asLane` (`:167`) accepts any string as `relationship`. Only `type` on a message is a closed enum (`src/lib/model/parse.ts:54`, `:149`), refusing anything outside `command | query | event`. So the curated lists are UI affordances, not validation.

### 2.5 The MCP surface

`mcp/src/sections.ts:35` is the single section table the whole server walks; its `label` strings are the sheet's headings, and here **Strategic classification does have a label** (`mcp/src/sections.ts:51`) even though the sheet prints no such heading. `mcp/src/digest.ts:22` renders the axes as one line `Domain: … · Business model: … · Evolution: …` in the title block, above the section headings (`:87`–`:101`), mirroring the sheet. `mcp/src/explain.ts:45` teaches each section, drawing its vocabularies straight from `src/lib/editor/vocab.ts`.

---

## 3. Comparison

### 3.1 Sections

| Canonical v5 (README §Section Definitions) | This project | Status |
|---|---|---|
| Name | `name` / heading in title block (`canvas.ts:46`, `CanvasSheet.svelte:212`) | Identical |
| **Purpose** | **`description`** / panel heading `Description` (`canvas.ts:46`, `CanvasSheet.svelte:243`) | **Renamed — reverts to the v4 name** ([`f438279`](https://github.com/ddd-crew/bounded-context-canvas/commit/f438279)); deliberate (`003-canvas-file-schema.md:70`) |
| **Strategic Classification** | `strategicClassification` in the file (`canvas.ts:47`); **no section heading on the sheet** — three pairs in the title block (`CanvasSheet.svelte:222`, `SPEC.md:168`); labelled `Strategic classification` in the MCP layer (`mcp/src/sections.ts:51`) | **Restructured** — present as data, absent as a named section in the UI |
| Domain Roles (sub-label `Role Types`) | `domainRoles` / `Domain roles` (`CanvasSheet.svelte:261`) | Identical; the `Role Types` sub-label is dropped |
| Inbound Communication | `inboundCommunication` / `Inbound communication` (`CanvasSheet.svelte:293`) | Identical |
| Outbound Communication | `outboundCommunication` / `Outbound communication` (`CanvasSheet.svelte:391`) | Identical |
| Ubiquitous Language (sub-label `Context-specific domain terminology`) | `ubiquitousLanguage` / `Ubiquitous language` (`CanvasSheet.svelte:300`) | Identical; sub-label dropped |
| Business Decisions (sub-label `Key business rules, policies, and decisions`) | `businessDecisions` / `Business decisions` (`CanvasSheet.svelte:346`) | Identical; sub-label dropped |
| Assumptions | `assumptions` (`CanvasSheet.svelte:398`) | Identical |
| Verification Metrics | `verificationMetrics` (`CanvasSheet.svelte:407`) | Identical |
| Open Questions | `openQuestions` (`CanvasSheet.svelte:416`) | Identical |
| *(section order)* | README order is Name → Purpose → Classification → Roles → Inbound → **Outbound** → Ubiquitous Language → Business Decisions → …; the project's file and digest order is … → Inbound → **Ubiquitous Language → Business Decisions** → Outbound (`canvas.ts:43`, `mcp/src/sections.ts:35`) | **Reordered** — the project follows the canvas's left-to-right spatial reading; the README follows its recommended fill order |

### 3.2 Sub-fields and structure

| Canonical element | This project | Status |
|---|---|---|
| Swimlane = one collaborator + the messages it exchanges | `Lane = { collaborator, relationship?, messages }` (`canvas.ts:15`) | Identical — the project implements the swimlane organisation as its only structure |
| Message = name + one of three types | `{ type, name, description? }` (`canvas.ts:9`); `type` closed (`parse.ts:54`) | Identical + **project addition**: a per-message `description?` |
| Message colour: query green / command blue / event orange (Excalidraw legend) | Same assignments (`SPEC.md:172`, legend `CanvasSheet.svelte:56`) | Identical |
| **Collaborator type**: Bounded Context / External System / Frontend / Direct User Interaction, drawn as distinct icons (`collaborator-types.jpeg`) | Collaborator is a bare name string; **no `kind`** (`canvas.ts:16`, decided at `003-canvas-file-schema.md:64`); the distinction survives only as glossary prose (`CONTEXT.md:15`) | **Missing** — deliberate, documented |
| **Relationship type**, drawn on **both sides** of a lane (`collaborator-example.jpeg`) | One optional `relationship` string per lane (`canvas.ts:17`), rendered once beside the collaborator (`CanvasSheet.svelte:111`) | **Restructured** — one-sided where canonical notation is two-sided |
| Relationship vocabulary = `ddd-crew/context-mapping` Context Map Patterns (9) | The same nine, kebab-cased, with teaching one-liners (`vocab.ts:40`), plus custom | Identical in content |
| *(canonical has no equivalent)* | Context Mapping's three coarser **Team Relationships** (Mutually Dependent / Upstream Downstream / Free) are not offered | Absent from both the canvas and this project — not a deviation |
| Ubiquitous Language card = term + definition (`<Domain Term>/<definition>`) | `{ term, definition? }` (`canvas.ts:25`) | Identical |
| Business Decision card = one decision | `{ name, description? }` (`canvas.ts:30`) | Identical + **project addition**: `description?` |
| UL and Business Decisions drawn inside one shared outer box | Two sibling panels stacked in the centre column (`CanvasSheet.svelte:507`) | Cosmetic — canonical also treats them as two sections |
| Assumptions / Metrics / Open Questions = free bullets | `string[]` one-liners (`canvas.ts:53`) | Identical |
| Canvas-level `V5` + repo URL + CC-BY badge in the top bar | Eyebrow `Bounded Context Canvas · V5` (`CanvasSheet.svelte:211`); attribution and CC BY 4.0 in the footer (`CanvasSheet.svelte:432`) | Identical in substance, relocated |

### 3.3 Enumerations

| Axis | Canonical | This project (`vocab.ts:26`) | Status |
|---|---|---|---|
| Domain | `core` · `supporting` · `generic` · `other?` (canvas); "core domain"/"supporting domain"/"generic" (README) | `core` · `supporting` · `generic` + custom… | Identical (`other?` is realised as the custom escape hatch) |
| Business Model | `revenue` · `engagement` · `compliance` · `cost reduction` (canvas + HTML form); README omits the fourth | `revenue` · `engagement` · `compliance` · `cost-reduction` + custom… | Identical — the project follows the **drawn canvas**, which is the more complete source |
| Evolution | `genesis` · `custom built` · `product` · `commodity` | `genesis` · `custom-built` · `product` · `commodity` + custom… | Identical (kebab-cased) |
| Message type | `command` · `query` · `event` | Same, and the only genuinely closed enum (`parse.ts:54`) | Identical |
| Relationship | 9 Context Map Patterns, free text in the HTML form | Same 9, kebab-cased, escape-hatched (`vocab.ts:40`) | Identical; canonical never closes this set either |

### 3.4 Domain roles, trait by trait

Canonical source is `resources/model-traits-worksheet.md`, which explicitly invites you to "think of your own traits", so none of the below is a rule violation — but the *names* diverge substantially.

| Model Traits worksheet | This project (`vocab.ts:84`) | Status |
|---|---|---|
| Specification/Draft Model | `specification model` **and** `draft context` | Split into two |
| Execution Model | `execution context` | Renamed (matches the canvas's own `Role Types` list) |
| Analysis/Audit Model | `audit model` **and** `analysis context` | Split into two (both match the canvas list / worksheet halves) |
| Approver | `approver` | Identical |
| Enforcer | `enforcer` | Identical |
| Octopus Enforcer — "Ensures that multiple/all contexts in the system all comply with a standard rule" | `octopus coordinator` — "Orchestrates several contexts to fulfil one process." | **Renamed with semantic drift**: enforcement → orchestration |
| Interchanger | `interchange context` | Renamed |
| Gateway | `gateway context` | Renamed (matches the canvas list) |
| Gateway Interchange | — | **Missing** |
| Dogfood Context | — | **Missing** |
| Bubble Context | — | **Missing** (only the autonomous variant is kept) |
| Autonomous Bubble | `autonomous bubble` | Identical |
| Brain Context **(likely anti-pattern)** | `brain context` — "Concentrates the cleverest, most valuable logic." | Renamed; **the anti-pattern warning is lost**, and the description reads as praise |
| Funnel Context | `funnel context` | Identical in substance |
| Engagement Context | `engagement context` | Identical |
| — | `service context` — "Offers a capability other contexts consume on demand." | **Project-only addition** |

All four traits printed on the v5 canvas under `Role Types` (`draft context`, `execution context`, `analysis context`, `gateway context`) are present in the project's list.

### 3.5 Internal inconsistencies inside this repo

Not deviations from canonical, but worth recording since they show the rename was not applied uniformly:

- `CONTEXT.md:9` describes a Canvas as "(name, **purpose**, strategic classification, …)" — the glossary uses the v5 word the schema rejected.
- `wayfinder/tickets/010-keyboard-a11y.md:32` gives the accessible-name example as `"Name", "Purpose", "Term"`; the shipped accessible name is `Description` (`src/lib/sheet/CanvasSheet.svelte:249`).
- `mcp/src/sections.ts:51` carries a `Strategic classification` label that no sheet heading corresponds to. Harmless — arguably it is the honest thing for a prose channel — but the sheet and the digest are not saying the same thing about whether that section exists.

---

## 4. What this means

**Cosmetic, no semantic loss.** Sentence case for headings; kebab-cased enum values; dropped sub-labels (`Role Types`, `Context-specific domain terminology`, `Key business rules, policies, and decisions`) that are teaching prose on a paper template and are replaced here by placeholder questions (`SPEC.md:292 ff`, surfaced through `mcp/src/sections.ts`); Ubiquitous Language and Business Decisions as two panels rather than one drawn box; the CC-BY badge moving to the footer.

**Deliberate simplifications, documented, no data loss.** Dropping the collaborator **kind** (`003-canvas-file-schema.md:64`) removes a distinction the canonical canvas draws with four icons — a reader of an exported artifact cannot tell a frontend from an external system from a bounded context. The reasoning (nothing consumes it; adding an optional field is the cheapest later migration) is sound, and the information can still be written into the collaborator's name. The one-sided **relationship** is the same kind of trade: canonical notation marks a role at *each* end of the boundary (`Sales Context — PNR … PNR — this context`, `OHS` at this context's edge facing a `CF` frontend), and a single string cannot express an asymmetric pairing like *this context is Open-host Service, that collaborator is Conformist*. That is the one place where a canonical canvas carries information this file format cannot round-trip.

**The two Mitchell spotted.** *Description vs Purpose* is a straight rename with no semantic loss — the section definition is word-for-word the same text upstream, and the rename is upstream's own v4→v5 change ([`f438279`](https://github.com/ddd-crew/bounded-context-canvas/commit/f438279)), so this project is using the v4 label under a `V5` badge. The cost is purely one of recognition for someone arriving from the ddd-crew material, plus the internal inconsistency in `CONTEXT.md:9`. *Strategic Classification* is a **restructuring, not an omission**: all three axes are in the file, in the digest, and on the sheet — but they are dressed as metadata in the title block rather than as one of the canvas's nine equal panels, which reads as demoting a section the README treats as a first-class design decision (it links Core Domain Charts for it). A reader comparing the rendered sheet against a printed v5 canvas will count nine panels where the canonical has ten.

**Genuine gaps worth a decision.** The two-sided relationship notation; the collaborator kind; and the domain-role list, which is the largest silent divergence in the project — three worksheet traits are absent (Gateway Interchange, Dogfood Context, Bubble Context), one is invented (`service context`), `octopus coordinator` reverses the meaning of `Octopus Enforcer`, and `brain context` drops the worksheet's "(likely anti-pattern)" caveat while describing it in flattering terms. Because the worksheet invites custom traits, none of this is out of bounds — but the project presents its fifteen as "The fifteen" (`mcp/src/explain.ts:73`), which reads as canonical authority the list does not have.

**Not deviations.** The section ordering difference is real but benign — the README's order is a *filling* order, the project's is the canvas's *spatial* order, and both are defensible. `cost-reduction` on the business-model axis is not an invention: it is on the drawn canvas and in the upstream HTML form, and only the README prose omits it. The nine relationship patterns match `ddd-crew/context-mapping` exactly. Message types, message colours, and the term/definition and decision card shapes all match. Free-text validation of the classification axes and relationships (`parse.ts:140`, `:167`) matches canonical, which never closes those sets either.
