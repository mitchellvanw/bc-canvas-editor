---
name: canvas-file-v2
title: "Task: Canvas file v2 — the first migration this schema has ever run"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [canonical-v5-amendments]
---

## Question

Carry whatever [canonical-v5-amendments](wayfinder/tickets/035-canonical-v5-amendments.md) adopts into the Canvas file. Up to three of the six findings touch the format — the `description` → `purpose` rename, an optional collaborator `kind`, and `relationship` becoming a two-sided pairing — and any one of them bumps the version.

**This is the first migration the app will ever run.** `MIGRATIONS` at `src/lib/model/parse.ts:52` is an empty object; the ordered-migration machinery around it (`:229`–`:239`, refusing anything with no path from *v* to *v+1*) has never had an entry to execute. So the work is as much about proving the mechanism as about the three field changes, and the migration is the artifact to get right: a v1 file must load, become v2, and be indistinguishable from one authored at v2.

**The three changes, if adopted.** `description` → `purpose` is a key rename in a fixed-order flat object (`src/lib/model/canvas.ts:43`) — the key order is load-bearing, since `SPEC.md:88` promises an unchanged canvas serializes byte-identically, so the new key takes the old one's position. `kind` is a new optional field on a lane's collaborator, and 003's own reasoning applies unchanged — optional, absent by default, a lane without one renders exactly as today. `relationship` changes shape rather than name: a single optional string becomes a pairing carrying a role for each side of the boundary. That last one is the only migration step with a real question in it — a v1 `relationship` string is one value with no side, and the migration has to decide which side it lands on. It is this context's own role on the canonical reading, but that is a claim about what people meant when they typed it, and it should be argued in the resolution rather than assumed in the code.

**What the parser must keep doing.** `asClassification` (`:140`) and `asLane` (`:167`) are strict about shape and lax about vocabulary — any string passes on a classification axis or a relationship, and only message `type` is a closed enum (`:54`). That asymmetry is correct and matches canonical, which never closes those sets either; v2 must not tighten it by accident. The `detail` line described at `SPEC.md:96` has to name the new fields the way a developer would type them to reach the value.

**What has to survive.** The four bundled examples in `examples/` go through the same parse path as any import, and `src/lib/chrome/examples.test.ts` holds every one byte-exact through that path at the current version — so a bump means re-pinning them, and the honest way is to migrate the committed files rather than let the test pass on migrated-in-memory bytes. `src/lib/model/embed.ts` and the HTML artifact embed the Canvas file byte-identically and re-import through the same version check (`SPEC.md:278`), so a v2 artifact and a v2 `.bcc.json` must still be the same bytes. Newer-than-known files stay refused and unmutated.

Round-trip tests for v1 → v2 in `parse.test.ts`, serialization order in `serialize.test.ts`, suite green, `tsc` and `svelte-check` clean. `SPEC.md` §3 updated in the same commit — the spec is the hand-off artifact and a schema it does not describe is worse than no spec.
