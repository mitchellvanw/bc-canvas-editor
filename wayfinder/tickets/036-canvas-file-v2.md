---
name: canvas-file-v2
title: "Task: Canvas file v2 — the first migration this schema has ever run"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [canonical-v5-amendments]
---

## Question

Carry what [canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md) adopted into the Canvas file. All three format-touching findings were adopted — the `description` → `purpose` rename, a collaborator `kind`, and `relationship` becoming a two-sided pairing — so the version bumps.

**The shape it lands on:**

```
CanvasFile  version 2; `purpose` takes `description`'s position in the fixed key order
Lane        { collaborator: { name, kind? }, relationship?: { theirs?, ours? }, messages }
```

The collaborator is **promoted to an object** rather than the lane growing a `collaboratorKind` sibling — the kind belongs to the collaborator and the relationship to the boundary, and every other row in this schema is already an object with an optional second field. `kind` is a **closed** enum (`bounded-context | external-system | frontend | user`), because in this parser the rule that separates closed from lax is whether the value drives a rendering: `type` picks a colour, `kind` picks an icon, and an unrecognised kind has no glyph. `theirs` is written before `ours` so a hand-reader of the JSON meets the two ends in the order the sheet draws them.

**This is the first migration the app will ever run.** `MIGRATIONS` at `src/lib/model/parse.ts:52` is an empty object; the ordered-migration machinery around it (`:229`–`:239`, refusing anything with no path from *v* to *v+1*) has never had an entry to execute. So the work is as much about proving the mechanism as about the three field changes, and the migration is the artifact to get right: a v1 file must load, become v2, and be indistinguishable from one authored at v2.

**The three changes.** `description` → `purpose` is a key rename in a fixed-order flat object (`src/lib/model/canvas.ts:43`) — the key order is load-bearing, since `SPEC.md:88` promises an unchanged canvas serializes byte-identically, so the new key takes the old one's position. `kind` is optional and absent by default: a lane without one renders exactly as today. `relationship` changes shape rather than name.

**The migration rule, already argued and not to be re-derived in code.** A v1 `relationship` string migrates onto **`ours`, uniformly**. The justification is deliberately not "that is what people meant" — the nine teaching one-liners at `vocab.ts:40` are written from mixed perspectives, so no single side was ever meant. It carries because both ends are optional and free-text, so a wrong guess renders visibly on the lane and is one pick to correct with nothing lost; a migration that guesses uniformly and cheaply beats one that guesses cleverly and invisibly. Put that reasoning where the migration lives, not just here.

**The migration never rewrites free text.** `octopus coordinator` in a user's canvas survives exactly as typed and merely stops matching a picker option. Domain roles are free text; rewriting someone's prose to match a vocabulary correction is overreach.

**A v1 import lands clean, not dirty.** The file on disk still opens and nothing the user typed is unsaved, so the import clears unexported changes the way every other import does. Marking it dirty would warn them about losing work they have not done.

**What the parser must keep doing.** `asClassification` (`:140`) and `asLane` (`:167`) are strict about shape and lax about vocabulary — any string passes on a classification axis or a relationship, and only message `type` is a closed enum (`:54`). That asymmetry is correct and matches canonical, which never closes those sets either; v2 must not tighten it by accident. The `detail` line described at `SPEC.md:96` has to name the new fields the way a developer would type them to reach the value.

**What has to survive.** The four bundled examples in `examples/` go through the same parse path as any import, and `src/lib/chrome/examples.test.ts` holds every one byte-exact through that path at the current version — so a bump means re-pinning them, and the honest way is to migrate the committed files rather than let the test pass on migrated-in-memory bytes. Here they migrate **mechanically**; [examples-v2-content](wayfinder/tickets/039-examples-v2-content.md) comes back after the sheet exists to author the new fields by hand, which is why that is a separate ticket rather than this one's last step. `src/lib/model/embed.ts` and the HTML artifact embed the Canvas file byte-identically and re-import through the same version check (`SPEC.md:278`), so a v2 artifact and a v2 `.bcc.json` must still be the same bytes. Newer-than-known files stay refused and unmutated.

Round-trip tests for v1 → v2 in `parse.test.ts`, serialization order in `serialize.test.ts`, suite green, `tsc` and `svelte-check` clean. `SPEC.md` §3 updated in the same commit — the spec is the hand-off artifact and a schema it does not describe is worse than no spec.
