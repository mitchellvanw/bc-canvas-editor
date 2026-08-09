# BC Canvas — Specification

A client-side WYSIWYG editor for the [ddd-crew Bounded Context Canvas](https://github.com/ddd-crew/bounded-context-canvas) (V5 canonical layout). Single canvas at a time, like a document editor. Edits happen inline on the rendered sheet; the durable format is a versioned JSON **Canvas file**; sharing happens through exported **Artifacts** (self-contained HTML, 2x PNG).

This spec compiles the decisions of the wayfinder map (`wayfinder/map.md`); each ticket under `wayfinder/tickets/` holds the full reasoning behind its section. The glossary in `CONTEXT.md` is normative for the terms used below.

---

## 1. Scope

**In scope (v1):**

- WYSIWYG inline editing of one Bounded Context Canvas, V5 canonical layout.
- Import/export of the versioned Canvas file (`.bcc.json`).
- Export of a self-contained, re-importable HTML artifact (`.bcc.html`) and a 2x PNG (`.bcc.png`).
- Autosave to localStorage as a safety net; single linear undo/redo.
- Full keyboard operability of the editor; WCAG AA for the HTML artifact.
- Four bundled example canvases, opened from the chrome through the import path (§3.5, §10).

**Out of scope (v1):**

- Backend, auth, real-time collaboration, team libraries — sharing happens via exported files/artifacts.
- Multi-canvas library and context-map relationships between canvases — single-document editor only.
- Use Case Swimlanes layout variant — V5 canonical only.
- PDF export — browsers print the HTML artifact fine (it carries a print pass).
- Importing foreign formats (Contexture, Excalidraw, Miro) — own Canvas file schema only.
- Mobile/tablet editing — desktop-first; only the read-only HTML artifact is responsive.

## 2. Stack & deployment

- **SvelteKit** (TypeScript) + **Tailwind CSS v4**, `adapter-static`, deployed to **Cloudflare Pages**. Strictly client-side; no server code.
- Fonts self-hosted same-origin: **Archivo** (structure/labels), **Source Serif 4** (user prose), **IBM Plex Mono** (identifiers) — latin subsets, WOFF2.
- PNG capture: **`@zumer/snapdom`** (see §9).
- License: the canvas is CC BY 4.0 — ddd-crew attribution appears in the app footer and in every artifact (see §10, §11).

## 3. The Canvas file schema

The Canvas file is the portable, re-importable serialization: flat camelCase JSON, integer root `version`, then the eleven V5 sections in canonical order. Full decision record: `wayfinder/tickets/003-canvas-file-schema.md`.

### 3.1 Reference example

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
    { "name": "execution context" }
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

### 3.2 Shape rules

- **Sections:** `name` and `description` are strings; `strategicClassification` is an object of three optional axes; `domainRoles` are `{ name }` rows — no per-role description (sign-off amendment to the schema decision: the trait one-liners are app-side teaching text, never file content, and no approved interaction writes a per-role description); `businessDecisions` are `{ name, description? }` rows; `ubiquitousLanguage` is `{ term, definition? }` rows; `inboundCommunication`/`outboundCommunication` are lists of lanes; `assumptions`, `verificationMetrics`, `openQuestions` are plain string arrays (one-liner stickies).
- **Lane:** `{ collaborator, relationship?, messages }`. `collaborator` is a plain name string — no `kind` field. `relationship` is a single optional escape-hatched string (context-mapping pattern); it only applies when the collaborator is another bounded context, but nothing enforces that — the distinction stays glossary prose.
- **Message row:** `{ type, name, description? }`; `type` is a genuinely **closed** enum `command | query | event` — no escape hatch (it carries the Event Storming color semantics).
- **Escape hatch = single string field.** Curated values are canonical well-known strings; any other string is a custom value the UI renders as-is. No tagged unions. Unknown values round-trip by construction.
- **No row ids** — the file is pure content; runtime keys are ephemeral (§6.1). No metadata envelope: no timestamps, no generator string.
- **Presence:** all eleven section keys always present (empty arrays/strings, never missing). Optional fields (`description`, `definition`, `relationship`, unset classification axes) are omitted entirely, never `null`.
- **Deterministic serialization:** 2-space indent, fixed key order — an unchanged canvas serializes byte-identically.

### 3.3 Versioning & migration

- Integer root `version` (currently `1`); ordered raw-JSON migrations applied on load.
- Files with a version **newer** than the app knows are **refused** with a clear message (§10) and never mutated — no best-effort parsing.
- A missing/unparsable structure is refused as "not a Canvas file" (§10).

### 3.4 File naming

Slugified context name as stem, family-signaling extensions: `<slug>.bcc.json` / `<slug>.bcc.html` / `<slug>.bcc.png` (e.g. `order-fulfillment.bcc.json`). Unnamed canvas falls back to `bounded-context-canvas`. No date stamps.

### 3.5 Bundled examples

Four curated example canvases — Order Fulfillment (core, every section filled), Notifications (generic, receiving Order Fulfillment's `Order Shipped` event), Appointment Scheduling (supporting), Royalty Distribution (deliberately mid-workshop, classification unset) — chosen and authored via `wayfinder/tickets/020-example-roster.md` / `022-author-examples.md`. All invented domains; no derivation beyond the standing ddd-crew attribution (§11).

- The committed `examples/*.bcc.json` files are the **single source**: serializer-canonical bytes plus a trailing newline, bundled into the app as raw text and linked from the README as plain downloads. Nothing is duplicated in `src/`.
- Opening one goes through the **same parse path as any import** — version check and migrations included — so a schema bump reaches the examples through its migration; a pinning test (`src/lib/chrome/examples.test.ts`) holds every file byte-exact through that path at the current version.
- The chooser itself is chrome (§10); its entry one-liners are app copy, never file content.

## 4. Curated vocabularies

All picker-plus-escape-hatch: the picker offers the canonical strings below; **custom…** accepts any string, which renders identically to curated values and round-trips through the serializer.

### 4.1 Strategic classification (kebab-case axis values)

| Axis | Values |
|---|---|
| `domain` | `core` · `supporting` · `generic` |
| `businessModel` | `revenue` · `engagement` · `compliance` · `cost-reduction` |
| `evolution` | `genesis` · `custom-built` · `product` · `commodity` |

Each axis picker additionally offers **— none —** (clears the axis back to unset, rendering "—") and **custom…**.

### 4.2 Domain-role traits (the 15)

File values are natural lowercase prose (`"execution context"`), not slugs. Displayed sentence-case in the picker with these one-line descriptions (approved in the inline-editing prototype):

| Trait | Description |
|---|---|
| specification model | Encodes the detailed rules of a critical business calculation. |
| execution context | Carries out a business workflow from trigger to outcome. |
| audit model | Records what happened for traceability and compliance. |
| approver | Decides whether a requested action may proceed. |
| enforcer | Makes other contexts comply with a policy or standard. |
| octopus coordinator | Orchestrates several contexts to fulfil one process. |
| interchange context | Translates between two models so neither has to bend. |
| gateway context | Fronts an external system or protocol for the rest of the system. |
| service context | Offers a capability other contexts consume on demand. |
| analysis context | Derives insight from data other contexts produce. |
| engagement context | Drives user interaction and experience. |
| funnel context | Condenses input from many sources into one stream. |
| draft context | A model still being explored; expect churn. |
| brain context | Concentrates the cleverest, most valuable logic. |
| autonomous bubble | Deliberately isolated from legacy models so it can evolve freely. |

### 4.3 Relationship patterns (kebab-case)

Taught in the picker via these one-liners (no separate reference section — see §12):

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

The relationship picker additionally offers **— no relationship —** (clears the field) and **custom…**; neither carries a description.

## 5. Visual language — the quiet sheet

Winner of three prototype rounds; primary source `prototype/canvas-visual-language/6-quiet-sheet/` on branch `prototype/canvas-visual-language`.

- **Ground:** warm cream paper `#EAE7DE` with a faint 32px drafting grid; sections as near-white sheets `#FDFDFB`, 1px `#D8D4C8` border, 5px radius, whisper of shadow. V5 canonical layout on a 12-column grid: description/classification/roles top; inbound left; ubiquitous language + business decisions center; outbound right; assumptions/metrics/open questions bottom.
- **Title block:** near-black ink block (`#1A1E20`, 6px radius) with spaced-caps eyebrow "Bounded Context Canvas · V5", the context name in Archivo 700, and strategic classification as three label + mono-value pairs inside the block.
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
- **Collaborators:** name in collaborator-pink ink with a pink underline — no sticky box; relationship as quiet right-aligned mono text.
- **Section labels:** small-caps Archivo with a short 2px underline in the section's hue (neutral gray where no hue applies).
- **Terms:** highlighter stroke under the mono term. **Decisions/questions:** small colored square markers (policy lilac; hotspot pink, rotated).
- **Footer** (on the sheet, inside the PNG capture region): one-line swatch legend + attribution (§10 has the exact strings).
- No teaching hints on a filled canvas — teaching lives in the empty state (§7) and pickers.

## 6. Interaction model — the live sheet

Winner of the inline-editing prototype; primary source `prototype/inline-editing/1-live-sheet/` on branch `prototype/inline-editing`.

- **Modeless.** No edit mode, no per-section forms — the canvas is a document. Every free-text value is contenteditable (plaintext) in place, always. Blur commits; Enter commits single-line fields; Esc reverts the field.
- **Affordances materialize on approach.** The presentation view carries zero editing chrome. Hovering a panel fades in its ghost adds; hovering an item reveals its ×; hovering a lane reveals its ⠿ drag grip. Editable text shows a faint halo on hover, a hairline outline on focus. (Focus reveals the same affordances — §8.2.)
- **Curated vocabularies are popovers on the value itself.** Classification and relationship values are clickable where they render → popover with the curated list, ✓ on the current value, **custom…** input as escape hatch; classification axes offer **— none —** (clears the axis back to unset), relationship offers **— no relationship —**. Custom values render identically to curated ones.
- **Domain roles:** ghost "+ trait" chip → multi-select popover checklist of the 15 traits with inline one-line descriptions, plus a custom-trait input; chips removed via hover ×. The prototype's "Why these roles?" free-text note is **dropped** (ui-copy decision) — domain roles are chips only; do not rebuild that field even though it appears in the primary-source prototype.
- **Messages:** ghost "+" per lane → mini type popover (▶ command / ? query / ◆ event), then the new chip's name field is focused for immediate typing. Chips drag-reorder within their lane; lanes drag-reorder by grip; lane × removes the collaborator.
- **Commit granularity:** one field blur = one commit; one structural action (add / remove / reorder / pick) = one commit. Commits are the unit of undo and autosave (§6.1).
- **Known accepted risks** (soften in build, don't change the model): discoverability of hover-only affordances, stray-click carets in prose.

### 6.1 Document state, undo/redo & autosave

Full decision record: `wayfinder/tickets/006-state-undo-autosave.md`.

**Runtime document.** Exactly the Canvas file shape, with an ephemeral `id` stamped onto each row/lane object on load/creation for keyed rendering and drag-reorder. Serialization strips ids and applies fixed key order — ids never reach the file. One model, one serializer; no normalized store.

**Undo/redo.**
- Single linear history of **full-document snapshots**, one per commit; undo/redo swaps the document. Uncapped within the session; session-scoped (cleared on import/new, not persisted across reloads).
- **Cmd+Z intercepted globally.** If the focused field has uncommitted edits, Cmd+Z reverts the field (synonym of Esc); otherwise it pops app history. Native contenteditable undo is never in play.
- Undo/redo **scrolls the affected region into view with a brief highlight** but never moves focus.

**Autosave.**
- Serialize and write the Canvas file JSON to localStorage on **every commit** (no debounce); a `beforeunload`/`visibilitychange` flush commits any mid-edit field first.
- Single fixed key `bcc.autosave`; history is not persisted. On app load: restore the slot if present, else a blank canvas.
- **Multi-tab:** last write wins, softened by a persistent notice in both tabs (via the `storage` event) — no locking. Wording in §10.

**Unexported changes (the dirty state).** The Canvas has changed since it last left the browser in a re-importable form. Cleared by Canvas-file export/import **and HTML-artifact export/import**; never by PNG export. Drives the quiet indicator (§10) and the confirmation gate:
- **Import, New, or opening an example over unexported changes:** confirmation dialog first (§10); on proceed the document is replaced and history cleared — a session boundary, not an undoable edit. With nothing unexported, import/new/example proceeds without ceremony.
- **An opened example lands clean:** its bytes exist as a published re-importable file (§3.5), so nothing is unexported until the first edit dirties as usual.

## 7. Empty state & teaching

Winner of the empty-state prototype; primary source `prototype/empty-state/1-placeholder-questions/` on branch `prototype/empty-state`.

- **No hint layer, no seeding, no welcome/tour.** A brand-new canvas is the ordinary quiet sheet with everything empty; the form itself teaches.
- **Empty free-text fields** carry the section's ddd-crew helper question as their italic placeholder; **empty-section ghost adds** carry the question too. Final copy in §10.
- **Ghost adds are always visible on an empty section**, hover/focus-materialized once the section has content (amendment to the live-sheet hover rule).
- **Disappearance is instant and granular:** typing replaces a placeholder; the first item shortens the ghost to its terse label. Both return automatically whenever a field or section is emptied — state-driven, no first-run flag.
- **Title block:** name placeholder "Name this context"; classification values render "—" until picked; classification teaching stays in the pickers.

## 8. Keyboard model & accessibility

Full decision record: `wayfinder/tickets/010-keyboard-a11y.md`.

**Ambition:** the editor commits to **full keyboard operability** — every pointer action has a keyboard path — with sound roles/labels/announcements, but makes **no formal WCAG claim** for v1. The **HTML artifact commits to WCAG AA**. PNG is exempt (presentation-only).

### 8.1 Tab order

One linear sequence in reading order — every editable field, chip, and pickable value is a tab stop. No grid-navigation ceremony. (A section-skip accelerator is a build-time nice-to-have, not a commitment.)

### 8.2 Affordances & structure

- **Focus reveals what hover reveals:** focusing anything in a panel fades in that panel's ghost adds; focusing an item reveals its ×. Revealed controls are real buttons in the tab order, placed right after the thing they act on.
- **Delete** removes the focused chip/lane (acts on the focused item container, never inside text editing).
- **Reorder** is stateless modifier+arrows: Alt+←/→ moves a chip within its lane; Alt+↑/↓ moves a lane. Each press is one commit; undo covers regret. No grab mode.

### 8.3 Popovers

The rendered value is a button (Enter/Space opens). Pick-one pickers are **listboxes** — arrows move, type-ahead jumps, Enter picks-and-closes, Esc closes unchanged. The 15-trait checklist is a **checkbox group** — Space toggles (each toggle one commit), stays open until Esc/blur. **custom…** is the last option; Enter moves focus into its text input, Enter commits, Esc backs out to the list.

**Chrome menus** (Export, Examples) share one grammar: the control is a button with `aria-haspopup="menu"`; the dropdown is `role="menu"` with `menuitem` buttons in the tab flow; Esc closes and returns focus to the control; focus-out and click-outside close.

### 8.4 Focus visibility & motion

Non-text targets get a 2px ink-colored ring with small offset on `:focus-visible` only; contenteditable fields get the same ring when focused via keyboard (hairline outline + caret for pointer-initiated editing). All animation (fades, undo highlight-flash, scroll-to-target) honors `prefers-reduced-motion` by swapping animation for instant state change.

### 8.5 Assistive-tech semantics

- Every free-text field is `role="textbox"` (`aria-multiline` for prose); its accessible name is the field's **identity** ("Name", "Description", "Term"), never its content. Placeholder questions ride along as `aria-placeholder`/description.
- Repeating structures are native lists (lanes are lists of messages; sections are lists of lanes; traits a list of chips). Accessible names lead with the type where color/glyph carries meaning: "Command, Place Order".
- **One polite live region**; announces only structural commits and non-local effects (strings in §10), including the multi-tab notice when it appears. Field-blur commits announce nothing. No assertive interruptions.

### 8.6 Artifact AA, concretely

Real text throughout; heading hierarchy (canvas name h1, sections h2, collaborators h3); document language tag; AA contrast verified against the actual quiet-sheet tokens at build time — cream paper, ink-on-pastel EventStorming fills, and the pink collaborator underline are the at-risk pairs, and **tokens shift if a pair fails** (editor and artifact together; AA outranks palette attachment). Glyphs + text carry every color-coded meaning; 200% zoom reflows via the single-breakpoint stack.

## 9. Artifact production

Full decision record: `wayfinder/tickets/007-artifact-design.md`.

**Render source.** One shared read-only `CanvasSheet` Svelte component is the canonical visual truth. At export time it mounts in a hidden container; the HTML artifact serializes that mount, the PNG captures it. Editor and artifacts can never drift visually; the two artifacts are pixel-identical. Never serialize the live editor DOM — affordances, contenteditable spans and placeholders must not leak in.

**Shared content rules.** Both artifacts carry the footer legend + attribution (inside the PNG capture region, so the credit is in the pixels). Empty sections render as their sheet with the section label and an empty body — no hints, no placeholders.

### 9.1 HTML artifact (`.bcc.html`)

- **Re-importable:** the Canvas file JSON is embedded in the document (Excalidraw-style script block), **byte-identical** to the `.bcc.json` export. The importer accepts both extensions through one path: same version check and migrations, same refusal of newer versions, same confirmation gate, same history clearing. A missing/corrupt embedded block is refused like any invalid Canvas file.
- **CSS:** the app's entire compiled Tailwind stylesheet, fetched same-origin at export time, inlined in one `<style>` (Vite `?inline` unverified — runtime fetch is the default).
- **Fonts:** only the used weights of the three families, latin subset, as base64 WOFF2 data URIs (~300–500 KB artifact — acceptable; per-document glyph subsetting is a noted future optimization).
- **Credit:** an HTML comment near the top crediting ddd-crew with the CC BY 4.0 license URL.
- **Responsive pass:** below a single breakpoint the 12-column grid stacks to one column in reading order (title block → description → classification → roles → inbound → ubiquitous language → business decisions → outbound → assumptions/metrics/questions), sections full-width; typography and palette unchanged. No miniature, no horizontal scroll.
- **Print pass:** minimal `@media print` with clean section breaks — printing the artifact is the PDF answer.
- Delivered as a Blob download.

### 9.2 PNG artifact (`.bcc.png`)

- **SnapDOM** (`@zumer/snapdom`) alone at v1. Fallback order documented as contingency, not shipped: modern-screenshot → html-to-image → html2canvas-pro.
- Region: the offscreen artifact render from title block through footer, on its cream paper ground with a fixed margin, at the fixed ~1440px desktop layout width regardless of window size. App chrome never appears.
- `scale: 2`, clamped only if iOS canvas pixel limits force it.

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
- **Export** menu: **Canvas file (.bcc.json)** · **HTML artifact (.bcc.html)** · **PNG image (2x)**.
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
> It was exported with format version 3; this app reads up to version 1. The file hasn't been touched. Reload the page to pick up the latest app, then import again.

> **This file couldn't be read as a Canvas file.**
> It isn't a Canvas file export, or it's been modified. Nothing was imported.

**Multi-tab notice** (persistent, both tabs):

> **This canvas is open in another tab.** Whichever tab edits last overwrites the other — close one of them.

**Footer legend + attribution** (on the sheet, inside the PNG capture region): swatch + lowercase mono labels on one line — `command · query · event · decision · collaborator · open question` — with the attribution line **"Based on the Bounded Context Canvas by the ddd-crew · CC BY 4.0"**, linked to the ddd-crew repo and license in the editor and HTML artifact, plain text in the PNG.

**Placeholder questions (final):**

| Surface | Copy |
|---|---|
| Name | *Name this context* |
| Description | *What does this context exist to do? A few sentences in business language.* |
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

**Popover microcopy:** escape hatch **custom…** (lowercase, ellipsis signals it opens a field); clear/unset entry **— none —** in the classification pickers, reading **— no relationship —** in the relationship picker. No hint lines in any picker — the descriptions are the teaching.

**Live-region announcements** (terse, type-led): `Collaborator removed` · `Trait added` · `Moved up` / `Moved down` · `Undone: <section name>` / `Redone: <section name>` · `Canvas imported` · `New canvas` · `Example opened`.

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
3. **Tailwind CSS inlining**: Vite `?inline` import of the compiled stylesheet is unverified — default to runtime same-origin fetch.
4. **Hover-affordance discoverability and stray-click carets**: accepted risks of the modeless model; soften in build (timing, hit areas), don't change the model.

## 14. Research & prototype provenance

- Research notes: `docs/research/contexture-schema.md` (branch `research/contexture-schema`), `docs/research/export-techniques.md` (branch `research/export-techniques`).
- Prototypes (all variants + reasoning on their branches): visual language `prototype/canvas-visual-language` (winner `6-quiet-sheet/`), inline editing `prototype/inline-editing` (winner `1-live-sheet/`), empty state `prototype/empty-state` (winner `1-placeholder-questions/`), example chooser `prototype/example-chooser` (winner variant 1, the Examples menu).
- Decision detail: `wayfinder/tickets/*.md`; glossary: `CONTEXT.md`.
