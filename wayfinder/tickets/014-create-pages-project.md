---
name: create-pages-project
title: "Task: create the Pages project & first production deploy"
labels: [wayfinder:task]
status: open
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
