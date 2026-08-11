---
name: examples-v2-content
title: "Task: the four examples author the new fields, rather than inheriting migration output"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [sheet-canonical-layout]
---

## Question

[canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md) decided the four bundled examples are **hand-authored at v2, not migration output** — they are the teaching set, and shipping them mechanically means `kind` and the two-sided relationship ship invisible, since no example would exercise a field it was never given.

**This exists as its own ticket because the alternative is circular.** [canvas-file-v2](wayfinder/tickets/036-canvas-file-v2.md) must re-pin the examples to land at all — `src/lib/chrome/examples.test.ts` holds every one byte-exact through the parse path — but authoring content for the new fields means judging how a lane with a kind icon and two relationship ends actually reads, which needs [sheet-canonical-layout](wayfinder/tickets/037-sheet-canonical-layout.md) to exist. So v2 migrates them mechanically and correctly, and this ticket comes back afterwards to author them.

**What to author.** A `kind` on every collaborator across the four canvases — the distinction is the whole point of the field, and an example set where it is mostly absent teaches that it is optional in the sense of ignorable. Both ends of the relationship wherever the eight existing values imply an asymmetry: the migration put every v1 value on `ours` by a uniform rule that is right about three of them, ambiguous about three and wrong about two (`big-ball-of-mud` ×2, whose own teaching one-liner says "the other side is entangled legacy"). Here is where that gets corrected by hand rather than by rule. At least one lane should carry a symmetric pattern at both ends, since that is the case the sheet's ink-weight convention is least obviously right about.

**And one correction of intent.** `examples/order-fulfillment.bcc.json:15` carries `octopus coordinator`, chosen under a description that has since been corrected to mean its opposite — the worksheet's Octopus Enforcer is about *compliance*, not orchestration. So the example currently means the reverse of what its author intended. Fix it by intent: pick the trait that says what that context actually does, rather than renaming the value and inheriting a meaning nobody chose.

**What must not move.** These are published artifacts — `examples/*.bcc.json` are downloadable and re-importable, and the [examples map](wayfinder/map-examples.md) settled their roster and their prose. This ticket adds the new fields and fixes the one wrong trait; it does not re-open which four contexts are modelled, their names, or their existing copy. Re-pin `examples.test.ts` against the committed files, suite green, `tsc` and `svelte-check` clean.

## Resolution

**Landed** (commit `483e6a2`). Every collaborator across the four canvases carries a `kind`, and all four values appear: `frontend` on Patient Portal, `user` on Customer Service and Front Desk, `external-system` on Warehouse, Carriers, Messaging Platform and Patient Records, `bounded-context` on the rest. Royalty Distribution stays mid-workshop sparse everywhere else, but kinds were added there too — the ticket said every collaborator, and it does.

**The eight migrated relationship values, judged lane by lane.** The set now exercises every rendering the sheet has:

- **The two wrong ones**: both Warehouse lanes become `theirs: big-ball-of-mud, ours: anticorruption-layer`. Moving the mud to their end was the correction; giving our end the ACL is the pattern's own one-liner acted out — "defend this context's boundary" — and makes the lane the asymmetric both-ends teaching case.
- **The symmetric both-ends case** the ink-weight convention is least obviously right about: Carriers, `published-language` at both ends — canonical's own `PNR … PNR` idiom, an industry standard belonging to neither side.
- **A mirrored asymmetric pair across two canvases**: Patient Portal gains `theirs: conformist` under our `open-host-service`; Messaging Platform gains `theirs: open-host-service` over our `conformist`. The same two words with ours on opposite ends — the pair of lanes that shows the ink weight carrying real information.
- **The three left one-sided on purpose**: Checkout (`ours: customer-supplier` — the value names the pair, so one end claiming it reads true and both ends claiming it would fake a symmetry), Patient Records (`ours: anticorruption-layer`, their end genuinely unclaimed), and Notifications' inbound Order Fulfillment lane (`ours: conformist` — Order Fulfillment's own canvas makes no claim on its Notifications lane, and two views of one boundary should not invent agreement). These keep the one-sided arrow rendering exercised.

**The octopus fix-by-intent resolved to a removal, not a replacement** — the one real interpolation here. The old description the author chose under — "Orchestrates several contexts to fulfil one process" — is, in the corrected worksheet's vocabulary, the Execution Model: exactly `execution context`, already the canvas's first role. So the second row was a duplicate wearing a wrong name, and Order Fulfillment now carries one role. The considered alternative, if a second row is wanted at sign-off: `bubble context`, which the newly authored Warehouse lanes (`big-ball-of-mud` behind an `anticorruption-layer`) would genuinely support — but that is a new claim, not the author's intent, so it was not made silently. `brain context` was rejected: flagging the flagship example as a likely anti-pattern would be editorializing, and no example needs to carry the caution ring for the ring to be verified (040 can type one in).

**Re-pinned.** `examples.test.ts` holds all four files byte-exact through the real import path unchanged — the files were authored serializer-canonical. `mcp/src/digest.test.ts` was the one consumer pinning old content: its Checkout line now reads `### Checkout — bounded-context`, and its kind/two-ended test — whose own comment said it used a built lane only "until examples-v2-content hand-authors them" — now reads the notifications fixture (`### Messaging Platform — external-system`, `Collaborator: open-host-service → this context: conformist`). App suite 339 green, MCP suite 91 green, `tsc` and `svelte-check` clean.

**What did not move.** The roster, the context names, all prose, message rows, and Royalty Distribution's deliberate gaps. No relationship value was added to any lane that had none.
