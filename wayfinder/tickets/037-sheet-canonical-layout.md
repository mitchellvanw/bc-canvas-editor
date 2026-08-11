---
name: sheet-canonical-layout
title: "Task: the sheet's canonical shape — classification as a panel, the centre box, the two-sided lane"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [canvas-file-v2]
---

## Question

Render what [canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md) adopted — all six, so every part of this ticket stands. The quiet sheet is the canonical visual truth — one read-only component that the editor wraps and both artifacts mount offscreen (`SPEC.md` §5, §9) — so every change here lands in the editor, the HTML artifact and the PNG at once, which is the whole reason that seam exists. `.scratch/canonical-v5-alignment/canonical-v5-alignment.html` is the reference render, built on the project's own tokens so it is a like-for-like comparison rather than a redesign.

**Classification becomes the tenth panel.** The three axes leave the near-black title block (`CanvasSheet.svelte:222`–`:238`) and take a section of their own with `Domain` / `Business model` / `Evolution` sub-columns; the block keeps its eyebrow and the context name. The grid at `:507` goes from `description ×7 · roles ×5` to `purpose ×5 · class ×4 · roles ×3` on the top row. The axis values keep the treatment they already have in the title block — spaced-caps label, mono value, no fill and no box. The mockup first tried them as yellow stickies, which was wrong twice over: `--color-term` is the ubiquitous-language highlighter, so it overloaded a meaning the palette had already assigned, and the finding was never about how classification looks. `SPEC.md:168` describes the title block as carrying classification and must be rewritten, not merely amended.

**The centre column gets its box.** The template draws Ubiquitous Language and Business Decisions inside one outer rectangle. They stay two sections — the box is layout, not nesting, and the README lists them separately — so this is a hairline around the pair, not a restructuring.

**The lane carries both sides of the relationship.** Ordered collaborator-first, the collaborator's role set back in `--color-ink-faint` and this context's stepping forward in full ink at weight 500, an arrow between them. The arrow is reading order across the boundary and points the same way in both panels: messages already carry direction by sitting in the inbound or outbound panel, so it has no competing job, and flipping it on outbound would flip the value order and break the convention that lets the pair work without labels. Weight and order convey nothing to a screen reader, so each side keeps a visually-hidden `Collaborator:` / `this context:` prefix — the sighted reader gets the quiet version, assistive tech gets the explicit one. Four earlier treatments were rejected on the way: labelled two-row (two shouty labels per lane), upstream's own two-pin drawing (it relies on a facing panel edge this layout does not have), arrow alone, and slash.

**Collaborator kind, drawn.** Four icons for the four canonical types — bounded context, external system, frontend, direct user interaction — keyed in the footer legend beside the existing meanings. A lane with no `kind` renders with no icon, exactly as today.

**The legend also keys the two-sided convention.** Ink weight is not self-describing, and the legend (`CanvasSheet.svelte:56`) is already where this sheet explains its own notation. Upstream gets away with unkeyed `CF`/`OHS` in front of people holding the template; an artifact that travels to people who never saw it does not.

**Three pick-slots in the lane header** — kind, their relationship, our relationship — rather than a bespoke paired control. The pick-slot already carries the keyboard model, the custom… escape hatch, the clear entry and the accessible-name convention that tickets 07 and 12 signed off. Their accessible names are **"Their relationship"** and **"Our relationship"**: never "role", which belongs to Domain Roles and would teach the wrong thing two inches from that panel. This tightens the chip-drag surface flagged in [state-undo-autosave](wayfinder/tickets/006-state-undo-autosave.md)'s wake — worth a look here, not worth a different control.

**The anti-pattern trait takes a caution ring; the local-addition marker stays off the sheet.** A reader of an exported PNG should see that `brain context` is flagged. "Not on the community worksheet" is provenance rather than a property of the modelled context, so it lives in the picker description and in `bcc_explain` and would be noise here.

**Two things the mockup tried and dropped, which should stay dropped unless the grilling says otherwise.** The canonical sub-labels (`Role types`, `Context-specific domain terminology`, `Key business rules, policies, and decisions`) cost a line in every panel, and the placeholder questions already teach the same thing at the moment it helps — while the section is empty. Paper needs them permanently only because paper cannot show them conditionally. The `Collaborator` / `Messages` column heads went with them for a sharper reason: on the template they head two real spatial columns, and a lane here stacks messages under their collaborator, so they named columns that do not exist. Mirroring the lanes themselves — outbound right-aligned, so direction reads outward from the centre — would earn them back, and is now **out of scope** on the map: a layout improvement past the destination, not a step on this route.

`src/lib/sheet/contrast.test.ts` is the gate on any new pair — the artifact holds WCAG AA and tokens shift here rather than being spot-fixed. The 760px artifact breakpoint and the print pass both need a look with a ten-panel top row. Suite green, `tsc` and `svelte-check` clean, `SPEC.md` §5 rewritten to match.
