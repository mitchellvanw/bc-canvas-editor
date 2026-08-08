---
name: create-pages-project
title: "Task: create the Pages project & first production deploy"
labels: [wayfinder:task]
status: closed
assignee: mitchell
blocked-by: [pages-deploy-mechanics]
---

## Question

HITL — the dashboard steps need Mitchell's Cloudflare login and GitHub authorization; the agent hands a precise checklist built from [pages-deploy-mechanics](wayfinder/tickets/013-pages-deploy-mechanics.md) findings and verifies the outcome.

Create the Pages project on the personal account: connect `mitchellvanw/bc-canvas-editor` (single-repo GitHub authorization), name it `bc-canvas` (fallback order: `bccanvas`, `bc-canvas-editor` — record which name actually landed, it is the URL), production branch `main`, build settings and Node pin per research, preview-branch config approximating PR-previews-only (`prototype/*` and `research/*` excluded).

Resolved when the first production deploy succeeds and the app loads at the claimed `pages.dev` URL. The answer records: final project name/URL, the exact build settings, and the preview-branch configuration — facts [web-analytics](wayfinder/tickets/016-web-analytics.md) and [live-verification](wayfinder/tickets/017-live-verification.md) depend on.

## Checklist (handed 2026-08-08)

Built from [pages-deploy-mechanics](wayfinder/tickets/013-pages-deploy-mechanics.md) (full notes: `docs/research/pages-deploy-mechanics.md` on `research/pages-deploy-mechanics`).

**Agent-side prep (done):** `.nvmrc` = `22` committed to `main` as drift insurance (v3 build image already defaults to Node 22.16.0, so no `NODE_VERSION` env var is needed); `main` pushed to `origin` so the first deploy builds the current app.

**Mitchell's dashboard steps:**

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
2. Authorize GitHub with the **Cloudflare Workers & Pages** app: choose **Only select repositories** and grant only `mitchellvanw/bc-canvas-editor`.
3. Select the repo. Project name: **`bc-canvas`**. Production branch: **`main`**.
4. Build settings — framework preset **SvelteKit**, then **override Build output directory to `build`** (the preset fills in `.svelte-kit/cloudflare`, which belongs to adapter-cloudflare; do not accept it). Build command stays `npm run build`. No environment variables.
5. **Save and Deploy**; wait for the build to go green.
6. **Check the URL the project actually got.** On name collision Pages silently suffixes random characters instead of erroring. Expected: `bc-canvas.pages.dev`. If it's suffixed, delete the project and retry as `bccanvas`, then `bc-canvas-editor`.
7. Preview-branch policy (dashboard naming drifts — either **Settings → Builds & deployments → Configure Preview deployments** or **Settings → Builds → Branch control → Preview branch**): set **Custom branches**, Include `*`, Exclude `prototype/*` and `research/*`. Excluded branches get no preview URL and no GitHub check run.
8. Report back: the final URL, that the build went green, and that the preview policy is set.

Verification (agent, on report-back): probe the live URL and confirm the app shell loads.

## Resolution

**Resolved 2026-08-08.** BC Canvas is live at **https://bc-canvas.pages.dev** — the exact name landed, no collision suffix (confirmed via the API's `subdomain` field, not just the dashboard hint).

**How it actually went (hybrid, not pure checklist):**

- A July `wrangler login` OAuth token (with `pages:write` and `offline_access`) still authenticates against the REST API — an API-first attempt at git-connected creation was refused with error **8000011** because the Cloudflare Workers & Pages GitHub App had never been installed on the account; that authorization is browser-only, so Mitchell ran the dashboard wizard: single-repo GitHub grant (`mitchellvanw/bc-canvas-editor` only), project `bc-canvas`, production branch `main`, SvelteKit preset with output dir overridden to `build`.
- **First build failed** on the checklist's own insurance: `.nvmrc 22` resolved to Node 22.22.0 on the v3 image, below `jsdom@30.0.1`'s `^22.22.2` floor, and the repo's `.npmrc` `engine-strict=true` turned the engine warning into a hard install failure. Fixed by pinning **`.nvmrc` to `26`** (mirrors local dev's 26.3.0, satisfies every engine range) — commit `8fae7ea`, whose push auto-triggered the successful production deploy (`https://fb7e8597.bc-canvas.pages.dev`).
- **Preview policy set via API PATCH**, not the dashboard: `preview_deployment_setting: custom`, include `*`, exclude `prototype/*`, `research/*` — confirmed in the PATCH response.
- Live probe: transient 522 immediately after deploy, then stable HTTP 200 on HEAD and GET; title `Untitled — BC Canvas`; hashed assets under `/_app/immutable/` served.

**Facts downstream tickets depend on:**

- URL: `https://bc-canvas.pages.dev`; project name `bc-canvas`; account `e8b6411f00bc1074c63dd934211560b9`.
- Build settings: `npm run build` → `build`, root ``, Node pinned by repo `.nvmrc` = `26` (no `NODE_VERSION` env var).
- Preview config: custom, include `*`, exclude `prototype/*`, `research/*`.
- The wrangler OAuth token works for Pages API reads and PATCHes ([web-analytics](wayfinder/tickets/016-web-analytics.md) and [live-verification](wayfinder/tickets/017-live-verification.md) can reuse it); the project's `build_config` currently shows `web_analytics_tag`/`web_analytics_token` as `null` — the field the analytics toggle presumably fills.
