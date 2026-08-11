---
name: canonical-v5-amendments
title: "Grilling: which canonical v5 departures do we adopt, now that they are written down?"
labels: [wayfinder:grilling]
status: closed
assignee: mitchell
blocked-by: []
---

## Question

BC Canvas advertises "the ddd-crew Bounded Context Canvas (V5 canonical layout)" (`SPEC.md:3`) and stamps `Bounded Context Canvas · V5` into the title block. It departs from that canvas in six ways, none of which had been written down until now. [docs/research/canonical-canvas-v5.md](docs/research/canonical-canvas-v5.md) reads the `ddd-crew/bounded-context-canvas` repository at master — README, `resources/`, `tools/`, the v4→v5 commit — and cites the file behind every claim. `.scratch/canonical-v5-alignment/canonical-v5-alignment.html` renders the sheet with all six applied, so each one can be looked at rather than argued about in the abstract.

This ticket decides which are adopted. It is a grilling and not a task because two of the six **reverse explicit decisions in [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md)**, and the spec they feed was signed off — [assemble-spec](wayfinder/tickets/008-assemble-spec.md) closed with "the map is complete" on 2026-08-07. Nothing here is a defect being fixed; every item is an answer being changed on new evidence, and it should be recorded as an amendment with the reasoning intact.

**The two that reverse 003.** That ticket decided a collaborator is "a plain name string — **no `kind` field**", on the grounds that nothing in scope consumed it and an optional field is the cheapest later migration; and that "`relationship` is a single optional escape-hatched string; no structured relationship taxonomy". Canonical draws four collaborator types as four distinct icons (`resources/collaborator-types.jpeg`), and marks a role at **each** end of every lane (`resources/collaborator-example.jpeg`) — a single string cannot express *this context is open-host service, that collaborator is conformist*. Both trades were reasoned, and the reasoning has not been falsified: the question is whether an exported artifact losing the distinction is a price worth paying now that the artifact is the product. The two-sided relationship is the one place where a canonical canvas carries information this file format cannot round-trip.

**The rename that is upstream's own.** `description` is not an arbitrary choice — it is the **v4** name, retained under a V5 badge. Upstream's v4→v5 commit [`f438279`](https://github.com/ddd-crew/bounded-context-canvas/commit/f438279) did exactly two things, and one was `### Description` → `### Purpose`. The section definition is word-for-word identical either side, so nothing is lost but recognition for someone arriving from the ddd-crew material. Against that: the repo already disagrees with itself — `CONTEXT.md:9` and `wayfinder/tickets/010-keyboard-a11y.md:32` both say "purpose", the schema and the shipped accessible name say "Description". Whichever way this goes, the split closes.

**The restructuring that is not an omission.** All three classification axes are in the file, the digest and the sheet — but as label/value pairs inside the title block (`SPEC.md:168`, `CanvasSheet.svelte:222`), not as one of the canvas's equal panels. A reader comparing the rendered sheet against a printed v5 counts nine panels where the canonical has ten, and the README treats classification as a first-class design decision (it links Core Domain Charts for it). The MCP layer already carries a `Strategic classification` label for a section the sheet never heads (`mcp/src/sections.ts:51`), so sheet and digest are not currently saying the same thing about whether it exists.

**The one that is yours, not the schema's.** The domain-role list is the largest silent divergence and needs no file-format change at all. Against `resources/model-traits-worksheet.md`: three traits absent (Gateway Interchange, Dogfood Context, Bubble Context), one invented (`service context`), `Octopus Enforcer` renamed to `octopus coordinator` with the meaning flipped from enforcement to orchestration, and `brain context` stripped of the worksheet's "(likely anti-pattern)" caveat while being described in flattering terms (`src/lib/editor/vocab.ts:84`). The worksheet explicitly invites custom traits — "or think of your own traits" — so none of it is out of bounds. What is not defensible is `mcp/src/explain.ts:73` calling them "The fifteen", which claims an authority the list does not have. Decide the vocabulary and decide what the server is allowed to call it.

**And the presentation questions**, which cost nothing and settle fast: whether Ubiquitous Language and Business Decisions get the shared outer box the template draws around them, and whether the mockup's relationship rendering is the one that ships — ink weight carrying which side is ours, ordered collaborator-first, the arrow reading as order across the boundary rather than message flow.

**What is already decided and should not be reopened.** The research clears four suspicions: `cost-reduction` is not an invention (it is on the drawn canvas and in upstream's HTML form; only the README prose omits it), the nine relationship patterns match `ddd-crew/context-mapping` exactly, message types and the Event Storming palette match upstream's own legend, and free-text validation of the classification axes matches canonical, which never closes those sets either. Section ordering differs — README order is a *filling* order, ours is the canvas's *spatial* order — and both are defensible. The canonical sub-labels and the `Collaborator`/`Messages` column heads were tried in the mockup and removed: they cost a line in every panel, the placeholder questions already teach the same thing while a section is empty, and the column heads named columns the lane layout does not have.

Use `/grilling` and `/domain-modeling` — `CONTEXT.md` needs the terms this settles. The route out is three tickets already written and blocked behind this one: [canvas-file-v2](wayfinder/tickets/036-canvas-file-v2.md), then [sheet-canonical-layout](wayfinder/tickets/037-sheet-canonical-layout.md) and [mcp-canonical-labels](wayfinder/tickets/038-mcp-canonical-labels.md). If the schema changes are refused, v2 closes as "not doing it" and the two presentation-only halves of the sheet ticket are pulled forward on their own.

## Resolution

**All six adopted.** Signed off 2026-08-11. Three of them change the Canvas file, so v2 happens and none of the conditional branches written into the three tickets behind this one are taken.

This is an **amendment**, not a defect report: [canvas-file-schema](wayfinder/tickets/003-canvas-file-schema.md) decided against a collaborator `kind` and against a structured relationship, and both decisions were correctly reasoned on what was known then. What changed is evidence, not judgment — [docs/research/canonical-canvas-v5.md](docs/research/canonical-canvas-v5.md) put the canonical sources on paper for the first time, and the exported artifact became the product rather than a side effect. The amendment is recorded on `map.md`'s ticket lines and appended to 003 and 008 themselves.

### The six

**1 · `description` → `purpose`.** Upstream's own v4→v5 rename ([`f438279`](https://github.com/ddd-crew/bounded-context-canvas/commit/f438279)), with the section definition word-for-word identical either side. The sheet stamps a V5 badge; keeping the v4 word under it is precisely the overclaim this map exists to end. It also closes a split the repo already carried — `CONTEXT.md:9` and `wayfinder/tickets/010-keyboard-a11y.md:32` both said "purpose" while the schema said `description`.

**2 · Strategic classification becomes the tenth panel.** The three axes leave the near-black title block for a real section with `Domain` / `Business model` / `Evolution` sub-columns; the block keeps its eyebrow and the context name. This is the one deviation a reader can catch without opening a source — nine panels beside a printed ten — and the README treats classification as a first-class design decision, linking Core Domain Charts for it. It also settles a disagreement already inside the repo: `mcp/src/sections.ts:51` has been carrying a `Strategic classification` label for a section the sheet never headed. No file change; the data was never missing.

**3 · Collaborators carry a `kind`.** `bounded-context | external-system | frontend | user`, optional and absent by default, drawn as canonical's four icons and keyed in the footer legend. 003's reasoning is not falsified by this — it is completed by it: 003 declined the field *because* "adding an optional field later is the cheapest schema change", which budgeted for exactly this migration rather than ruling it out. What changed is that a reader of an exported PNG cannot tell a frontend from an external system from a bounded context, and the export is now the product.

**4 · The relationship reads from both sides.** `relationship?: { theirs?: string, ours?: string }`, both optional, both free-text, vocabulary unchanged. This is the only place a canonical canvas carries information this file format could not round-trip: upstream's worked example pins a role at each end of every lane, and a single string cannot say *this context is open-host service, that collaborator is conformist*. The notation is coherent rather than decorative — where the pattern is symmetric the example prints the same word at both ends (`PNR … PNR`), where asymmetric it prints two (`CF … OHS`).

**5 · The domain-role vocabulary is realigned against its own citation.** Restore `gateway interchange`, `dogfood context`, `bubble context`; correct `octopus coordinator` → `octopus enforcer`, because the worksheet means *compliance*, not orchestration, and today's one-liner states the opposite of its source; restore brain context's "(likely anti-pattern)" and drop the description that read as praise; keep `service context`, presented as a local addition. Eighteen traits, in the worksheet's own order with the local addition last — a hand-tuned order that matches nothing is what let the divergence go unnoticed. The octopus reversal is the only item in the six that is simply **wrong** rather than divergent: a model reading `bcc_explain` is currently taught the opposite of the source.

**6 · One box around the centre column.** The hairline rectangle the template draws around Ubiquitous Language and Business Decisions returns. They stay two sections — the box is layout, not nesting.

### The Canvas file at v2

```
CanvasFile  version 2; `purpose` takes `description`'s position in the fixed key order
Lane        { collaborator: { name, kind? }, relationship?: { theirs?, ours? }, messages }
```

**The collaborator is promoted to an object rather than the lane growing a `collaboratorKind` sibling.** A compound key existing only to dodge nesting is what 003's "full canvas vocabulary" naming rule argues against; the kind belongs to the *collaborator* and the relationship to the *boundary*, so flattening puts two owners on one level; and every other row in this schema is already an object with an optional second field — `Message`, `UbiquitousTerm`, `BusinessDecision`, `DomainRole`. `collaborator: string` was the odd one out, and this is the one version bump where fixing it is free.

**`kind` is a closed enum; `theirs` and `ours` stay free text.** The rule that separates the two cases in this parser is *does the value drive a rendering*: message `type` is closed because it picks a colour, `kind` because it picks an icon, and an unrecognised kind has no glyph to draw. Canonical names four types and no escape hatch, unlike the `- other?` it prints on the Domain axis. Relationships keep the laxness `parse.ts:167` already has, which matches canonical — it never closes that set either.

**`theirs` is written before `ours`.** Key order is load-bearing for byte-exactness anyway, so it may as well teach: someone reading raw JSON meets the two ends in the order the sheet draws them, collaborator's side first.

### The migration rule

**A v1 `relationship` string migrates onto `ours`, uniformly, with no interpretation.** The justification is deliberately *not* "that is what people meant" — the evidence says no single side was ever meant. The nine teaching one-liners at `vocab.ts:40` are written from mixed perspectives: `conformist` says "**This context** adopts the upstream model wholesale", `big-ball-of-mud` says "**The other side** is entangled legacy", `partnership` and `shared-kernel` describe both sides at once. Against the eight lanes in the bundled examples, `ours` is right for three, wrong for two and ambiguous for three; `theirs` inverts that and is weaker; both-ends fabricates a claim on symmetric-looking values; and a per-value mapping would bake nine editorial judgments into migration code and make the migration interpret user prose.

What carries the decision is that both ends are optional and free-text, so a wrong guess **renders visibly on the lane and is one pick to correct, with nothing lost**. A migration that guesses uniformly and cheaply beats one that guesses cleverly and invisibly.

**The migration never rewrites free text.** `octopus coordinator` in a user's canvas survives exactly as typed and merely stops matching a picker option. Domain roles are free text and rewriting someone's prose to match a vocabulary correction is overreach.

**A v1 import leaves the canvas clean, not dirty.** The file on disk is not stale — it still opens, and nothing the user typed is unsaved. Marking it dirty would tell them they are about to lose work when they are not, which is the one lie dirtiness must never tell.

### The renderings

**The lane ships as the mockup draws it** — ink weight carrying which side is ours, ordered collaborator-first, the arrow reading as order across the boundary rather than message flow — **with one addition: the footer legend carries the convention.** Ink weight is not self-describing, and the legend is already where this sheet explains its own notation. Upstream gets away with unkeyed `CF`/`OHS` in front of people holding the template; a tool that exports artifacts to people who never saw it does not.

**Three pick-slots in the lane header** — kind, their relationship, our relationship — rather than a new paired control. The pick-slot already carries the keyboard model, the custom… escape hatch, the clear entry and the accessible-name convention that tickets 07 and 12 signed off; a bespoke control means re-litigating all of it. This does tighten the chip-drag surface flagged in 06, which is worth watching in [sheet-canonical-layout](wayfinder/tickets/037-sheet-canonical-layout.md), not worth a different control.

**The anti-pattern flag shows on the sheet; the local-addition marker does not.** A reader of an exported PNG should see that a role is flagged, so the chip takes a caution ring. "Not on the community worksheet" is provenance rather than a property of the modelled context — it belongs in the picker description and in `bcc_explain`, and would be noise on the sheet.

**The digest promotes classification too.** Sheet/digest disagreement is the argument that won item 2; leaving `mcp/src/digest.ts:22` as a title-block line would move the inconsistency rather than close it.

### Naming, and a collision avoided

"Their role" / "Our role" was the instinct and is wrong: **"role" is already taken by Domain Roles**, and a picker labelled *role* two inches from a section labelled *Domain roles* teaches the wrong thing. Canonical keeps them apart for the same reason — *Relationship Type* vs *Domain Roles*. So the file keys are `theirs`/`ours`, the accessible names are **"Their relationship"** and **"Our relationship"**, and the word *role* never appears in relationship copy. `CONTEXT.md` gains **Relationship type** as a term saying so outright, and **Collaborator** and **Lane** are rewritten around the kind and the two ends.

`mcp/src/explain.ts:73` stops saying "The fifteen" and names the source instead of a count — the set is the ddd-crew model-traits worksheet plus one local addition. The worksheet fixes no number, so neither do we.

### The four examples are hand-authored at v2

Not migration output. They are the teaching set, and shipping them mechanically means the new fields ship invisible — no example would exercise a `kind` or a two-sided relationship unless authored to. That includes `examples/order-fulfillment.bcc.json:15`, which carries `octopus coordinator` chosen under the description that now stands corrected, so it currently means the opposite of what its author intended: fixed by intent, not by rename.

### Where the record lives

**No ADR.** All three of the usual tests are met, but `docs/` holds only `research/` and this repo's decision record has always been the wayfinder ticket plus the `SPEC.md` amendment. Introducing `docs/adr/` now creates a second home for decisions and guarantees they drift apart — the exact failure this map exists to fix. This resolution is the ADR in this project's idiom.

### Ruled out of scope

**Mirroring the lanes** — outbound right-aligned so direction reads outward from the centre, which would earn back the `Collaborator`/`Messages` column heads. The destination is "the claim on the tin is true"; mirroring is a layout improvement past that line and its own effort if it is ever wanted. Moved from the map's Not-yet-specified to Out of scope, so no ticket graduates from it.

### Mechanism that needed no decision

`parse.ts:49` already declares `MIGRATIONS[v]` — "ordered raw-JSON migrations… empty while the format is at version 1" — with `newer-version` refusal at `:31` and `:227`, so v2 is `MIGRATIONS[1]` and there was nothing architectural to settle. And there is no second parser to keep in step: `mcp/src/read.ts:18` and `mcp/src/tools.ts:22` import `$lib/model/parse` directly, so the Destination's both-surfaces gate is met by construction rather than by discipline.
