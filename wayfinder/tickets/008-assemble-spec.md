---
name: assemble-spec
title: "Task: assemble the hand-off spec"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [canvas-file-schema, inline-editing-prototype, state-undo-autosave, artifact-design, empty-state-hints, keyboard-a11y, ui-copy, reference-material]
---

## Question

The destination itself: compile every closed ticket's decision, the prototype outcomes, and the research findings into `SPEC.md` — a hand-off-ready spec for building the editor (scope, stack, canvas structure, interaction model, state/undo/autosave, Canvas file schema, artifact production, out-of-scope list). AFK draft, then user review. Resolves when the user signs off on the spec.

## Progress

- **2026-08-07 — draft ready for review:** `SPEC.md` on `main` compiles all eight blocker resolutions, the three prototype outcomes, both research findings, the final strings from [ui-copy](wayfinder/tickets/011-ui-copy.md) and [reference-material](wayfinder/tickets/012-reference-material.md), and `CONTEXT.md`. The 15-trait list (deferred here by [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md)) is pinned in SPEC §4.2 from the approved live-sheet prototype's picker vocabulary. Awaiting user sign-off.

## Resolution

**Signed off 2026-08-07.** `SPEC.md` on `main` is the hand-off spec — the map's destination.

Before sign-off, an adversarial verification pass cross-checked the draft against every closed ticket's resolution, `CONTEXT.md`, and the prototype branches. Headline: faithful compilation — all final strings verbatim, all visual tokens and the 15-trait list traced to their approved sources. Four fidelity gaps were patched:

1. §8.5 accessible-name examples restored to include "Description" (the [keyboard-a11y](wayfinder/tickets/010-keyboard-a11y.md) list, reconciled with the schema's `description` naming).
2. §6 now states explicitly that the prototype's "Why these roles?" free-text note is dropped per [ui-copy](wayfinder/tickets/011-ui-copy.md) — necessary because the primary-source prototype still contains that field.
3. §8.5 live region now covers the multi-tab notice, per [keyboard-a11y](wayfinder/tickets/010-keyboard-a11y.md).
4. §12 now carries [reference-material](wayfinder/tickets/012-reference-material.md)'s explicit prohibition of `title` tooltips/footnotes on relationship values in the artifact.

The pass also surfaced two seams no ticket had resolved; both decided with the user at sign-off:

- **Classification axes are clearable:** each axis picker gains a **— none —** entry (clears back to unset "—"). This gives the already-specified microcopy a surface — previously no picker used it — and makes the unset state the schema and empty state assume reachable after a mis-pick. (SPEC §4.1, §6, §10.)
- **`domainRoles[].description` dropped from the schema** — amendment to [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md): role rows are `{ name }` only. No approved interaction wrote or displayed a per-role description (roles are checklist-picked chips; the only roles prose field was dropped by ui-copy), and invisible data must not ride through a WYSIWYG file. The trait one-liners remain app-side teaching text. Schema version stays `1` — nothing has shipped, so no migration. (SPEC §3.1, §3.2.)

The map is complete: no open tickets, no fog, nothing left to decide before building starts.

## Amended 2026-08-11 by canonical-v5-amendments

The spec this ticket assembled is amended by [canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md), on the [canonical-v5 map](wayfinder/map-canonical-v5.md). The sign-off above stands — it promised a hand-off-ready spec with nothing left to decide before building, and it delivered one; `SPEC.md` is amended in place as each ticket behind that resolution lands, so it stays the single hand-off truth.

- **§3 (schema)** — Canvas file v2: `description` → `purpose`, collaborator becomes `{ name, kind? }`, `relationship` becomes `{ theirs?, ours? }`. See the amendment note on [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md).
- **§4.2 (the trait list)** — the 15-trait list pinned here becomes **18**, realigned against `resources/model-traits-worksheet.md` and ordered by it: three traits restored, `octopus coordinator` corrected to `octopus enforcer`, `brain context` carrying the worksheet's "(likely anti-pattern)", `service context` kept and labelled a local addition. No fixed count is claimed anywhere, because the worksheet fixes none.
- **§5 and `SPEC.md:168` (the sheet)** — strategic classification leaves the title block for a tenth panel, the centre column regains its shared box, and the lane draws both ends of the relationship. The title-block line is rewritten rather than patched.
- **§8.5 (accessible names)** — the "Description" reconciliation in fidelity gap 1 above resolves the other way now: the schema says `purpose`, so the accessible name does too, which is what [keyboard-a11y](wayfinder/tickets/010-keyboard-a11y.md) originally listed. The two new pick-slots are named "Their relationship" and "Our relationship" — never "role", which belongs to Domain Roles.
