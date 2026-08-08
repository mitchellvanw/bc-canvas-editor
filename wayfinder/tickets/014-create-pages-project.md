---
name: create-pages-project
title: "Task: create the Pages project & first production deploy"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [pages-deploy-mechanics]
---

## Question

HITL — the dashboard steps need Mitchell's Cloudflare login and GitHub authorization; the agent hands a precise checklist built from [pages-deploy-mechanics](wayfinder/tickets/013-pages-deploy-mechanics.md) findings and verifies the outcome.

Create the Pages project on the personal account: connect `mitchellvanw/bc-canvas-editor` (single-repo GitHub authorization), name it `bc-canvas` (fallback order: `bccanvas`, `bc-canvas-editor` — record which name actually landed, it is the URL), production branch `main`, build settings and Node pin per research, preview-branch config approximating PR-previews-only (`prototype/*` and `research/*` excluded).

Resolved when the first production deploy succeeds and the app loads at the claimed `pages.dev` URL. The answer records: final project name/URL, the exact build settings, and the preview-branch configuration — facts [web-analytics](wayfinder/tickets/016-web-analytics.md) and [live-verification](wayfinder/tickets/017-live-verification.md) depend on.
