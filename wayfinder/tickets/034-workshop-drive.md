---
name: workshop-drive
title: "Task: the workshop gate — a real facilitated session, both hosts, fidelity checked on disk"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [bcc-plugin]
---

## Question

The second gate on the map's Destination, HITL by nature — a workshop needs a human whose answers are real. Run on a context Mitchell actually knows and has not canvassed, not a fixture. Both hosts where each observation applies; evidence in `.scratch/workshop-drive/`, per the checkpoint habit.

Six observations, and the first two are a fork this map deliberately left to evidence:

1. **Row fidelity across the workshop's eleven read-then-write cycles, diffed on disk** — not trusted. `empty` catches a dropped section; only a diff catches an altered row. The trigger for `bcc_write_section` is loss or unrequested alteration, never token cost. If it fires, the section-scoped write (never an operation union — [workshop-shape](wayfinder/tickets/031-workshop-shape.md) fixed its shape in advance) is a new map, not a ticket here.
2. **Invented rows** — does anything land on the sheet the human didn't say? The drafting skill's whole cargo is this discipline; the drive is where it is caught being a sentence rather than a mechanism.
3. **Discovery** — does each skill trigger from a natural request ("let's canvas this service", "run a workshop for ordering") without being named, in each surface? Finding 7's question, re-asked of skills. And does `canvas-reviewer` get picked up for a review ask in Cowork and Claude Code — behaving to its thin contract when it does?
4. **The install, done as a user would** — `/plugin marketplace add` in Cowork; whether the bundled server's refusal at `/` surfaces somewhere a reader can act on it, with the hand-written `--root` entry as the remedy the README claims it is. If the two-config story confuses in practice, that is the evidence that reopens per-install root parameterization.
5. **The read-before-write discipline** — followed, or silently skipped? A discipline a skill states but the model skips is a sentence, not a mechanism, and the fork in (1) needs to know which one held.
6. **The prompt beside the agent** — `review-canvas` still reachable in Claude Code and still to contract, so keeping both is confirmed as two entry points rather than one plus a corpse.

Green here closes the workshop phase and the map with it. What the observations force instead — a write tool, a root story, a retired entry point — goes back on the map before anything is built.

## Resolution

**Closed on Leg A alone, by Mitchell's scoping call on 2026-08-14.** Leg B — Cowork/Claude
Desktop — never ran, and three Leg A items never ran either. Three of the six observations
are therefore answered on evidence and three are **unobserved**, recorded as such rather
than inferred. This ticket does not claim a gate it did not walk.

The drive: one real session, ~40 minutes, `canvas-workshop` facilitating a canvas of Feed
Ingestion in a shallow clone of [miniflux/v2](https://github.com/miniflux/v2) — open-source
Go that neither of us wrote, chosen so an invented row is checkable against source rather
than memory. Six writes to `docs/canvases/feed-ingestion.bcc.json`, captured live by a
filesystem snapshotter that was running before the session started. Instruments, run sheet
and findings in `.scratch/workshop-drive/` (gitignored, so this resolution is the record
that survives).

**The session had four human turns.** That number is the single most load-bearing fact
here, and every observation below has to be read against it:

| at (UTC) | what Mitchell typed |
| --- | --- |
| 09:16:32 | *"let's run a canvas workshop for miniflux"* |
| 09:52:18 | *"run the canvas reviewer on it"* |
| 09:55:36 | *"proceed how you best see fit"* |

### 1. Row fidelity — **green; `bcc_write_section` is not triggered**

`fidelity.mjs` over the six-snapshot chain: **+79 added · °2 filled · ~1 ALTERED ·
-2 REMOVED**. Writes 1–5 are purely additive — not one row lost, not one rewritten. All
three of the alteration and the removals sit in the **sixth** write, which lands 75 seconds
after *"proceed how you best see fit"*, and both removals are the facilitator retracting
**its own** disclosure rows, replaced in the same write by more specific ones keeping the
same questions open. The alteration unsets one axis and says so on the sheet.

So the trigger — *loss or unrequested alteration* — did not fire: nothing was lost that the
human had said, nothing was rewritten that he had not handed over.
[workshop-shape](wayfinder/tickets/031-workshop-shape.md)'s fork resolves as it was set up
to: **`bcc_write_section` stays decided and unbuilt**, and whole-document write survives its
first real session.

Two qualifications, both narrowing the green rather than dimming it. The ticket assumed
*eleven* read-then-write cycles; there were **six**, because the facilitator batched
`bcc_explain` calls — four (domainRoles, inbound, ubiquitousLanguage, outbound) before one
write, then three (businessDecisions, assumptions, verificationMetrics) — where
`canvas-workshop` says to write before moving on from each section. Fewer cycles is less
exposure to loss, so this is a smaller sample than the ticket sized. And the honest form of
the claim is narrower than "whole-document write is safe": it has been shown **not to lose
rows**, and has **not** been shown to survive a write the human did not authorise, because
no such write occurred. The trigger keeps its meaning for later use.

### 2. Invented rows — **green: the drafting discipline held**

Rows did land that Mitchell did not say — strategic classification, domain roles, business
decisions, assumptions and verification metrics were all facilitator-picked. Every one of
them was picked **under an explicit delegation** and **flagged back on the sheet, in Open
questions, as the facilitator's own**, naming what it had drafted from and asking for
confirmation or correction. That is `draft-canvas-from-code`'s whole cargo working inside a
workshop, which is the seam behaving rather than the seam being avoided.

Judged green by Mitchell on 2026-08-14, and worth recording *how* it was earned: three of
the four turns were delegations, so drafting-on-delegation was this session's **dominant
mode**, not an edge it brushed. The discipline was load-bearing for most of the sheet and
held throughout. One thing the skill does not describe happened inside it: the facilitator
dispatched an `Explore` subagent mid-session to read the Go source, which `canvas-workshop`
never mentions — the drafting behaviour reached for a tool the workshop procedure does not
name. Noted, not faulted; it is where the two skills' seam is thinnest under delegation.

Unprompted and to the ticket's credit: the facilitator chose a **sub-context** — "Feed
Ingestion", not "Miniflux" — which is the boundary question the run sheet deliberately left
un-pre-decided. A canvas is a bounded context, and a facilitator that never asks where the
boundary sits has skipped the first question. This one asked it.

### 3. Discovery — **one third green, two thirds unobserved**

- `canvas-workshop` ← *"let's run a canvas workshop for miniflux"* — **fired unnamed.**
  Green, and it is the half [workshop-shape](wayfinder/tickets/031-workshop-shape.md) was
  betting on when it moved facilitation off a prompt and onto a skill to dissolve
  [mcp-hosts-checkpoint](wayfinder/tickets/030-mcp-hosts-checkpoint.md)'s finding 7.
- `canvas-reviewer` — dispatched, but **Mitchell named it**. That is evidence the agent is
  *reachable*, not that it is *discoverable*, and the observation asks the second question.
  **Unobserved.**
- `draft-canvas-from-code` — never asked in this host. **Unobserved.**
- All of it in Cowork — **unobserved**, Leg B dropped.

The reviewer did behave to its thin contract where it ran: it wrote nothing back. The write
that follows it in the call order is the **facilitator's**, under turn 3's delegation —
`discipline.mjs` excludes dispatched agents' own calls, so the two are not confusable.

### 4. The install and the root story — **unobserved**

Leg B was the only leg carrying it. Nothing is claimed about whether Desktop's refusal at
`/` surfaces where a reader can act on it, or whether `mcp/README.md`'s hand-written
`--root` entry reads as the remedy it says it is. Per-install root parameterization
therefore stays exactly where [workshop-shape](wayfinder/tickets/031-workshop-shape.md) put
it — open, and now open with its evidence ungathered rather than gathered and negative.

### 5. Read before write — **green, as a mechanism**

`discipline.mjs` over the transcript: **6 writes, 7 reads, perfectly alternating, no
`write → write` pair anywhere**, the post-review write included. The facilitator's own calls
only; dispatched agents' reads are excluded, or the discipline being measured would be
somebody else's. This is the observation that most needed to be a mechanism rather than a
sentence, and it is one.

### 6. The prompt beside the agent — **unobserved**

`/review-canvas` was never invoked. Keeping both entry points is not confirmed here; it is
also not challenged, and [mcp-diet](wayfinder/tickets/059-mcp-diet.md) is where the question
now lands anyway, since that ticket is already re-sizing the whole surface.

### What this hands to the diet

[mcp-diet](wayfinder/tickets/059-mcp-diet.md) was blocked on exactly two of these and gets
both: whole-document write **does not lose rows** under a real session, and the model
**does** honour read-before-write as a mechanism rather than a stated intention. Both are
green, so neither argues for keeping the server on account of write safety. The diet is
unblocked and is the only thing on either map's frontier.

**Costs of closing here, stated plainly.** [map-mcp](wayfinder/map-mcp.md)'s Destination
asks for the facilitated session to be driven *"in both hosts"*; this closes it on one. The
gate is narrower than written, and the narrowing is a scoping call rather than a finding.
Two questions the drive was chartered to answer — whether the skills are discoverable
without being named beyond the one that was, and whether the two-config root story confuses
in practice — leave this ticket unanswered and go back on the map as fog, where they can be
picked up by real use rather than by a second staged drive.
