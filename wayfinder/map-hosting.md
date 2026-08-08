---
name: bc-canvas-hosting-map
title: "Wayfinder map: host BC Canvas on Cloudflare Pages"
labels: [wayfinder:map]
---

# Wayfinder map: host BC Canvas on Cloudflare Pages

## Destination

BC Canvas live at `bc-canvas.pages.dev` (fallbacks `bccanvas`, `bc-canvas-editor` — all three probed unclaimed), deployed by Cloudflare Pages git integration from `main` of `mitchellvanw/bc-canvas-editor`, previews for PRs only, with immutable caching on hashed assets and Cloudflare Web Analytics counting visits. The map is done when the live-verification checkpoint passes and a push to `main` repeatably redeploys.

## Notes

- **This map carries execution.** Unlike the spec map, the destination is a change made in place — task tickets *do* (create the project, flip settings, verify live) rather than decide. Every decision was made during charting; what remains is mechanics-research plus execution.
- **Settled context (from charting):** Cloudflare Pages on Mitchell's existing personal (free-tier) account. **Pages over Workers** — Workers was weighed and declined because it forfeits the flat `pages.dev` URL (`<worker>.<account-subdomain>.workers.dev` is a segment longer) and a later migration has a clean exit ramp: keep the Pages project alive serving a `_redirects` tombstone (`/* https://<new-home>/:splat 301`); caveat recorded that localStorage autosaves never cross origins. *Interpolation awaiting sign-off: Mitchell asked "if I choose pages.dev now, can I redirect later?" — the affirmative answer was read as choosing Pages.* Git integration (no wrangler, no owned CI), project name `bc-canvas`, production branch `main`, PR-previews only (`prototype/*` / `research/*` branches stay URL-less), `_headers` immutable caching in scope, Web Analytics in scope with the hard rider that the beacon must never leak into exported self-contained HTML artifacts, custom domain out of scope.
- **Skills:** `/research` for the mechanics ticket; the `run` skill plus the WebKit-checkpoint habit from the build tickets for live verification.
- **Tracker (local markdown):** tickets live in `wayfinder/tickets/*.md`. Frontmatter: `status: open|closed`, `assignee` (non-empty = claimed), `blocked-by: [ticket names]`. Frontier = open, unassigned, all blockers closed. Resolutions are appended to the ticket under `## Resolution`, then `status: closed`. Commit tracker changes to `main`.

## Decisions so far

<!-- one line per closed ticket -->

## Not yet specified

- Public-URL polish — the app ships no favicon (`static/` holds only `robots.txt`) and no page description/social metadata; once the site is live, judge what a shared `bc-canvas.pages.dev` link deserves. Coarser than a ticket until the live checkpoint shows how bare it looks.

## Out of scope

- Custom domain — the destination is the `pages.dev` URL; a domain would be a fresh effort.
- Migrating to Workers / `workers.dev` — declined during charting; the `_redirects` exit ramp above is the documented route if ever redrawn.
- Analytics beyond Cloudflare Web Analytics visit counts — no product analytics, no event tracking.
- Any change to app behavior for hosting's sake — the built `build/` output deploys as-is.
