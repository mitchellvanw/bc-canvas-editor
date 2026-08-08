---
name: live-verification
title: "Task: live verification checkpoint"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [create-pages-project, deploy-repo-config, web-analytics]
---

## Question

The destination gate, run against the live `pages.dev` origin (not localhost) in the WebKit-checkpoint style the build tickets established:

- App loads and renders the quiet sheet; fonts self-hosted (no third-party requests beyond the analytics beacon).
- Core flows on the live origin: edit + autosave, Canvas-file export/import, HTML-artifact export → opens offline → re-imports, PNG export.
- Exported artifact carries no analytics beacon and no absolute references back to the live origin — it stays self-contained.
- `curl -sI` proofs: `/_app/immutable/*` returns the immutable cache-control header; the app shell does not.
- Preview policy holds: a push to a `prototype/*` or `research/*` branch produces no preview deployment; production redeploys on a push to `main`.
- Analytics dashboard shows the verification visits.

Resolved when every line passes; the answer records the checked list and any deviations. Passing this closes the map's destination.
