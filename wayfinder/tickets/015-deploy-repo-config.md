---
name: deploy-repo-config
title: "Task: repo-side deploy config (_headers caching)"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [pages-deploy-mechanics]
---

## Question

AFK — add the repo-side deploy configuration: a `static/_headers` file (adapter-static copies `static/` into `build/`) giving `/_app/immutable/*` its `cache-control: public, max-age=31536000, immutable` header, with exact syntax per [pages-deploy-mechanics](wayfinder/tickets/013-pages-deploy-mechanics.md); skip anything Pages' defaults already cover. Verify `_headers` lands in `build/` on a local build and doesn't itself get served with the app shell's caching.

No `_redirects` yet — the exit-ramp tombstone is written only if the Workers migration ever happens.

Resolved when the file is committed to `main`; the header's live behavior is proven in [live-verification](wayfinder/tickets/017-live-verification.md).

## Resolution

Committed `static/_headers` with the single rule from [pages-deploy-mechanics](wayfinder/tickets/013-pages-deploy-mechanics.md):

```
/_app/immutable/*
  cache-control: public, max-age=31536000, immutable
```

Nothing else is restated — Pages' default (`max-age=0, must-revalidate` + ETag/304) already covers the app shell and every other asset. No `_redirects` written, per the ticket.

Both verification points pass:

- **Lands in `build/`:** `npm run build` (adapter-static 3.0.10) copies it through; `cmp` confirms `build/_headers` is byte-identical to `static/_headers`, and `build/_app/immutable/` exists as the rule's target.
- **Not served with app-shell caching:** per the [Pages headers doc](https://developers.cloudflare.com/pages/configuration/headers/), the file "will not itself be served as a static asset, but will instead be parsed by Cloudflare Pages" — it is never served at all, so no caching applies to it. Live spot-check (expect the 404/fallback, not the file) can ride along in [live-verification](wayfinder/tickets/017-live-verification.md)'s curl pass.

Live proof of the immutable header on `/_app/immutable/*` remains with [live-verification](wayfinder/tickets/017-live-verification.md), as scoped.
