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

- [Research: Cloudflare Pages deployment mechanics for this repo](wayfinder/tickets/013-pages-deploy-mechanics.md) — Node 22 default (no pin; `.nvmrc 22` as insurance); SvelteKit preset's output dir must be overridden to `build`; previews via Custom branches Include `*` / Exclude `prototype/*`,`research/*` (no PRs-only option exists); one `_headers` rule (immutable-year on `/_app/immutable/*`) atop Pages' revalidate default; Web Analytics toggle injects at serve time and the export builder verifiably can't leak the beacon; name collisions silently suffix — check the URL at creation. Full notes on branch `research/pages-deploy-mechanics`.
- [Task: create the Pages project & first production deploy](wayfinder/tickets/014-create-pages-project.md) — live at `bc-canvas.pages.dev`, exact name, no suffix; dashboard wizard for the browser-only GitHub App install (single-repo grant), everything else driven via the wrangler-OAuth REST API; `.nvmrc` had to move 22→26 (jsdom 30's engine floor + `engine-strict`); preview policy (custom, exclude `prototype/*` `research/*`) confirmed via API PATCH.
- [Task: repo-side deploy config (_headers caching)](wayfinder/tickets/015-deploy-repo-config.md) — `static/_headers` committed with the one immutable-year rule on `/_app/immutable/*`; local build confirms byte-identical passthrough to `build/_headers`, and Pages docs confirm the file is parsed, never served. Live header proof stays with live-verification.
- [Task: enable Cloudflare Web Analytics](wayfinder/tickets/016-web-analytics.md) — dashboard toggle (serve-time injection, no snippet in the repo); the toggle filled `build_config`'s `web_analytics_tag`/`token`, a fresh API-triggered deploy picked the beacon up, and a real WebKit visit's RUM POST was accepted (204). Artifact leak check green at close.
- [Task: live verification checkpoint](wayfinder/tickets/017-live-verification.md) — **destination gate passed**: WebKit checkpoint against the live origin green on every line (load audit, edit+autosave, all three exports, offline artifact with zero network, both import round-trips, immutable-vs-shell headers, main-push redeploy, skipped-not-built probe pushes to `research/*` and `prototype/*`, RUM 204). Dashboard visit count stays Mitchell's eyeball (API closed to the token, per web-analytics).

## Not yet specified

<!-- empty — the last fog patch graduated into public-url-polish when the live checkpoint showed how the link presents -->

## Out of scope

- Custom domain — the destination is the `pages.dev` URL; a domain would be a fresh effort.
- Migrating to Workers / `workers.dev` — declined during charting; the `_redirects` exit ramp above is the documented route if ever redrawn.
- Analytics beyond Cloudflare Web Analytics visit counts — no product analytics, no event tracking.
- Any change to app behavior for hosting's sake — the built `build/` output deploys as-is.
