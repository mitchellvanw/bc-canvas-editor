---
name: deploy-repo-config
title: "Task: repo-side deploy config (_headers caching)"
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [pages-deploy-mechanics]
---

## Question

AFK — add the repo-side deploy configuration: a `static/_headers` file (adapter-static copies `static/` into `build/`) giving `/_app/immutable/*` its `cache-control: public, max-age=31536000, immutable` header, with exact syntax per [pages-deploy-mechanics](wayfinder/tickets/013-pages-deploy-mechanics.md); skip anything Pages' defaults already cover. Verify `_headers` lands in `build/` on a local build and doesn't itself get served with the app shell's caching.

No `_redirects` yet — the exit-ramp tombstone is written only if the Workers migration ever happens.

Resolved when the file is committed to `main`; the header's live behavior is proven in [live-verification](wayfinder/tickets/017-live-verification.md).
