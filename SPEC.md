# BC Canvas — Specification

A client-side WYSIWYG editor for the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas) (V5 canonical layout). Single canvas at a time, like a document editor. Edits happen inline on the rendered sheet; the durable format is a versioned JSON **Canvas file**; sharing happens through exported **Artifacts** (self-contained HTML, 2x PNG).

This spec compiles the decisions of the wayfinder map (`wayfinder/map.md`); each ticket under `wayfinder/tickets/` holds the full reasoning behind its section. The glossary in `CONTEXT.md` is normative for the terms used below.

---

## 1. Scope

**In scope (v1):**

- WYSIWYG inline editing of one Bounded Context Canvas, V5 canonical layout.
- **Three Views of that one canvas** (§6): the Sheet, the Canvas file's JSON — editable, applied explicitly — and a read-only Markdown rendering.
- Import/export of the versioned Canvas file (`.bcc.json`).
- Export of a self-contained, re-importable HTML artifact (`.bcc.html`), a 2x PNG (`.bcc.png`), an SVG image (`.bcc.svg`, §9.3), and the Markdown rendering (`.bcc.md`) — the last three one-way, never an import.
- Autosave to localStorage as a safety net; single linear undo/redo.
- Full keyboard operability of the editor; WCAG AA for the HTML artifact.
- Four bundled example canvases, opened from the chrome through the import path (§3.5, §10).
- A command line over the canvases committed in a project, `bcc` (`cli/`): `render`, `check`, `fmt`, `ls`. It writes the same artifact families the editor exports, through the same parser, serializer and headless renderer (§9) — the artifact `bcc render` writes and the artifact the Export menu downloads are byte-identical, because one function writes both. Full decision record: `wayfinder/tickets/051-cli-home.md`, `wayfinder/tickets/055-bcc-cli.md`.
- A **`bcc` fence** in a markdown file (`CONTEXT.md`), holding one path to a Canvas file and rendering as the Sheet where the file is built or previewed. Its contract is one thing in one place (`src/lib/fence/fence.ts`) and its adapters are thin: `remark/` covers every unified-based site generator, and `vscode/` covers the built-in markdown preview, where the sheet reflows with the pane and re-draws when the canvas it points at changes. The fence is read-only, adds no parser and takes no options; it resolves through the same read-and-parse path every other filesystem caller uses, and what it cannot draw it says so in place of. Full decision record: `wayfinder/tickets/052-fence-shape.md`, `wayfinder/tickets/057-remark-plugin.md`, `wayfinder/tickets/058-vscode-extension.md`.

**Out of scope (v1):**

- Backend, auth, real-time collaboration, team libraries — sharing happens via exported files/artifacts.
- Multi-canvas library and context-map relationships between canvases — single-document editor only.
- Use Case Swimlanes layout variant — V5 canonical only.
- PDF export — browsers print the HTML artifact fine (it carries a print pass).
- Importing foreign formats (Contexture, Excalidraw, Miro) — own Canvas file schema only.
- Mobile/tablet editing — desktop-first: the editor reflows at narrow windows (§5) so nothing collides or crops, but touch editing is untargeted; the read-only HTML artifact remains the mobile answer.

## 2. Stack & deployment

- **SvelteKit** (TypeScript) + **Tailwind CSS v4**, `adapter-static`, deployed to **Cloudflare Pages**. Strictly client-side; no server code.
- Fonts self-hosted same-origin: **Archivo** (structure/labels), **Source Serif 4** (user prose), **IBM Plex Mono** (identifiers) — latin subsets, WOFF2.
- PNG capture: **`@zumer/snapdom`** (see §9).
- License: the canvas is CC BY 4.0 — ddd-crew attribution appears in the app footer and in every artifact (see §10, §11).

## 3. The Canvas file schema

The Canvas file is the portable, re-importable serialization: flat camelCase JSON, integer root `version`, then the eleven V5 sections in canonical order. Full decision record: `wayfinder/tickets/003-canvas-file-schema.md`, amended to version 2 by `wayfinder/tickets/035-canonical-v5-amendments.md` (carried by `036-canvas-file-v2.md`): `description` → `purpose`, the collaborator promoted to an object with an optional `kind`, and `relationship` made two-sided.

### 3.1 Reference example

```json
{
  "version": 2,
  "name": "Order Fulfillment",
  "purpose": "Coordinates picking, packing and shipping once an order is paid.",
  "strategicClassification": {
    "domain": "core",
    "businessModel": "revenue",
    "evolution": "custom-built"
  },
  "domainRoles": [
    { "name": "execution context" }
  ],
  "inboundCommunication": [
    {
      "collaborator": { "name": "Checkout" },
      "relationship": { "ours": "customer-supplier" },
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
    {
      "collaborator": { "name": "Notifications", "kind": "bounded-context" },
      "relationship": { "theirs": "conformist", "ours": "open-host-service" },
      "messages": [{ "type": "event", "name": "Order Shipped" }]
    }
  ],
  "assumptions": ["Warehouse stock counts are accurate within the hour."],
  "verificationMetrics": ["Time from payment to dispatch under 4 hours."],
  "openQuestions": ["Who owns returns — this context or a new one?"]
}
```

### 3.2 Shape rules

- **Sections:** `name` and `purpose` are strings (`purpose` is upstream's own v4→v5 rename, adopted at version 2); `strategicClassification` is an object of three optional axes; `domainRoles` are `{ name }` rows — no per-role description (sign-off amendment to the schema decision: the trait one-liners are app-side teaching text, never file content, and no approved interaction writes a per-role description); `businessDecisions` are `{ name, description? }` rows; `ubiquitousLanguage` is `{ term, definition? }` rows; `inboundCommunication`/`outboundCommunication` are lists of lanes; `assumptions`, `verificationMetrics`, `openQuestions` are plain string arrays (one-liner stickies).
- **Lane:** `{ collaborator, relationship?, messages }`. `collaborator` is `{ name, kind? }` — the kind belongs to the collaborator, the relationship to the boundary, so they live on different levels. `kind` is optional and **closed**: `bounded-context | external-system | frontend | user`, canonical's four collaborator types; a lane without one renders with no icon, and an absent kind means unclassified, not bounded-context. `relationship` is `{ theirs?, ours? }` — the context-mapping pattern read from each end of the boundary, the collaborator's side and this context's, both optional escape-hatched strings. A symmetric pattern carries the same word at both ends; an asymmetric one carries two, which is the case a single string could not express. `theirs` serializes first, the order the sheet draws them. A relationship with neither end is omitted whole.
- **Message row:** `{ type, name, description? }`; `type` is a genuinely **closed** enum `command | query | event` — no escape hatch (it carries the Event Storming color semantics).
- **Closed where the value drives a rendering, lax everywhere else.** `type` picks a chip color and `kind` picks an icon, so those two sets are closed; classification axes, relationship ends and domain roles accept any string, matching canonical, which never closes those sets either.
- **Escape hatch = single string field.** Curated values are canonical well-known strings; any other string is a custom value the UI renders as-is. No tagged unions. Unknown values round-trip by construction.
- **No row ids** — the file is pure content; runtime keys are ephemeral (§6.1). No metadata envelope: no timestamps, no generator string.
- **Presence:** all eleven section keys always present (empty arrays/strings, never missing). Optional fields (`description`, `definition`, `kind`, `relationship` and each of its ends, unset classification axes) are omitted entirely, never `null`.
- **Deterministic serialization:** 2-space indent, fixed key order — an unchanged canvas serializes byte-identically.
- **One on-disk form:** a `.bcc.json` is the serializer's bytes plus a trailing newline, wherever it comes from — `bcc fmt`, the committed examples (§3.5), and the editor's Canvas-file export all produce it. The editor download commits as-is with nothing for `fmt` to rewrite (ticket 064).

### 3.3 Versioning & migration

- Integer root `version` (currently `2`); ordered raw-JSON migrations applied on load.
- **v1 → v2** (the first migration ever run): `description` → `purpose`, `collaborator` string → `{ name }`, and a v1 `relationship` string lands on **`ours`, uniformly, with no interpretation**. The rule is deliberately not "that is what people meant" — the nine teaching one-liners are written from mixed perspectives, so no single side ever was. It carries because both ends are optional free text: a wrong guess renders visibly on the lane and is one pick to correct, with nothing lost. The migration never rewrites free text (an off-vocabulary domain role survives as typed), and a migrated import lands **clean, not dirty** — the file on disk still opens, and nothing the user typed is unsaved.
- Files with a version **newer** than the app knows are **refused** with a clear message (§10) and never mutated — no best-effort parsing.
- A missing/unparsable structure is refused as "not a Canvas file" (§10).
- **One validator, two levels of disclosure.** A "not a Canvas file" refusal also carries an optional `detail`: one line naming the offending field and what was expected there — `inboundCommunication[1].messages[0].type: expected one of "command", "query", "event", got "notification".` — with paths written the way a developer would type them to reach the value (the v2 fields included: `inboundCommunication[0].collaborator.kind`, `outboundCommunication[0].relationship.theirs`), and a full stop on the end so a caller can join it with sentences of its own. The editor ignores it; the user sees the §10 sentence and nothing more. It exists so a non-interactive caller of the same parser can teach rather than merely refuse, from the same walk, so the two levels cannot describe different schemas. **The detail is shown where the offending bytes are on screen** — the boundary in one sentence. The import dialog withholds it because someone who picked the wrong file has no text in front of them; the JSON View (§6) shows it because the path names a location in the buffer they are looking at. The clause is worded for both readers at once, naming neither "the file" nor "this text" (`expected valid JSON (…)`).

### 3.4 File naming

Slugified context name as stem, family-signaling extensions: `<slug>.bcc.json` / `<slug>.bcc.html` / `<slug>.bcc.png` / `<slug>.bcc.svg` / `<slug>.bcc.md` (e.g. `order-fulfillment.bcc.json`). Unnamed canvas falls back to `bounded-context-canvas`. No date stamps. The `.bcc.md` file is the Markdown View's bytes exactly (§6), from the one renderer, delivered as a Blob download like the others — and with the two images it is a member of the family that never comes back in (§1).

`bcc` (§1) names a rendered file differently, and deliberately: it takes the **stem of the canvas file on disk** (`orders.bcc.json` → `orders.bcc.svg`), never a slug of the context name inside it. A committed image has to be findable from the path of the canvas beside it — that is what makes §9.3's staleness check possible — and renaming the context inside a file would otherwise move the image out from under it.

### 3.5 Bundled examples

Four curated example canvases — Order Fulfillment (core, every section filled), Notifications (generic, receiving Order Fulfillment's `Order Shipped` event), Appointment Scheduling (supporting), Royalty Distribution (deliberately mid-workshop, classification unset) — chosen and authored via `wayfinder/tickets/020-example-roster.md` / `022-author-examples.md`. All invented domains; no derivation beyond the standing ddd-crew attribution (§11).

- The committed `examples/*.bcc.json` files are the **single source**: serializer-canonical bytes plus a trailing newline, bundled into the app as raw text and linked from the README as plain downloads. Nothing is duplicated in `src/`.
- Opening one goes through the **same parse path as any import** — version check and migrations included — so a schema bump reaches the examples through its migration; a pinning test (`src/lib/chrome/examples.test.ts`) holds every file byte-exact through that path at the current version.
- The chooser itself is chrome (§10); its entry one-liners are app copy, never file content.
- Each canvas has a committed **`.bcc.svg`** beside it (§9.3), rendered by `bcc`, one of which the README draws. They are the project's own first use of a committed image, so the staleness check runs over them in the suite: `bcc check --root examples` re-renders each and compares the bytes.

## 4. Curated vocabularies

Picker-plus-escape-hatch throughout, with one exception: the picker offers the canonical strings below; **custom…** accepts any string, which renders identically to curated values and round-trips through the serializer. The exception is the collaborator kind (§4.2), a closed set — its picker has no **custom…**, because the value picks an icon and the parser refuses unknown kinds by name (§3.2).

### 4.1 Strategic classification (kebab-case axis values)

| Axis | Values |
|---|---|
| `domain` | `core` · `supporting` · `generic` |
| `businessModel` | `revenue` · `engagement` · `compliance` · `cost-reduction` |
| `evolution` | `genesis` · `custom-built` · `product` · `commodity` |

Each axis picker additionally offers **— none —** (clears the axis back to unset, rendering "—") and **custom…**.

### 4.2 Collaborator kinds (the closed picker set)

The four canonical collaborator types, drawn as icons on the sheet and keyed in the footer legend (§5):

| Kind | Icon | One-liner |
|---|---|---|
| `bounded-context` | cloud | Another modelled context in the system, with its own team and language. |
| `external-system` | gear | A system outside the design — third-party or legacy — taken as it is. |
| `frontend` | monitor | A user interface that consumes this context from outside it. |
| `user` | person | Direct user interaction — this context owns the interface people use. |

The kind picker additionally offers **— no kind —** (clears back to unset; a lane without a kind renders no icon) and, uniquely, no **custom…** (§4 intro).

### 4.3 Domain-role traits (the model-traits worksheet, plus one local addition)

The set is the ddd-crew model-traits worksheet in the worksheet's own order — the worksheet fixes no count and invites custom traits, so no count is claimed anywhere; where the worksheet slashes two names into one row (Specification/Draft, Analysis/Audit), the project's split keeps the slash's order. `service context` is the local addition and sits last, marked as local in its description. File values are natural lowercase prose (`"execution context"`), not slugs; displayed sentence-case in the picker with these one-line descriptions:

| Trait | Description |
|---|---|
| specification model | Encodes the detailed rules of a critical business calculation. |
| draft context | A model still being explored; expect churn. |
| execution context | Carries out a business workflow from trigger to outcome. |
| analysis context | Derives insight from data other contexts produce. |
| audit model | Records what happened for traceability and compliance. |
| approver | Decides whether a requested action may proceed. |
| enforcer | Makes other contexts comply with a policy or standard. |
| octopus enforcer | Holds many contexts at once to the same standard rule. |
| interchange context | Translates between two models so neither has to bend. |
| gateway context | Fronts an external system or protocol for the rest of the system. |
| gateway interchange | Fronts an external protocol and translates its model in the same place. |
| dogfood context | Used daily by the team that builds it, so the model is tested from inside. |
| bubble context | A clean model kept apart from legacy behind a translation layer. |
| autonomous bubble | Deliberately isolated from legacy models so it can evolve freely. |
| brain context | Concentrates so much logic that everything else leans on it — likely an anti-pattern. |
| funnel context | Condenses input from many sources into one stream. |
| engagement context | Drives user interaction and experience. |
| service context | Offers a capability other contexts consume on demand. Local addition, not on the community worksheet. |

`brain context` carries the worksheet's "(likely anti-pattern)" flag and renders with a caution ring on the sheet (§5) — matched by name, so a hand-typed custom `brain context` rings too. The local-addition marker stays off the sheet: provenance lives in the picker description and `bcc_explain`, not on the modelled context.

### 4.4 Relationship patterns (kebab-case)

One vocabulary for both ends of a lane's relationship — the collaborator's side and this context's share it, because they name the two sides of one boundary. Taught in the picker via these one-liners (no separate reference section — see §12):

| Pattern | One-liner |
|---|---|
| `partnership` | The two contexts succeed or fail together; teams coordinate as equals. |
| `shared-kernel` | Both contexts share a piece of the model, changed only by mutual agreement. |
| `customer-supplier` | Upstream plans around this context's needs, like a supplier serving a customer. |
| `conformist` | This context adopts the upstream model wholesale rather than translating it. |
| `anticorruption-layer` | A translation layer at the boundary keeps the upstream model from leaking in. |
| `open-host-service` | Upstream exposes one published protocol that all consumers use. |
| `published-language` | The exchange uses a shared, well-documented format — often an industry standard. |
| `separate-ways` | No integration — duplication costs less than coupling here. |
| `big-ball-of-mud` | The other side is entangled legacy; defend this context's boundary. |

Each relationship picker additionally offers **— no relationship —** (clears that end; the pair is omitted from the file once both ends clear) and **custom…**; neither carries a description.

## 5. Visual language — the quiet sheet

Winner of three prototype rounds; primary source `prototype/canvas-visual-language/6-quiet-sheet/` on branch `prototype/canvas-visual-language`.

- **Ground:** warm cream paper `#EAE7DE` with a faint 32px drafting grid; sections as near-white sheets `#FDFDFB`, 1px `#D8D4C8` border, 5px radius, whisper of shadow. V5 canonical layout on a 12-column grid, ten panels matching the printed canvas: purpose ×5 / classification ×4 / roles ×3 on top; inbound left; ubiquitous language + business decisions centre; outbound right; assumptions/metrics/open questions bottom.
- **Responsive tiers:** the editor reflows by the sheet container's width — never the viewport — through three tiers below the canonical grid: a trim tier (≤1060px) that tightens `--gap` and panel padding so the twelve columns survive narrow windows; a two-column tier (≤880px) — purpose full-width, classification beside roles, inbound beside outbound (the lanes keep their in/out reading), the centre pair side by side in its full-width box, questions full-width; and a one-column stack (≤620px) in the artifact's reading order (§9.1). Only the editor's `<main>` declares the container, so the offscreen mount and exported HTML have no container ancestor and the tier rules are inert there — artifacts keep the fixed desktop grid (§9.2). Chrome shares the editor's responsive gutters (`px-4/6/10`). Mobile/tablet *editing* stays a non-goal (§1).
- **View switcher:** a segmented pill in the gutter band above the sheet, at the sheet's own left edge — the chrome's button idiom (4px radius, 1px line border, 1px dividers, Archivo 500 at 0.8rem) with the active segment filled ink at weight 600, and the focus ring **inset** (`outline-offset: -2px`, inverted to sheet on the filled segment, where an ink ring would vanish). It rests **unfilled** on the paper and fills sheet on hover — the inverse of a chrome button, which rests sheet and darkens to paper — which is the softening the §6 known risk asks for. The strip is a **sibling** of the sheet, never part of it: `CanvasSheet` is shared with the offscreen mount and grows no switcher seam, and the switcher renders in the editor only (like the tiers above, it is inert in an artifact — §9). The unapplied marker is a hotspot-pink dot inside the JSON segment, dimmed by colour and never by opacity.
- **Title block:** near-black ink block (`#1A1E20`, 6px radius) carrying the spaced-caps eyebrow "Bounded Context Canvas · V5" and the context name in Archivo 700 — nothing else. (Strategic classification lived here through canvas-file v1; it is now the tenth panel, below.)
- **Strategic classification panel:** the three axes as `Domain` / `Business model` / `Evolution` sub-columns, keeping the title block's idiom — spaced-caps label, mono value, no fill and no box. Unset axes render "—".
- **Centre plate:** the canonical template draws Ubiquitous Language and Business Decisions inside one outer rectangle; the sheet renders that region as a tinted plate — a translucent ink wash (`rgb(26 30 32 / 0.045)`, 6px radius) on the paper with the drafting grid showing through — rather than a drawn border. Layout, not nesting; they stay two sections with their own headings.
- **Type trio:** Archivo for structure/labels, Source Serif 4 for user prose, IBM Plex Mono for identifiers (messages, terms, classification values, relationships).
- **Palette** (EventStorming fill + same-hue ink border):

  | Meaning | Fill | Ink |
  |---|---|---|
  | command | `#85BCE5` | `#33688F` |
  | query | `#93CB91` | `#40733E` |
  | event | `#F3A54E` | `#A96517` |
  | policy (business decision) | `#C2ABDD` | `#6F519B` |
  | collaborator | `#F1A5CB` | `#A94879` |
  | hotspot (open question) | `#F76BA3` | `#B92367` |
  | term | `#EFE08B` | `#8A7A12` |

  These tokens are subject to the AA-contrast rule in §8.4: if a pair fails AA in the artifact, the token shifts everywhere (shared renderer — editor and artifact cannot diverge).
- **Messages:** one uniform chip shape (rounded mono chip, fill + ink border) for all three types, distinguished by color and glyph: ▶ command, ? query, ◆ event. No per-type shapes.
- **Collaborators:** name in collaborator-pink ink with a pink underline — no sticky box — led by the kind's stroke icon (cloud / gear / monitor / person, §4.2) when a kind is set; the icon is decorative, with the meaning as a visually-hidden prefix ("Bounded context: ").
- **Relationship, two-sided:** one quiet mono line under the lane head, collaborator's side first: theirs set back in ink-soft, an arrow, ours forward in full ink at weight 500. The arrow is reading order across the boundary — never message flow, which the panels already carry — so it points the same way in both panels. A one-sided value keeps the arrow, and the side is read from its position (before the arrow = theirs, after = ours). Weight and order say nothing to a screen reader, so each side carries a visually-hidden "Collaborator: " / "this context: " prefix. (The alignment mockup drew theirs in ink-faint; it ships in ink-soft because faint fails the §8.4 AA gate as text.)
- **Section labels:** small-caps Archivo with a short 2px underline in the section's hue (neutral gray where no hue applies).
- **Terms:** highlighter stroke under the mono term. **Decisions/questions:** small colored square markers (policy lilac; hotspot pink, rotated).
- **Footer** (on the sheet, inside the PNG capture region): one-line legend + attribution (§10 has the exact strings) — the six swatches, then the four kind icons, then the relationship-pair key `theirs → ours` in the lanes' own inks, since ink weight is not self-describing and the legend is where this sheet explains its notation.
- No teaching hints on a filled canvas — teaching lives in the empty state (§7) and pickers.

## 6. Interaction model — the live sheet

Winner of the inline-editing prototype; primary source `prototype/inline-editing/1-live-sheet/` on branch `prototype/inline-editing`.

- **Modeless.** No edit mode, no per-section forms — the canvas is a document. Every free-text value is contenteditable (plaintext) in place, always. Blur commits; Enter commits single-line fields; Esc reverts the field.
- **Affordances materialize on approach.** The presentation view carries zero editing chrome. Hovering a panel fades in its ghost adds; hovering an item reveals its ×; hovering a lane reveals its ⠿ drag grip. Editable text shows a faint halo on hover, a hairline outline on focus. (Focus reveals the same affordances — §8.2.)
- **Curated vocabularies are popovers on the value itself.** Classification axes, the collaborator kind and both relationship ends are clickable where they render → popover with the curated list, ✓ on the current value, **custom…** input as escape hatch on the open vocabularies (the kind is closed, §4.2); classification axes offer **— none —**, the kind **— no kind —**, each relationship end **— no relationship —**. Custom values render identically to curated ones. A lane header carries three pick-slots — kind, their relationship, our relationship — never a bespoke paired control.
- **Domain roles:** ghost "+ trait" chip → multi-select popover checklist of the worksheet traits with inline one-line descriptions, plus a custom-trait input; chips removed via hover ×. The prototype's "Why these roles?" free-text note is **dropped** (ui-copy decision) — domain roles are chips only; do not rebuild that field even though it appears in the primary-source prototype.
- **Messages:** ghost "+" per lane → mini type popover (▶ command / ? query / ◆ event), then the new chip's name field is focused for immediate typing. Chips drag-reorder within their lane; lanes drag-reorder by grip; lane × removes the collaborator.
- **Three Views of one canvas.** Peer tabs above the sheet (§5), not file verbs in the chrome: **Sheet · JSON · Markdown**. The title block belongs to the Sheet — switching replaces everything below the pill. Sheet is the default and the app always opens on it; the autosave slot is the Canvas file byte-for-byte and does not grow app-UI state. No `⌘1/2/3` at v1.
- **The JSON View is editable, with an explicit Apply.** The box shows the exact export bytes (§3.2) and re-renders from the document. **Apply** parses that text and replaces the whole document as **one commit, one undo step** — not live-on-keystroke (half-typed JSON is invalid for most keystrokes, and every valid intermediate would pollute undo) and not commit-on-blur (that hides a whole-document replacement behind an accidental click). Apply runs `parseCanvasFile` — the importer's own version check, ordered migrations and strict validation, minus only the HTML-embed wrapper, which discards the JSON engine's message; so a v1 paste comes back as migrated v2 bytes in the box, and a `.bcc.html` pasted here is not accepted (that is a file picker's affordance). A plain textarea, no code editor: the View exists to inspect and hand-fix, not to author. Refusal copy and placement in §10.
- **The Markdown View is source, not a rendered document** — the raw `.md` text in a mono block, from the one renderer the MCP server also uses — and the bytes the Export menu's `.bcc.md` writes (§3.4). Read and copy only; Markdown never comes back in (§1). Both text Views carry copy-to-clipboard; neither clears Unexported changes (§6.1).
- **Commit granularity:** one field blur = one commit; one structural action (add / remove / reorder / pick) = one commit. Commits are the unit of undo and autosave (§6.1).
- **Known accepted risks** (soften in build, don't change the model): discoverability of hover-only affordances, stray-click carets in prose, and the **View switcher's resemblance to the chrome** — held beside Import…/Examples/Export the pill is plainly the same family. It is softened in §5 (unfilled at rest, hover inverted, a step further down) rather than escaped; it bites hardest where the chrome wraps, and it does not exist in an artifact at all, which has no chrome band.

### 6.1 Document state, undo/redo & autosave

Full decision record: `wayfinder/tickets/006-state-undo-autosave.md`.

**Runtime document.** Exactly the Canvas file shape, with an ephemeral `id` stamped onto each row/lane object on load/creation for keyed rendering and drag-reorder. Serialization strips ids and applies fixed key order — ids never reach the file. One model, one serializer; no normalized store.

**Undo/redo.**
- Single linear history of **full-document snapshots**, one per commit; undo/redo swaps the document. Uncapped within the session; session-scoped (cleared on import/new, not persisted across reloads).
- **Cmd+Z intercepted globally.** If the focused field has uncommitted edits, Cmd+Z reverts the field (synonym of Esc); otherwise it pops app history. Native contenteditable undo is never in play.
- Undo/redo **scrolls the affected region into view with a brief highlight** but never moves focus.

**The JSON buffer.** The one piece of state allowed to disagree with the document. Two states and one invariant: the box either **follows** the canvas (it shows the export bytes, live) or **disagrees** with it (it shows the user's text, which by the invariant is not those bytes). The unapplied marker on the JSON tab (§5) *is* that disagreement — not a flag anyone maintains — so typing an edit back out drops the buffer rather than holding one that agrees with the document.
- **Apply's no-op test is on the parse result**, not the raw text: `serialize(parse(text)) === serialize(doc)`. Text differing only in whitespace or key order parses to the document already open, and landing that in history would be an undo step that undoes nothing (the pickers' rule, applied to a whole document). Every successful Apply returns the box to following — which is how a migration shows itself.
- **The document moving underneath never overwrites the buffer.** Because Apply is a whole-document replacement, a proposal written before a sheet edit silently replaces that edit, so the View says so first (§10) against a **basis** — the document's bytes when the proposal was born, fixed once. It blocks nothing.
- **The session boundary (import, new, example) discards the buffer**, with no dialog, and is the only thing that does. The app spends its one confirmation on unexported *canvas* changes; losing a proposal costs a re-paste. The buffer is never persisted, and the unload flush cannot reach it (a plain textarea registers nothing).
- **⌘Z inside the box is the browser's own text undo** — the global interception already exempts `textarea` — and **Esc does nothing** there: its sheet meaning is "revert this field to its last committed value", and a buffer has none.
- An undo/redo landing while a text View is showing announces as always and reveals nothing: there is no affected region on screen, and it never switches the View out from under the reader. While following, the box holds its scroll position across such a re-render.

**Autosave.**
- Serialize and write the Canvas file JSON to localStorage on **every commit** (no debounce); a `beforeunload`/`visibilitychange` flush commits any mid-edit field first.
- Single fixed key `bcc.autosave`; history is not persisted. On app load: restore the slot if present, else a blank canvas.
- **Multi-tab:** last write wins, softened by a persistent notice in both tabs (via the `storage` event) — no locking. Wording in §10.

**Unexported changes (the dirty state).** The Canvas has changed since it last left the browser in a re-importable form. Cleared by Canvas-file export/import **and HTML-artifact export/import**; never by the lossy pair — PNG export and Markdown export — nor by either text View's Copy. Being wrong here costs a user their canvas: a Markdown export that cleared the indicator would tell someone they were safe to close the tab. Drives the quiet indicator (§10) and the confirmation gate:
- **Import, New, or opening an example over unexported changes:** confirmation dialog first (§10); on proceed the document is replaced and history cleared — a session boundary, not an undoable edit. With nothing unexported, import/new/example proceeds without ceremony.
- **An opened example lands clean:** its bytes exist as a published re-importable file (§3.5), so nothing is unexported until the first edit dirties as usual.

## 7. Empty state & teaching

Winner of the empty-state prototype; primary source `prototype/empty-state/1-placeholder-questions/` on branch `prototype/empty-state`.

- **No hint layer, no seeding, no welcome/tour.** A brand-new canvas is the ordinary quiet sheet with everything empty; the form itself teaches.
- **Empty free-text fields** carry the section's ddd-crew helper question as their italic placeholder; **empty-section ghost adds** carry the question too. Final copy in §10.
- **Ghost adds are always visible on an empty section**, hover/focus-materialized once the section has content (amendment to the live-sheet hover rule).
- **Disappearance is instant and granular:** typing replaces a placeholder; the first item shortens the ghost to its terse label. Both return automatically whenever a field or section is emptied — state-driven, no first-run flag.
- **Title block and classification panel:** name placeholder "Name this context"; classification values render "—" until picked; classification teaching stays in the pickers.

## 8. Keyboard model & accessibility

Full decision record: `wayfinder/tickets/010-keyboard-a11y.md`.

**Ambition:** the editor commits to **full keyboard operability** — every pointer action has a keyboard path — with sound roles/labels/announcements, but makes **no formal WCAG claim** for v1. The **HTML artifact commits to WCAG AA**. The two images are exempt (presentation-only) — an SVG drawn through `<img>` is a picture like a PNG, and the `alt` text beside it is the document's job, not the file's.

### 8.1 Tab order

One linear sequence in reading order — every editable field, chip, and pickable value is a tab stop. No grid-navigation ceremony. (A section-skip accelerator is a build-time nice-to-have, not a commitment.)

The View switcher is a real `role="tablist"` with **one tab stop for the set**: arrows move and select (Home/End included), focus follows selection, and the panels are associated both ways (`aria-controls` / `aria-labelledby`). The keydown handler rides each tab rather than the tablist, which would want a `tabindex` of its own.

### 8.2 Affordances & structure

- **Focus reveals what hover reveals:** focusing anything in a panel fades in that panel's ghost adds; focusing an item reveals its ×. Revealed controls are real buttons in the tab order, placed right after the thing they act on.
- **Delete** removes the focused chip/lane (acts on the focused item container, never inside text editing).
- **Reorder** is stateless modifier+arrows: Alt+←/→ moves a chip within its lane; Alt+↑/↓ moves a lane. Each press is one commit; undo covers regret. No grab mode.

### 8.3 Popovers

The rendered value is a button (Enter/Space opens). Pick-one pickers are **listboxes** — arrows move, type-ahead jumps, Enter picks-and-closes, Esc closes unchanged. The trait checklist is a **checkbox group** — Space toggles (each toggle one commit), stays open until Esc/blur. **custom…** is the last option on the open vocabularies; Enter moves focus into its text input, Enter commits, Esc backs out to the list.

**Chrome menus** (Export, Examples) share one grammar: the control is a button with `aria-haspopup="menu"`; the dropdown is `role="menu"` with `menuitem` buttons in the tab flow; Esc closes and returns focus to the control; focus-out and click-outside close.

### 8.4 Focus visibility & motion

Non-text targets get a 2px ink-colored ring with small offset on `:focus-visible` only; contenteditable fields get the same ring when focused via keyboard (hairline outline + caret for pointer-initiated editing). All animation (fades, undo highlight-flash, scroll-to-target) honors `prefers-reduced-motion` by swapping animation for instant state change.

### 8.5 Assistive-tech semantics

- Every free-text field is `role="textbox"` (`aria-multiline` for prose); its accessible name is the field's **identity** ("Name", "Purpose", "Term"), never its content. Placeholder questions ride along as `aria-placeholder`/description.
- The lane pick-slots are named "Collaborator kind for ‹name›", "Their relationship for ‹name›", "Our relationship for ‹name›" — always "relationship", never "role", which belongs to Domain Roles and would teach the wrong thing two inches from that panel.
- Repeating structures are native lists (lanes are lists of messages; sections are lists of lanes; traits a list of chips). Accessible names lead with the type where color/glyph carries meaning: "Command, Place Order".
- **One polite live region**; announces only structural commits and non-local effects (strings in §10), including the multi-tab notice when it appears, **and a refused explicit commit — the JSON View's failed Apply, which announces its lead sentence in full because it is the one announcement not confirming something the user can see.** Field-blur commits announce nothing. No assertive interruptions.

### 8.6 Artifact AA, concretely

Real text throughout; heading hierarchy (canvas name h1, sections h2, collaborators h3); document language tag; AA contrast verified against the actual quiet-sheet tokens at build time — cream paper, ink-on-pastel EventStorming fills, and the pink collaborator underline are the at-risk pairs, and **tokens shift if a pair fails** (editor and artifact together; AA outranks palette attachment). Glyphs + text carry every color-coded meaning; 200% zoom reflows via the single-breakpoint stack.

**The View tabs** are interactive elements inside that commitment (§9.1). Measured on the shipped tokens: unselected label 7.4:1, selected label and the inverted focus ring 16.5:1, panel mono text 16.5:1, the script-less panel labels 6.1:1. The selected View is carried by an ink **fill** and not by colour alone, and the strip's own boundary is §5's `--color-line` — the same hairline every panel on the sheet is drawn with, which is why the state that matters rides the fill instead. The panel labels are paragraphs rather than headings: a real heading above the Sheet's own h1 would invert the hierarchy this section promises, so the stacked panels are labelled **regions** instead and stay navigable without script. At 200% zoom both text panels wrap inside the stack and neither adds horizontal scroll.

## 9. Artifact production

Full decision record: `wayfinder/tickets/007-artifact-design.md`.

**Render source.** One shared read-only `CanvasSheet` Svelte component is the canonical visual truth, compiled two ways from the one source: a **headless server compile** (`src/lib/render/`, built into a committed module — full decision record `wayfinder/tickets/050-renderer-shape.md`) that draws the sheet in plain Node with no browser, and the live **client mount** in a hidden container that the PNG rasterizes. The HTML artifact is one container over the headless renderer, which is what makes the sheet an editor exports and the sheet `bcc render` writes one function called twice rather than two outputs a test compares. Editor and artifacts can never drift visually; the artifacts are pixel-identical. Never serialize the live editor DOM — affordances, contenteditable spans and placeholders must not leak in.

**Shared content rules.** Every artifact carries the footer legend + attribution (inside the PNG capture region, so the credit is in the pixels). Empty sections render as their sheet with the section label and an empty body — no hints, no placeholders.

### 9.1 HTML artifact (`.bcc.html`)

- **Re-importable:** the Canvas file JSON is embedded in the document (Excalidraw-style script block), **byte-identical** to the `.bcc.json` export. The importer accepts both extensions through one path: same version check and migrations, same refusal of newer versions, same confirmation gate, same history clearing. A missing/corrupt embedded block is refused like any invalid Canvas file.
- **CSS:** the renderer's own, in one `<style>`: the sheet's scoped CSS, the §5 tokens and the paper ground lifted out of `app.css` at build time and scoped to the renderer's wrapper class rather than `:root`. The app's compiled Tailwind stylesheet is not inlined and nothing is fetched — an artifact used to carry Tailwind's preflight, every utility and the scoped CSS of Chrome, EditableSheet, Picker and JsonView in order to draw a read-only sheet.
- **Fonts:** only the used weights of the three families, latin subset, as base64 WOFF2 data URIs, authored from the files on disk — never fontsource's `src:` list, which names a legacy `.woff` beside every `.woff2` and doubled the payload (~225 KB artifact; per-document glyph subsetting is a noted future optimization).
- **Credit:** an HTML comment near the top crediting ddd-crew with the CC BY 4.0 license URL.
- **All three Views, pre-rendered:** the artifact carries the Sheet, the JSON and the Markdown (§6), read-only, each written into the file at export time — the Sheet from the headless renderer, the JSON from the same bytes the embedded block already holds, the Markdown from the one renderer (`src/lib/model/digest.ts`). No renderer ships into an artifact: that would put the digest inside every shared document and make a file depend on script to show its own content.
- **One script, progressive enhancement only.** The artifact's first and only behavioural JavaScript: a few inline lines that add the `role="tablist"` semantics (§8.3's roving tabindex, arrows select), hide the two inactive panels, and reveal the tab strip. Everything it does is subtractive, so the no-JS state is the honest default rather than a fallback — **all three panels are in the DOM and visible**, stacked in reading order with a label naming each, and the strip ships `hidden` so a script-less viewer is never shown a dead control. Not CSS-only (the checkbox hack has no accessible tab semantics) and not shipped renderers. The strip carries no wrapper: a bar around it would keep its own gap once the strip inside went hidden.
- **The switcher, artifact side:** §5's segmented pill, with one deliberate divergence — it rests **filled sheet** rather than unfilled. The editor's unfilled rest softens its resemblance to the chrome band; an artifact has no chrome band, so that softening buys nothing here and costs something real: on bare paper the drafting grid runs through the control and its lines compete with the segment dividers. Hover darkens to paper, the chrome button's own direction. Labels and the inset/inverted focus ring are §5's, unchanged.
- **Responsive pass:** below a single breakpoint the 12-column grid stacks to one column in reading order (title block → purpose → classification → roles → inbound → the centre box with ubiquitous language then business decisions → outbound → assumptions/metrics/questions), sections full-width; typography and palette unchanged. No miniature, no horizontal scroll. The two text panels wrap rather than scroll — nothing in an artifact is edited, so a long line is something to read, and a pane that scrolled sideways would be the horizontal scroll this rules out.
- **Print pass:** minimal `@media print` with clean section breaks — printing the artifact is the PDF answer. It prints **the Sheet alone**, whichever View is on screen: a printed JSON dump is nobody's PDF. The script hides inactive panels with the artifact's own class and not the `hidden` attribute, so the print rule outranks it on specificity with no `!important` anywhere in the file. That started as a workaround — the artifact then inlined Tailwind's preflight, which hides `[hidden]` with an `!important` inside `@layer base`, and cascade layers reverse for important declarations, so nothing unlayered could raise the Sheet back up. The stylesheet went with the headless renderer and the hazard with it; the class stays because it is the simpler mechanism, not because it is the only one left.
- **Size:** the two text panels are ~12KB against a font-dominated ~225KB file.
- Delivered as a Blob download.

### 9.2 PNG artifact (`.bcc.png`)

- **SnapDOM** (`@zumer/snapdom`) alone at v1. Fallback order documented as contingency, not shipped: modern-screenshot → html-to-image → html2canvas-pro.
- Region: the offscreen artifact render from title block through footer, on its cream paper ground with a fixed margin, at the fixed ~1440px desktop layout width regardless of window size. App chrome never appears.
- `scale: 2`, clamped only if iOS canvas pixel limits force it.

### 9.3 SVG artifact (`.bcc.svg`)

The sheet as one self-contained image a markdown file can point an `<img>` at — which is what a canvas committed in a repo needs, because no markdown host outside this project's own adapters draws a `bcc` fence: GitHub's renderer takes no plugins and its sanitizer drops inline `<svg>` whole, so a committed image is not a compromise reached after trying — it is the only surface that exists there. Full decision record: `wayfinder/tickets/049-github-svg-probe.md`, `wayfinder/tickets/056-committed-images.md`.

- **The same HTML, wrapped.** A `foreignObject` carrying the markup the headless renderer already emits — not a second emitter drawing native `<text>`, which would be exactly the visual drift §9 exists to rule out.
- **Fixed size, and the frame is not optional.** The sheet lays out in the §9.2 page frame at the fixed ~1440px width, cream ground to the edge. The image declares its height, and a `foreignObject` clips rather than growing, so the height and the frame together are the contract.
- **A browser measures; Node reproduces.** Nothing headless can measure a height. The editor has one for free (`getBoundingClientRect` on the offscreen mount) and `bcc render --svg` drives an already-installed Chrome for it, with `--height` as the escape hatch. Everything after that — including the check below — runs in plain Node.
- **Staleness is a re-render and a byte diff.** `bcc check` parses the height out of the committed file, re-renders at it, and compares the bytes; an absent image is silent, and a file whose height cannot be read is a refusal in its own right rather than "stale". The declared height is only ever used to *reproduce*, never trusted: clipping arises from content growth, and content growth fails the diff first. This is the property that keeps SVG ahead of PNG for a committed image — a PNG's check could never be anything but a rasterization.
- **Fonts are embedded, and everything else is refused.** Drawn through `<img>` a browser sandboxes the document: no network, no scripts, and every `data:` URI route to an image (`background-image`, `<img>`, `content:`) renders nothing. Base64 WOFF2 `@font-face` rules are the one external-resource route that works, which is why the file is ~200 KB. In a repo that cost is largely recovered by delta compression — the font payload is byte-identical across canvases.
- **`xmlns` is load-bearing twice.** The root's stays on `http:`, or github.com's blob view re-serializes the file. And every `<svg>` inside the `foreignObject` declares its own: the content there is XHTML, so an undeclared `<svg>` inherits XHTML and is not a drawing — the collaborator-kind glyphs and the footer legend keys silently vanish. `render.test.ts` guards both, because nothing on screen ever shows what either attribute is for.
- **XHTML-shaped, or it does not draw at all.** An SVG must be well-formed XML. Svelte's server output satisfies this by construction rather than by promise, so one unclosed void element in the sheet would stop every committed image rendering, silently, everywhere. The serializer escapes markup but never the raw text inside `<style>`, so a literal `<` in the sheet's CSS — a comment is all it takes — is legal HTML and fatal XML: the artifact keeps working while every committed image turns into a broken-image icon. `render.test.ts` guards both.
- **No positioned boxes, no stacking contexts.** Displayed below its natural size — a README column is exactly that — WebKit's SVG-as-image path paints any self-painting layer inside the `foreignObject` **unscaled**: `position: relative/absolute`, `opacity` below 1, and CSS transforms all qualify, and each blanked part of the sheet on github.com in Safari before it was removed (`wayfinder/tickets/063-webkit-svg-stacks.md`, minimal repro included). So the sheet's CSS creates none of these: the stack markers are inline `<svg>` with the hotspot tilt as an SVG-internal rotate, and the masthead eyebrow dims by `color-mix`, never by opacity. `sr-only` keeps its `position: absolute` — it paints nothing wherever it lands.
- **Credit:** the same ddd-crew CC BY 4.0 comment `.bcc.html` carries, above the root element, plus the attribution line in the sheet's own footer.
- **One-way.** Import… never takes it: an image carries no Canvas file, so like PNG it leaves Unexported changes standing (§6.1).
- **Opened directly, the fonts are blocked, and this is not a bug.** A raw file URL is a top-level document under `default-src 'none'`, which forbids the `data:` font loads; the sheet falls back to system faces and reflows. Through an `<img>` — the way it is meant to be used, and the way a README draws it — they load.

## 10. UI copy — final strings

Canonical home: `wayfinder/tickets/011-ui-copy.md`. Register: calm and documentary, matching the quiet sheet.

**App name: BC Canvas.** Title bar: `<canvas name> — BC Canvas`; unnamed: `Untitled — BC Canvas`.

**Chrome controls** (file verbs are Import/Export, never Open/Save):
- **Import…** — one control, accepts `.bcc.json` and `.bcc.html`.
- **Examples** menu, right after Import… — an example is an import sourced from the app (§3.5). Two-line entries, name over one-liner:
  - **Order Fulfillment** — *Coordinates picking, packing and shipping once an order is paid.*
  - **Notifications** — *Delivers order updates to customers on their preferred channel.*
  - **Appointment Scheduling** — *Books patients into clinic slots and keeps no-shows down.*
  - **Royalty Distribution** — *Splits streaming revenue among rights holders. Captured mid-workshop.* (the trailing flag marks the deliberately half-finished canvas)
- **Export** menu: **Canvas file (.bcc.json)** · **HTML artifact (.bcc.html)** · **PNG image (2x)** · **SVG image** · **Markdown (.bcc.md)**. Markdown is last, beside the two images rather than beside the Canvas file: the first two leave in a form Import… takes back and the last three don't, and this menu is the only place a reader sees them all together. **SVG image** takes the shape of the entry above it and drops the parenthesis: PNG's `(2x)` is a fact a reader cannot see anywhere else, and there is no equivalent fact here — an SVG has no scale, and `(.bcc.svg)` would only repeat the word beside it. The entry names the format and nothing else — the format's own name, the same word the View's tab carries, promises no round trip; a noun of its own ("summary", "rendering") would either be untrue or explain the design.
- **New canvas**.
- Undo/Redo with shortcut in tooltip: `Undo (⌘Z)` / `Redo (⇧⌘Z)`.
- **Reference** at the far end of the chrome, tooltip `Reference (⌘/)` (§12).

**Unexported-changes indicator:** dirty state shows the two words **Unexported changes**, small, near the Export control. Clean state shows nothing.

**Confirmation dialogs** (two buttons only; unnamed canvas substitutes "this canvas" for the name):

> **Replace "Order Fulfillment"?**
> Its latest changes haven't been exported. Importing replaces the canvas and clears undo history.
> [ Cancel ] [ **Replace** ]

> **Start a new canvas?**
> "Order Fulfillment" has changes that haven't been exported. Starting fresh discards them and clears undo history.
> [ Cancel ] [ **Start new** ]

> **Replace "Order Fulfillment"?**
> Its latest changes haven't been exported. Opening an example replaces the canvas and clears undo history.
> [ Cancel ] [ **Replace** ]

**File-refusal notices:**

> **This file is from a newer version of BC Canvas.**
> It was exported with format version 3; this app reads up to version 2. The file hasn't been touched. Reload the page to pick up the latest app, then import again.

> **This file couldn't be read as a Canvas file.**
> It isn't a Canvas file export, or it's been modified. Nothing was imported.

**The View switcher and the two text Views** (§5, §6):

- Tabs **Sheet** · **JSON** · **Markdown**, the strip named `Views`. `Canvas` is ruled out (it is the document) and `Digest` is ruled out (MCP jargon, `CONTEXT.md`); `Canvas file` was the live alternative for the middle tab and is ruled out too — it is the Export menu's name for a *download*, and a tab names what you are looking at, not a file it hands you. While the buffer disagrees with the canvas the JSON tab carries a hotspot-pink dot and a visually-hidden **, unapplied changes** on its accessible name.
- **JSON View.** The box is named `Canvas file JSON`; beneath it the line **This is the Canvas file, exactly as Export writes it.** and the controls **Copy** and **Apply**. Apply stays a bare verb, matching the chrome's Import/Export register; the weight of a whole-document replacement is carried by the line above it, which only parses if the button says Apply:

  > The canvas has changed since you started editing this text. Applying replaces it.

  It appears only while the canvas has moved since the proposal was written, and blocks nothing. "Editing" rather than "typing" because a paste is the commoner way text arrives here.
- **Markdown View.** One line beneath the source, carrying the gotcha and the one remedy that matters: **Markdown is a one-way rendering — it can't be imported back. Export the Canvas file to keep your work.** One control, **Copy**.

**JSON View notices** — the same refusals one surface further in, where the detail §3.3 withholds from the dialog above is the point. Inline `role="note"` beneath the textarea, above **Apply**, in the multi-tab notice's box; held on the buffer, so it survives a view switch and is cleared by the next keystroke or the next Apply. The bold lead is the app's; the mono second line is the parser's `detail` verbatim.

> **This text couldn't be read as a Canvas file.**
> `inboundCommunication[1].messages[0].type: expected one of "command", "query", "event", got "notification".`

> **This text is from a newer version of BC Canvas.**
> It was exported with format version 3; this app reads up to version 2. Copy this text, reload the page to pick up the latest app, then paste it back.

Both classes of `not-canvas` — malformed JSON and wrong shape — share the one lead; the detail line is what distinguishes them, and inventing two leads would assert a difference the parser doesn't make. The newer-version notice drops the dialog's "The file hasn't been touched" (there is no file) and leads its remedy with **Copy this text**, because a reload discards the buffer. No "nothing was applied" line: the notice only exists on failure, the tab marker is still on, and the box still holds the text.

**Multi-tab notice** (persistent, both tabs):

> **This canvas is open in another tab.** Whichever tab edits last overwrites the other — close one of them.

**Footer legend + attribution** (on the sheet, inside the PNG capture region): lowercase mono labels on one line — the six swatches `command · query · event · decision · collaborator · open question`, the four kind icons `bounded context · external system · frontend · direct user interaction`, and the relationship-pair key `theirs → ours` (theirs in ink-soft, ours in full ink at 500, sr-prefixed "relationship: ") — with the attribution line **"Based on the Bounded Context Canvas by the ddd-crew · CC BY 4.0"**, linked to the ddd-crew repo and license in the editor and HTML artifact, plain text in the PNG.

**Placeholder questions (final):**

| Surface | Copy |
|---|---|
| Name | *Name this context* |
| Purpose | *What does this context exist to do? A few sentences in business language.* |
| Classification values | — (em dash until picked; teaching lives in the picker) |
| Domain roles ghost | *+ trait — how does this context behave?* |
| Inbound ghost | *+ collaborator — who sends this context commands, queries or events?* |
| Outbound ghost | *+ collaborator — who consumes what this context emits?* |
| Ubiquitous language ghost | *+ term — which words mean something precise here?* |
| Term definition field | *What it means here* |
| Business decisions ghost | *+ decision — which rules does this context enforce?* |
| Assumptions ghost | *+ assumption — what are you taking to be true?* |
| Verification metrics ghost | *+ metric — what would verify this design?* |
| Open questions ghost | *+ question — what's still unresolved?* |

Terse row-field placeholders once a section has content: `Collaborator`, `Message name`, `Term`, `Rule`, `detail`, `…`.

**Popover microcopy:** escape hatch **custom…** (lowercase, ellipsis signals it opens a field; absent from the closed kind picker); clear/unset entry **— none —** in the classification pickers, **— no kind —** in the kind picker, **— no relationship —** in each relationship picker. No hint lines in any picker — the descriptions are the teaching.

**Live-region announcements** (terse, type-led): `Collaborator removed` · `Trait added` · `Moved up` / `Moved down` · `Undone: <section name>` / `Redone: <section name>` · `Canvas imported` · `New canvas` · `Example opened` · `Canvas replaced` · `Canvas replaced, migrated from format version 1` · `JSON copied` / `Markdown copied`.

The two Apply announcements: a successful Apply says `Canvas replaced`, and one that migrated on the way in says so, because the bytes in the box change under the user. Nothing visible marks the migration — `version` is the first key `serialize.ts` writes, so a v1 paste comes back showing `"version": 2` on line 2. An Apply pressed while the box already follows the canvas commits nothing and announces nothing. A **failed** Apply announces its lead sentence in full (§8.5) — the one full sentence in this list, and the only announcement carrying information that isn't confirming something visible.

## 11. License & attribution

The Bounded Context Canvas is by the [ddd-crew](https://github.com/ddd-crew/bounded-context-canvas), licensed CC BY 4.0. Attribution appears: in the app's sheet footer; in both artifacts' rendered footer (inside the PNG pixels); and as an HTML comment in the `.bcc.html` source. Links go to the ddd-crew repo and the license.

## 12. The Reference dialog

Canonical home: `wayfinder/tickets/012-reference-material.md`. The app's single consult-and-dismiss teaching surface — everything else teaches at point of use.

- **Entry:** the **Reference** chrome control (tooltip `Reference (⌘/)`), or **⌘/** (Ctrl+/ on Windows/Linux; modifier renders per platform).
- **Form:** modal dialog; Esc closes; focus returns to the invoking control.
- **Coverage:** the keyboard grammar plus one method link-out. No method primer, no trait/relationship glossary (those teach in their pickers), nothing in the HTML artifact beyond legend + attribution — explicitly no `title` tooltips or footnotes on relationship values in the artifact (pointer-only and print-invisible; they'd fail the artifact's AA bar).

**Dialog contents (final strings)** — title **Reference**, four clusters, then the link line:

**Editing**
| Keys | Action |
|---|---|
| Enter | Commit a single-line field |
| Esc | Revert the field being edited |
| Tab / click away | Commit and move on |

**Structure**
| Keys | Action |
|---|---|
| Delete | Remove the focused chip or lane |
| Alt+← / Alt+→ | Move a chip within its lane |
| Alt+↑ / Alt+↓ | Move a lane up or down |

**Pickers**
| Keys | Action |
|---|---|
| Enter / Space | Open the picker on a value |
| ↑ ↓ | Move through options — or type to jump |
| Space | Toggle a trait |
| Enter | Pick and close |
| Esc | Close without changing |

**App**
| Keys | Action |
|---|---|
| ⌘Z / ⇧⌘Z | Undo / Redo |
| ⌘/ | Open this reference |

Link line: **Learn the method: the ddd-crew's Bounded Context Canvas** → `github.com/ddd-crew/bounded-context-canvas`.

## 13. Build risks & first checkpoints

1. **Safari/iOS PNG capture** (foreignObject flakiness is the dominant known risk): verifying SnapDOM capture on Safari/iOS is the **first implementation checkpoint**. Contingency order if it fails: modern-screenshot → html-to-image → html2canvas-pro. iOS canvas pixel limits may force clamping the 2x scale.
2. **AA contrast of the quiet-sheet tokens**: verify the at-risk pairs (cream paper, ink-on-pastel fills, pink collaborator underline) at build time; shift tokens if a pair fails (§8.4).
3. **Tailwind CSS inlining** — **retired** (`wayfinder/tickets/054-headless-renderer.md`). The risk was which of two ways to get the compiled stylesheet into an artifact; the headless renderer needs neither, because it authors the sheet's CSS itself from `app.css`'s `@theme` block at build time. The runtime same-origin `fetch` this defaulted to is gone, and with it the export's only dependency on being served.
4. **Hover-affordance discoverability and stray-click carets**: accepted risks of the modeless model; soften in build (timing, hit areas), don't change the model.

## 14. Research & prototype provenance

- Research notes: `docs/research/contexture-schema.md` (branch `research/contexture-schema`), `docs/research/export-techniques.md` (branch `research/export-techniques`).
- Prototypes (all variants + reasoning on their branches): visual language `prototype/canvas-visual-language` (winner `6-quiet-sheet/`), inline editing `prototype/inline-editing` (winner `1-live-sheet/`), empty state `prototype/empty-state` (winner `1-placeholder-questions/`), example chooser `prototype/example-chooser` (winner variant 1, the Examples menu).
- Decision detail: `wayfinder/tickets/*.md`; glossary: `CONTEXT.md`.
