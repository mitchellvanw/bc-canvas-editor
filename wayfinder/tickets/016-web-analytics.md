---
name: web-analytics
title: "Task: enable Cloudflare Web Analytics"
labels: [wayfinder:task]
status: open
assignee: mitchell
blocked-by: [pages-deploy-mechanics, create-pages-project]
---

## Question

Enable Cloudflare Web Analytics for the live site, by whichever mechanism [pages-deploy-mechanics](wayfinder/tickets/013-pages-deploy-mechanics.md) found current: the Pages dashboard toggle (HITL, Mitchell flips it) or a manual beacon snippet in `src/app.html` (AFK, committed to `main`).

**Hard rider:** the beacon must never appear inside exported self-contained HTML artifacts. Serve-time injection is clean by construction; if the snippet route is taken, prove the artifact builder (offscreen `CanvasSheet` mount) doesn't carry it — add the leak check to the artifact tests alongside the existing `?`-placeholder guard.

Resolved when a real visit shows up in the Web Analytics dashboard and the artifact leak check stands. Records the mechanism chosen and the beacon token's location.

## Checklist (handed 2026-08-08)

**Route taken: the dashboard toggle (HITL).** The AFK API route was probed and is closed: the wrangler OAuth token (refreshed, works for Pages reads/PATCHes) is refused by the Web Analytics (`rum/site_info`) endpoints — its scope list carries no analytics scope, and creating the site is the one step that needs it. The project's `build_config` still shows `web_analytics_tag`/`web_analytics_token` as `null`, waiting for the toggle to fill them.

**Agent-side prep (done):** the artifact leak check is committed — `html.test.ts` now plants the beacon script in the live DOM exactly where serve-time injection would put it (head and body) and proves the export carries no script beyond the embedded Canvas file block, alongside the existing placeholder guard. Green locally (8/8).

**Mitchell's dashboard steps:**

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **bc-canvas** → **Metrics** tab.
2. Under **Web Analytics**, click **Enable** (docs describe one click; community threads report UI drift — if you get a "Manage"/site-picker panel instead, add/select the site for `bc-canvas.pages.dev`).
3. Report back that it's enabled — nothing else to configure.

**Verification (agent, on report-back):** re-read `build_config` for the filled `web_analytics_tag`/`web_analytics_token` (records the token's location), trigger a fresh production deploy via API (docs: injection applies "on the next deployment"), probe the live HTML for the beacon, and fire a real browser visit with the Playwright WebKit habit. The visit count itself renders on the same Metrics tab — Mitchell eyeballs it, since the analytics API is closed to this token.
