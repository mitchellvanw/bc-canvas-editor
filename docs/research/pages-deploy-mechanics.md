# Research: Cloudflare Pages deployment mechanics for this repo

Resolves [013-pages-deploy-mechanics](../../wayfinder/tickets/013-pages-deploy-mechanics.md). Every claim cites Cloudflare's primary docs (developers.cloudflare.com) or a local verification in this repo. Researched 2026-08-08.

## Decisions at a glance

| Ticket question | Answer | Detail |
| --- | --- | --- |
| Framework preset | SvelteKit preset, **override output dir to `build`** (preset assumes adapter-cloudflare's `.svelte-kit/cloudflare`) | §1 |
| Build command / output | `npm run build` / `build` | §1 |
| Node pin | **Not required** — v3 image defaults to Node 22.16.0, Vite 8 needs `^20.19.0 \|\| >=22.12.0`; pin `.nvmrc` = `22` anyway as drift insurance | §1 |
| PR-previews only | No such option; nearest: Custom branches, Include `*`, **Exclude `prototype/*`, `research/*`** (excluded branches also get no check runs) | §2 |
| Preview URLs | `<hash>.bc-canvas.pages.dev` + branch alias `<mangled-branch>.bc-canvas.pages.dev`; public by default, `noindex` header | §2 |
| `_headers` rule | `/_app/immutable/*` → `cache-control: public, max-age=31536000, immutable`; commit as `static/_headers` (passthrough locally verified) | §3 |
| Default caching | `max-age=0, must-revalidate` + ETag/304 + tiered cache — restate nothing else | §3 |
| Web Analytics | One-click Metrics toggle still documented; injection is serve-time (edge rewrite, inferred); exports cannot leak the beacon (builder verified); manual `beacon.min.js` snippet is the fallback | §4 |
| `bc-canvas` name | No documented validation/reserved rules; DNS-label-safe by construction; silent random-suffix on collision — check URL at creation | §5 |
| GitHub App scope | "Only select repositories" supported — grant the single repo | §6 |
| Free-tier builds | 500 builds/month, 1 concurrent, 20k files, 25 MiB/file | §6 |
| Exit ramp | `/* https://<new-home>/:splat 301` valid; shadows all assets; counts as 1 of 100 dynamic rules | §7 |

## 1. Build config for SvelteKit `adapter-static`

Sources: [SvelteKit framework guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-svelte-kit-site/); [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/); [Build image](https://developers.cloudflare.com/pages/configuration/build-image/); local verification in this repo.

### Preset vs. manual

- The dashboard's **SvelteKit framework preset** presets build command `npm run build` and output directory **`.svelte-kit/cloudflare`** — that output dir belongs to `adapter-cloudflare`, which Cloudflare's guide pushes ("To use SvelteKit with Cloudflare Pages, you need to add the Cloudflare adapter"). The guide explicitly acknowledges our adapter: "@sveltejs/adapter-static Only produces client-side static assets (no server-side rendering) and is compatible with Cloudflare Pages." There is no static-SvelteKit preset variant.
- **This repo:** `adapter-static@3` with default options writes to `build/` (locally verified: `npm run build` → `Wrote site to "build"`). So: **pick the SvelteKit preset but override the output directory to `build`** (build command stays `npm run build`), or configure manually with the same two values. Do not accept the preset's `.svelte-kit/cloudflare`.

| Setting | Value |
| --- | --- |
| Framework preset | SvelteKit (or None) |
| Build command | `npm run build` |
| Build output directory | `build` |

### Node version: default suffices, pin anyway

- Current build image is **v3** (v1 deprecates 2026-09-15, v2 2027-02-23, with automatic migration). v3's **default Node.js is 22.16.0**, with "Any version" installable — build-image docs table row, verbatim: "**Node.js** | 22.16.0 | Any version | NODE_VERSION | .nvmrc, .node-version".
- This repo's Vite 8 declares `engines.node: "^20.19.0 || >=22.12.0"` (verified from `node_modules/vite/package.json`). **The v3 default 22.16.0 satisfies it — no pin is required.**
- Pinning anyway is cheap insurance against future image-default drift. Mechanisms (build-image docs: "you can either set the desired version through environment variables or by adding files to your project"): the `NODE_VERSION` env var (dashboard: Settings > Environment variables), or a repo-root **`.nvmrc`** / **`.node-version`** file. **Recommendation: a repo-root `.nvmrc` with `22`** — it travels with the repo and applies to every build, sidestepping two doc gaps: precedence between `NODE_VERSION` and the files is undocumented, and the fetched docs don't confirm env-var production/preview scoping.

## 2. Preview controls: approximating "PR-previews only"

Source: [Branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/); [GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/); [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

**There is no true "PRs only" option.** Pages previews are branch-driven, not PR-driven — every commit to a non-production branch deploys unless branch rules say otherwise. The three modes are **All non-Production branches** (default), **None**, and **Custom branches** with include/exclude lists.

**Custom branch rules support wildcards** at the start or end of a rule ("A wildcard will match zero or more characters… if you wanted to match all branches that started with `fix/` then you would create the rule `fix/*`"). Evaluation order: "(1) Excludes, (2) Includes, (3) Skip" — excludes are processed first; a branch matching neither list is skipped. The docs' own Example 2 is exactly our shape (excluding `dependabot/*` while including `*`).

**The configuration for this repo:**

- Preview branch control: **Custom branches**
- Include Preview branches: `*`
- Exclude Preview branches: `prototype/*`, `research/*`

Dashboard path (docs show both an older and newer path — naming drift): **Settings > Builds & deployments > Configure Preview deployments**, or per the GitHub-integration page, **Settings > Builds > Branch control > Preview branch**.

**Excluded branches stay quiet on GitHub too:** "If a build skips for any reason (i.e. CI Skip, build watch paths, or branch deployment controls), the check run/commit status will not appear" (github-integration page). A PR opened from an excluded branch gets no preview deployment and no check run; the docs describe no PR-triggered fallback build. Also note previews are never created for PRs from forks.

### Preview URLs

Source: [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

- **Per-deployment hash URL:** `<hash>.<project>.pages.dev` (e.g. `373f31e2.bc-canvas.pages.dev`), a randomly generated hash per deployment; "atomic and may always be visited in the future".
- **Branch alias URL:** `<branch-alias>.<project>.pages.dev`, always pointing at the branch's latest deployment. Mangling rule, verbatim: "Branch name aliases are lowercased and non-alphanumeric characters are replaced with a hyphen — for example, the `fix/api` branch creates the `fix-api.<project>.pages.dev` alias."
- Preview URLs are **public by default** (lockdown is via Settings > General > Enable access policy, which uses Cloudflare Access and covers previews only). Every preview response carries `X-Robots-Tag: noindex` by default.

## 3. `_headers`: syntax, our one rule, and what Pages already does

Sources: [Headers](https://developers.cloudflare.com/pages/configuration/headers/); [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/); local verification in this repo.

### Syntax

A plain-text file named `_headers` in the build output directory: a URL pattern line, then indented `name: value` lines. Patterns support a single splat (`*`, greedy) and `:name` placeholders. Limits: **100 header rules max, 2,000 characters per line**. Duplicate header names across matching rules join with commas; `! Header-Name` detaches a header. Custom headers apply to static asset responses but "are not applied to responses generated by Pages Functions" (irrelevant here — pure adapter-static). Whether rules apply to 404 responses is undocumented.

### The rule

```
/_app/immutable/*
  cache-control: public, max-age=31536000, immutable
```

Valid and docs-endorsed — the headers page's own caching example is a splat path with `Cache-Control: public, max-age=31556952, immutable` for fingerprinted assets (their year is 31556952s; 31536000 is equally fine). SvelteKit's hashed assets live under `/_app/immutable/` (verified in this repo's build output).

### Passthrough verified locally

`static/_headers` survives into the build output for adapter-static. Verified in this repo (adapter-static 3.0.10, SvelteKit 2.63): placed the rule above in `static/_headers`, ran `npm run build`, and `build/_headers` contained it byte-for-byte. **Execution note: commit the file as `static/_headers`.**

### What Pages already does (do not restate)

Per serving-pages, default on every static asset: `Cache-Control: public, max-age=0, must-revalidate`, with freshness driven by ETags ("Pages always sends `Etag` headers for `200 OK` responses… if they match, Pages instead responds with a `304 Not Modified`") and assets "automatically served from Tiered Cache". The docs advise "In most situations, you should avoid setting up any custom caching on your site" — that warning targets custom-domain cache rules serving stale assets across deployments, not a `_headers` Cache-Control on content-hashed assets, which their own example endorses. So the `/_app/immutable/*` override is the **only** rule to write.

One interaction to know: a `Cache-Control: public, no-transform` header would block Web Analytics auto-injection ("Cloudflare proxy will not be able to modify the original payload… the Beacon script will not be automatically injected" — [get-started](https://developers.cloudflare.com/web-analytics/get-started/)). Our rule touches only JS/CSS under `/_app/immutable/*`, not HTML documents, so it has no effect on injection either way — but `no-transform` on HTML is the documented kill switch if we ever want one.

## 4. Web Analytics on Pages

Sources: [Pages Web Analytics how-to](https://developers.cloudflare.com/pages/how-to/web-analytics/); [Web Analytics get started](https://developers.cloudflare.com/web-analytics/get-started/); [FAQ](https://developers.cloudflare.com/web-analytics/faq/); [changelog](https://developers.cloudflare.com/web-analytics/changelog/); local verification of the export builder.

### The toggle still exists (per docs); mechanism is edge injection

- **One-click setup is still the documented flow:** Workers & Pages > project > **Metrics** > **Enable** under Web Analytics; "Cloudflare will automatically add the JavaScript snippet to your Pages site on the next deployment." No deprecation notice on the how-to, get-started, or changelog pages. Caveat: community threads (not fetchable, 403 — user reports only) describe dashboard drift — a missing "Manage" toggle and beacon injection persisting after disable — so expect the live dashboard to possibly diverge from the documented UI. Also note Cloudflare's [2025-09-17 blog](https://blog.cloudflare.com/the-rum-diaries-enabling-web-analytics-by-default/): Web Analytics enabled by default for free *zones/domains* from 2025-10-15; whether that extends to `pages.dev` projects is unstated.
- **Injection is serve-time (strongly supported inference, not a verbatim doc statement):** the get-started doc says a `no-transform` Cache-Control stops injection because the "Cloudflare proxy will not be able to modify the original payload of the website" — proxy-rewrite language that only makes sense at serve time. The deployed files are not modified. The how-to's "on the next deployment" reads as "takes effect from the next deployment onward". Flagged as inference; the docs never state the mechanism outright.

### The artifact-leak rider: satisfied, and verified in this repo

Serve-time injection means the beacon never enters our source or deployed `build/` files — but it *does* exist in the live DOM of the served page, so an exporter that serialized `document.head` would leak it anyway. **Ours cannot:** `src/lib/artifact/html.ts` builds the export's `<head>` from a literal template (charset, viewport, title, two inline `<style>` blocks) and harvests from the live document only `link[rel="stylesheet"]`/`<style>` CSS *text* (`collectAppCss`) plus the offscreen mount's `innerHTML` for the body — no `<script>` element can cross into an export (verified by reading the builder; PNG export snapshots the same mount). The rider holds under either the toggle or a manual snippet.

### Manual snippet (fallback if the toggle is gone)

From the FAQ/get-started (token from the Web Analytics dashboard's "Manage site"; changelog 2026-07-13 notes the script moved from `defer` to `type="module"`):

```html
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "SITE_TOKEN"}'></script>
```

If used, it would go in `src/app.html` — still outside the artifact builder's harvest, so the rider holds.

### Free-tier limits

Web Analytics is "available on all plans". Per the FAQ: unsampled beacon data retained **7 days**, then aggregated to ~10% (sampling applied dynamically by volume); data accessible for the **previous six months**; soft limit of **ten sites per account**. Fine for visit-counting.

## 5. Project naming: `bc-canvas` is safe by construction

Sources: [Limits](https://developers.cloudflare.com/pages/platform/limits/); [Create project API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/); [wrangler pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/); [Direct upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

**The primary docs state no validation or reserved-name rules for Pages project names** — the limits page, the create-project API reference (`name: string`, no schema constraints), the wrangler docs, and the known-issues page are all silent. The only documented behavior: "Your project will be served at `<PROJECT_NAME>.pages.dev` (or your project name plus a few random characters if your project name is already taken)." Since the name becomes a DNS label, `bc-canvas` (lowercase alphanumerics + hyphen) is safe by construction, and no documented reserved-name list could reject it. If undocumented runtime validation rejects it anyway, fall back to `bccanvas`, then `bc-canvas-editor` (all three DNS-probed unclaimed during charting). Note the "plus a few random characters" collision behavior: if the name is taken, Pages silently suffixes rather than erroring — check the resulting URL at creation time.

## 6. Git integration and free-plan limits

Sources: [GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/); [Branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/); [Limits](https://developers.cloudflare.com/pages/platform/limits/).

- **Single-repo authorization: yes.** During GitHub App install, "select **Only select repositories** > select your repositories" — grant only `mitchellvanw/bc-canvas-editor`. Cloudflare's own security guidance recommends limiting scope, and notes "A GitHub account should only point to one Cloudflare account." The app appears in GitHub as "Cloudflare Workers & Pages"; repo access is editable later under GitHub > Settings > Applications.
- **Production branch:** "Pages will default to setting your production environment to the branch you first push, but you can set your production to another branch if you choose" — changeable at **Settings > Builds & deployments > Configure Production deployments**. For this repo: `main`.
- **Free-plan limits:** 500 builds per month, 1 concurrent build, 20,000 files per site, 25 MiB max file size, 100 projects per account, 20-minute build timeout, unlimited preview deployments. None are close to binding for this static app.
- **Currency flag:** no maintenance-mode or deprecation banner exists on any fetched Pages docs page, but a [Pages-to-Workers migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) exists and the git-integration page notes Workers now also supports git integration — Cloudflare's strategic direction is Workers-ward, which is exactly why the §7 exit ramp was validated.

## 7. `_redirects` exit ramp: validated

Source: [Redirects](https://developers.cloudflare.com/pages/configuration/redirects/).

The future Workers-migration tombstone `/* https://<new-home>/:splat 301` is **valid as written**:

- Line syntax is `[source] [destination] [code?]`; destination "can include fragments, query strings, splats, and placeholders" and may be "a file path **or external link**". The docs' own example combines external target + splat: `/blog/* https://blog.my.domain/:splat`.
- Explicit status codes 301, 302, 303, 307, 308 are supported; 302 is the default when omitted, so the `301` must be stated.
- `:splat` greedily matches all characters from a single `*` in the source; only one splat per rule.

Gotchas recorded for the day the tombstone ships:

- **A `/*` redirect shadows every static asset**: "Redirects are always followed, regardless of whether or not an asset matches the incoming request." That is the intent (whole-site tombstone), but it is all-or-nothing; any carve-outs must be placed *above* the `/*` line (topmost rule wins for a matching source; static rules should precede dynamic ones).
- It counts as a **dynamic redirect** (limit 100 dynamic / 2,000 static / 2,100 combined; 1,000 chars per line) — trivially within bounds.
- Do not reach for `200` proxying instead: external domains cannot be proxied, only 3xx codes can point off-site.
- `_redirects` does not apply to requests served by Pages Functions — irrelevant for this pure adapter-static project.

## Open ambiguities (docs are silent or drifting)

1. `NODE_VERSION` env var vs `.nvmrc`/`.node-version` precedence — undocumented (moot if only `.nvmrc` is used).
2. Pages project-name validation rules — undocumented; rely on DNS-label safety plus the fallback names.
3. Web Analytics injection mechanism — serve-time is a strongly supported inference (proxy/`no-transform` language), never stated verbatim.
4. Current dashboard UI for the Pages analytics toggle may diverge from docs (community reports of a missing Manage/disable control); whether the Oct 2025 free-zone default-enable extends to `pages.dev` projects is unstated.
5. Whether `_headers` rules apply to 404 responses — undocumented.
6. Dashboard path naming drift: docs show both **Settings > Builds & deployments** (older) and **Settings > Builds > Branch control** (newer).

## Sources

Cloudflare primary docs (fetched 2026-08-08):

- https://developers.cloudflare.com/pages/framework-guides/deploy-a-svelte-kit-site/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/build-image/
- https://developers.cloudflare.com/pages/configuration/branch-build-controls/
- https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/serving-pages/
- https://developers.cloudflare.com/pages/configuration/redirects/
- https://developers.cloudflare.com/pages/how-to/web-analytics/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/
- https://developers.cloudflare.com/workers/wrangler/commands/pages/
- https://developers.cloudflare.com/web-analytics/get-started/
- https://developers.cloudflare.com/web-analytics/faq/
- https://developers.cloudflare.com/web-analytics/changelog/
- https://blog.cloudflare.com/the-rum-diaries-enabling-web-analytics-by-default/ (Cloudflare first-party blog)
- Community reports (secondary, unfetchable/403, flagged as such in §4): community.cloudflare.com threads 721350, 921106

Local verifications in this repo (worktree of `mitchellvanw/bc-canvas-editor`, adapter-static 3.0.10, SvelteKit 2.63, Vite 8.0.16):

- `vite.config.ts` — `adapter()` with defaults → output `build/`
- `node_modules/vite/package.json` — `engines.node: "^20.19.0 || >=22.12.0"`
- `static/_headers` → `npm run build` → `build/_headers` byte-identical (§3)
- `src/lib/artifact/html.ts` — export head is template-built; only CSS text and offscreen-mount innerHTML harvested from the live document (§4)
