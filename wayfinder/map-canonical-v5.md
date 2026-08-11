---
name: bc-canvas-canonical-v5-map
title: "Wayfinder map: close the gap to the canonical V5 canvas"
labels: [wayfinder:map]
---

# Wayfinder map: close the gap to the canonical V5 canvas

## Destination

BC Canvas stops overclaiming. The spec says it renders "the ddd-crew Bounded Context Canvas (V5 canonical layout)" (`SPEC.md:3`) and the sheet stamps `Bounded Context Canvas · V5` into every artifact it exports, and there are six documented ways it does not — a section under its v4 name, a section demoted to metadata, two structures canonical carries that the file format cannot round-trip, and a domain-role vocabulary that quietly diverged from the community worksheet while calling itself "The fifteen". Every one is now sourced and written down in [docs/research/canonical-canvas-v5.md](docs/research/canonical-canvas-v5.md). The map is done when each has been **decided** — adopted with a migration behind it, or refused in writing with the reasoning kept — and the claim on the tin is true of the thing in the box. Its gate: a v1 canvas migrates to v2 and round-trips byte-identically through both the app and the MCP server, the four bundled examples re-pin byte-exact at v2, and the rendered sheet set beside a printed V5 shows the same ten panels.

## Notes

- **This map amends another map's closed decisions, which is new here.** [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md) deliberately decided a collaborator is "a plain name string — **no `kind` field**" and that "`relationship` is a single optional escape-hatched string"; both are now up for reversal. That ticket and [assemble-spec](wayfinder/tickets/008-assemble-spec.md) live on [map.md](wayfinder/map.md), which closed **signed off 2026-08-07 — "the map is complete"**. That map stays closed and its Destination stays reached: it promised a hand-off-ready spec with nothing left to decide before building, and it delivered one. This is a different destination that happens to touch the same files. When the grilling resolves, the amendment gets recorded on `map.md`'s ticket lines in the idiom already used there — its 003 line already carries "(Amended by assemble-spec: domain-role rows are `{ name }` only …)".
- **This map carries execution** (like the hosting and examples maps): the codebase is built, live and verified, so task tickets *do* — migrate, render, rebuild — once the decision ticket clears.
- **Settled context (from the research, 2026-08-10):** the canonical sources are prose and drawings, not a schema — there is no JSON Schema, YAML or versioned data format anywhere upstream, so every claim traces to the README, a `resources/` image, the Excalidraw JSON or the HTML form, and where those disagree the drawn canvas is the more complete source. `description` is upstream's own **v4** name, renamed by [`f438279`](https://github.com/ddd-crew/bounded-context-canvas/commit/f438279) in the single commit that made v5. Strategic classification is a restructuring, not an omission — the axes are in the file and the digest, just dressed as metadata. The domain-role worksheet explicitly invites custom traits, so divergence there is legitimate and only the claim of authority is not.
- **Four suspicions the research cleared, not to be relitigated:** `cost-reduction` is not an invention (it is on the drawn canvas and in upstream's HTML form; only the README prose omits it); the nine relationship patterns match `ddd-crew/context-mapping` exactly; message types and the Event Storming palette match upstream's own Excalidraw legend; free-text validation of the classification axes matches canonical, which never closes those sets either. Section ordering differs — the README's is a *filling* order, ours the canvas's *spatial* order — and both are defensible.
- **A mockup already exists** at `.scratch/canonical-v5-alignment/canonical-v5-alignment.html`: the sheet with all six applied, built on the project's own tokens so it is a like-for-like comparison rather than a redesign, with a change register citing the source behind each one. It also records two treatments tried and dropped (the canonical sub-labels, the `Collaborator`/`Messages` column heads) and four rejected renderings of the two-sided relationship, so those arguments start from where they left off.
- **`SPEC.md` is amended as each ticket lands**, so it stays the single hand-off truth — §3 for the schema, §5 for the sheet, and the title-block line at `SPEC.md:168` — which describes classification as living inside that block — rewritten rather than patched.
- **Skills:** `/grilling` + `/domain-modeling` for the decision ticket (maintain `CONTEXT.md` as terms sharpen); `writing-copy` for every user-facing and model-facing string; the `run` skill plus the WebKit-checkpoint habit if the sheet work needs a live look.
- **Tracker (local markdown):** tickets live in `wayfinder/tickets/*.md`. Frontmatter: `status: open|closed`, `assignee` (non-empty = claimed), `blocked-by: [ticket names]`. Frontier = open, unassigned, all blockers closed. Resolutions are appended to the ticket under `## Resolution`, then `status: closed`. Commit tracker changes to `main`.

## Decisions so far

<!-- one line per closed ticket -->

_(none yet — [canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md) is the frontier, alongside [workshop-drive](wayfinder/tickets/034-workshop-drive.md) on the MCP map.)_

## Not yet specified

- **Whether the two schema reversals are worth their migration.** The grilling decides; if refused, [canvas-file-v2](wayfinder/tickets/036-canvas-file-v2.md) closes as "not doing it" and the two presentation-only halves of [sheet-canonical-layout](wayfinder/tickets/037-sheet-canonical-layout.md) — classification as a panel, the shared centre box — split out and land on their own.
- **Which side a v1 `relationship` string migrates onto.** It is one value with no side; canonical reading says it is this context's own role, but that is a claim about what people meant when they typed it and it is argued in the resolution, not assumed in the code.
- **Whether mirroring the lanes earns the column heads back.** Outbound right-aligned, so direction reads outward from the centre the way the template does. Left open in the sheet ticket; a layout change beyond this alignment.
- **Whether the closed tickets get amendment pointers appended**, or whether the map line alone carries it.

## Out of scope

- **Reopening [map.md](wayfinder/map.md).** Its destination was reached and signed off; amendments are recorded against it, never inside it.
- **The Use Case Swimlanes layout variant** — still V5 canonical only, as the original map's Out of scope has it. Nothing here widens that.
- **Importing foreign formats.** The research read upstream's Excalidraw and HTML-form artifacts as *evidence of the canonical field set*; it does not make them import targets. Own Canvas file schema only.
- **Chasing upstream's own inconsistencies.** The README omits `cost-reduction`, the Excalidraw writes `generic` where the rendered canvas says `genesis`, the HTML form still calls domain roles "Model traits", and the Miroverse template is stuck at v4. We follow the drawn V5 canvas and say so; we do not reconcile upstream with itself.
- **A canvas-version selector.** V5 is the layout, singular. Nothing here introduces v4 rendering or a per-canvas layout choice.
