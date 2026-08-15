# Research: docs pages derived from Markdown, rendered in the website

Ticket: none (exploratory, at Mitchell's request).
Researched: 2026-08-15, against primary sources (Vite 8's own docs and v8 migration guide, the SvelteKit docs, the W3C CSP Level 3 spec, the `pngwn/MDsveX` repo and npm registry, the rehype/remark/syntax-tree project READMEs and the npm registry, and `sveltejs/svelte.dev`'s own source) **plus a measured probe of this repo's real build** (§5). Every external claim carries a URL; every repo claim carries `path:line`. Claims not confirmed against a primary source are marked **[unverified]**; claims that are reasoning rather than sourcing are marked **[inferred]**.

Context: `/docs` today is one hand-authored Svelte page, 779 lines, of which lines 1–72 are a `<script>`, 73–606 are markup and 607–779 are a scoped `<style>` (`web/src/routes/docs/+page.svelte`). Its own header comment already states the relationship this note is about: "The substance is the same set of facts README.md, SPEC.md and the per-tool READMEs hold; this page is the reader-facing arrangement of them, not a second source of truth" (`web/src/routes/docs/+page.svelte:10`). The question is whether that arrangement can *be* Markdown rather than merely agree with it — and what the answer costs against constraints that were settled in the last four commits and are not up for renegotiation.

---

## 1. The constraints, stated as facts

These are not preferences. Each is a decision already made and already shipped.

| # | Constraint | Source |
|---|---|---|
| C1 | **No server, ever.** SvelteKit + `adapter-static`, Cloudflare Pages, "Strictly client-side; no server code." | `SPEC.md:34`; `web/vite.config.ts:19`; `web/src/routes/+layout.ts:1` (`export const prerender = true`) |
| C2 | **Three prerendered pages and a static 404**, and the eight docs anchor ids (`#editor`, `#canvas-file`, `#exports`, `#cli`, `#fence`, `#remark`, `#vscode`, `#mcp`) "the homepage links into, which makes those ids a contract." | `SPEC.md:35`; ids live on `<section id=…>` at `web/src/routes/docs/+page.svelte:140,202,244,291,340,381,455,496`; the page says so itself at `:8`; the homepage's six inbound links at `web/src/routes/+page.svelte:61–66` |
| C3 | **`script-src` carries no `'unsafe-inline'`.** The policy is `script-src 'self' https://static.cloudflareinsights.com` plus one per-page SHA-256. | `web/vite.config.ts:34`; the emitted policy in `build/docs.html` |
| C4 | **The policy rides each prerendered page as a `<meta>` tag**, because SvelteKit hashes its own inline init script per page and "a header would need `'unsafe-inline'` or per-build hashes." `x-frame-options` stays in `_headers` because `frame-ancestors` cannot ride a meta policy. | `web/static/_headers:1–11`; `web/vite.config.ts:21–29`; the 404 carries its own at `web/static/404.html:9–12` |
| C5 | **`style-src` does allow `'unsafe-inline'`; `font-src` is `'self'` only; `img-src` allows `data:` and `blob:`.** | `web/vite.config.ts:35–37` |
| C6 | **The docs prose is documentary.** It "rearranges facts recorded here and in the READMEs and makes no claims of its own; that copy is outside this spec." | `SPEC.md:35` |
| C7 | **The site's own analytics beacon is a serve-time edge injection**, not a repo file — `beacon.min.js` from `static.cloudflareinsights.com`, posting to `cloudflareinsights.com`. Both hosts are named in the policy. | `wayfinder/tickets/016-web-analytics.md:34,37`; `web/vite.config.ts:34,38` |
| C8 | **Bundles are committed, not built at install**, and each is diffed against a fresh build of itself by a test. `npm run build:bundles` is the ordered rebuild. | `remark/build.js:1–23`; `package.json:33`; `README.md:132–140` |

Two adjacent decisions that are *not* constraints on this question but are constantly mistaken for them:

- **"Markdown is source, not a rendered document"** (`wayfinder/map-views.md:26`) and **"A rendered-Markdown preview"** listed out of scope (`wayfinder/map-views.md:61`) are about the editor's **Markdown View of a Canvas** — the `.bcc.md` rendering of a canvas document (`CONTEXT.md:21`). They rule out putting a Markdown-to-HTML renderer *in the app and in every artifact*. They say nothing about a build-time renderer for the site's own docs, which ships no renderer to anyone.
- The repo's `remark/` package is a **`bcc` fence adapter**, not a Markdown renderer (`CONTEXT.md:25`; `remark/src/plugin.ts:97–150`). See §7.5.

---

## 2. What the docs page actually is

Counted from `web/src/routes/docs/+page.svelte`: 40 `<p>`, 15 `<h3>`, 14 `<li>`, 1 `<table>`, 10 `<pre>`, 5 `<figure>`, 2 `<dl>`, 1 `<img>`, and 6 invocations of a tilted field-note snippet. Markdown expresses the first four of those directly. It expresses none of the following, which are the page's whole visual argument:

| Construct | Where | Why Markdown can't |
|---|---|---|
| Per-tool chip colours driving both the section head and the nav legend dot | `:21–30`, `:33`, `:81–84` | A data table of Tailwind class strings, consumed twice |
| The scroll-spy `IntersectionObserver` action | `:36–48` | Client behaviour, not content |
| The tilted "field note" aside, floated into the right rail past the measure | `:74–79`, `:702–717` | A component with a rotation argument |
| `comes back` / `one way out` two-card `dl` grid | `:253–287` | Semantic grouping the Markdown source has no word for |
| `figure.filecard` — file contents with the filename as a tab | `:349–354`, `:392–395`, `:405–412`, `:572–575` | A caption tied to a code block |
| `pre.term` with per-span comment colouring inside the shell transcript | `:298`, `:309–313`, `:389`, `:470–471`, `:511–512` | Hand-placed `<span>`s, not a lexer's output |
| Template-literal consts holding brace-bearing code, "so the template never escapes a `{`" | `:50–71`, and the reason at `:14` | A Svelte problem that vanishes in Markdown, but the consts are how the page is written today |
| 173 lines of scoped `<style>` | `:607–778` | — |

**[inferred]** The honest reading: the docs page is a *designed page that contains prose*, not *prose with a stylesheet*. A Markdown-derived version is either (a) Markdown for the running prose with the bespoke furniture kept in Svelte around it, or (b) Markdown plus a directive vocabulary rich enough to say "field note", "filecard", "term block", "chip" — at which point the Markdown is a bespoke DSL and the maintenance moved rather than fell.

---

## 3. Which Markdown source?

The brief asks whether `SPEC.md` or the `wayfinder/` maps could feed this. Read against what those files contain, both are incoherent sources, and for different reasons.

**`SPEC.md` (64 KB, 14 `##` sections: Scope, Stack & deployment, Canvas file schema, Curated vocabularies, Visual language, Interaction model, Empty state, Keyboard model, Artifact production, UI copy, License, Reference dialog, Build risks, Provenance).** It is the letter of the law and the docs page links to it as such (`web/src/routes/docs/+page.svelte:112`). Its own §2 declares the docs prose to be *outside* it (`SPEC.md:35`). Its sections are organised by **decision domain** (`§4 Curated vocabularies`, `§8 Keyboard model`); the docs page is organised by **tool** (`#editor`, `#cli`, `#fence`, `#remark`, `#vscode`, `#mcp`). There is no mapping from one to the other that is not a rewrite. Deriving `/docs` from `SPEC.md` would also invert C6: the page would stop *restating* the spec and start *being* it.

**`wayfinder/map*.md` and `wayfinder/tickets/*.md`.** These are a decision record written to argue, not to instruct — a single resolution line runs 600 words and cites four other tickets by path (e.g. `wayfinder/map-views.md:40`). They are addressed to whoever is building the thing next. Rendering them at `/docs` would publish reasoning as documentation.

**`README.md` and the per-tool READMEs (`mcp/README.md` 137 lines, `vscode/README.md` 49 lines).** These are the closest, and it is worth being precise about the gap, because the gap is the argument. `README.md:28` leads the CLI with **"In this checkout it runs through npm"** and puts `npx` second at `:40`; the docs page leads with the **`npx` alias** at `:298` and demotes `npm run bcc` to a field note at `:299–302`. That inversion is deliberate and is exactly the register split ticket 057 recorded: these strings "are read by a developer at a build, and their register is deliberately not §10's" (`wayfinder/tickets/057-remark-plugin.md:64`). A README is written for someone standing in a checkout; `/docs` is written for someone who has not cloned anything.

**Recommendation on source: a dedicated `docs/*.md` set, one file per anchor**, e.g. `docs/site/{editor,canvas-file,exports,cli,fence,remark,vscode,mcp}.md`, with the file name (or frontmatter) carrying the anchor id so the C2 contract is data rather than a slug accident (§7.3). Nothing existing is a coherent source; the honest options are "author a new Markdown set" or "leave the Svelte page alone". **[inferred]**

One thing this buys that nothing else on the list does: `docs/*.md` files can hold **`bcc` fences**, and this project's own remark plugin would draw them. See §7.5 for the one CSP problem with that.

---

## 4. The approaches

### 4.1 A build-time unified pipeline in a SvelteKit load function

Everything needed is already a dependency: `unified@11.0.5`, `remark-parse@11.0.0`, `remark-rehype@11.1.2`, `rehype-stringify@10.0.1` (`package.json:59–66`; versions from `package-lock.json`). All four are at the current npm latest — `unified` 11.0.5 (2024-06-19), `remark-parse` 11.0.0 (2023-09-18), `remark-rehype` 11.1.2 (2025-04-02), `rehype-stringify` 10.0.1 (2024-09-27), from `https://registry.npmjs.org/<pkg>`. They exist for `remark/src/plugin.test.ts:21–24`, which drives the fence plugin through a real pipeline; nothing in the shipped app imports them.

**Vite 8's glob API, verified.** `import.meta.glob` is documented as "a build-time feature"; its `query` option is documented with the literal example "to import assets as a string or as a url: `query: '?raw'` and `query: '?url'`", and its arguments "must be passed as literals" — you "can NOT use variables or expressions in them" ([Vite — Features › Glob Import](https://vite.dev/guide/features)). `?raw` on its own is documented as "Assets can be imported as strings using the `?raw` suffix" ([Vite — Static Asset Handling](https://vite.dev/guide/assets)). The Vite 8 migration guide confirms the version (**8.2.1**, matching the lockfile) and **makes no mention of any change to `import.meta.glob` or to the `?raw`/`?url`/`?inline` suffixes** — its subject is the Rolldown/Oxc switch ([Migration from v7](https://vite.dev/guide/migration)). This repo already uses `?raw` on four files at `web/src/lib/chrome/examples.ts:12–15`.

**Prerendering, verified.** Load functions are "invoked at runtime, unless you prerender the page — in case, it's invoked at build time" ([SvelteKit — Loading data](https://svelte.dev/docs/kit/load)). `adapter-static` "will prerender your entire site as a collection of static files" ([SvelteKit — adapter-static](https://svelte.dev/docs/kit/adapter-static)). So the pipeline runs once, at build, and nothing about it reaches a runtime that does not exist.

**One dev-server gotcha.** Vite's `server.fs.strict` is on by default and "restrict[s] serving files outside of workspace root"; `server.fs.allow` is the escape ([Vite — Server Options](https://vite.dev/config/server-options)). This repo's project root is `web/`, and `web/vite.config.ts:48–51` already carries exactly this workaround for `examples/`. A `docs/` source at the repo root needs the same one-line addition. **[inferred]** from the two facts, not separately measured.

### 4.2 mdsvex

Status as of 2026-08-15, from the project's own repo and the registry:

- Latest is **0.12.8**, published **2026-07-19** (`https://registry.npmjs.org/mdsvex`, `dist-tags.latest` + `time`). Release cadence: five releases in the last 24 months.
- `peerDependencies: { "svelte": "^3.56.0 || ^4.0.0 || ^5.0.0-next.120" }`; **no `engines` field**. Runtime deps include `unist-util-visit@^2` and `vfile-message@^2` — several majors behind the unified 11 line this repo is on; the dependabot PRs to move them have been open since 2026-04-13 ([open PRs](https://github.com/pngwn/MDsveX/pulls)).
- **Svelte 5**: the peer range was widened in [PR #599](https://github.com/pngwn/MDsveX/pull/599) (2024-04-29); the "Svelte 5 support" tracking [issue #555](https://github.com/pngwn/MDsveX/issues/555) is closed, but was closed by the *reporter*, not a maintainer. The 0.12.5 changeset claims "Ensure that mdsvex files and layouts can contain Svelte 5 syntax" ([CHANGELOG](https://github.com/pngwn/MDsveX/blob/main/packages/mdsvex/CHANGELOG.md)). Neither README mentions Svelte 5.
- **Runes**: this is the load-bearing detail for this repo, which forces `runes: true` for every non-`node_modules` file (`web/vite.config.ts:12–13`). mdsvex's **default** layout prop forwarding emits `{...$$props}`, which is a hard error in runes mode — [issue #738](https://github.com/pngwn/MDsveX/issues/738), "Cannot use `$$props` in runes mode". Fixed only in **0.12.8**, and only behind an **opt-in flag**: `layoutPropForwarding: "legacy" | "runes" = "legacy"` ([PR #810](https://github.com/pngwn/MDsveX/pull/810); the docs source at [`_docs.svtext`](https://github.com/pngwn/MDsveX/blob/main/packages/site/src/routes/_docs.svtext)).
- **Svelte 5.53.0 broke mdsvex 0.12.6** outright (crash on a `//` comment in a script block) — [issue #778](https://github.com/pngwn/MDsveX/issues/778), fixed in 0.12.7. This repo resolves `svelte@5.56.8`, so 0.12.8 is the only viable pin.
- Still open: [#649](https://github.com/pngwn/MDsveX/issues/649) — mdsvex emits `<script context="module">`, deprecated in Svelte 5, open since 2024-08-25; the fix [PR #773](https://github.com/pngwn/MDsveX/pull/773) was **closed unmerged** on 2026-07-17 as "a breaking change… we'll have to wait for the 1.0 release". [#815](https://github.com/pngwn/MDsveX/issues/815), filed 2026-08-07, zero comments: custom component overrides fail on Svelte 5.
- Maintenance: last `main` commit 2026-07-19 (a release bot); last substantive commit 2026-07-17. **163 open issues**, 11 open PRs, single maintainer. The 1.0 rewrite lives on the `next` branch, last touched **2026-06-14**, nothing published. The maintainer's own statement ([discussion #593](https://github.com/pngwn/MDsveX/discussions/593#discussioncomment-14904627), 2025-11-07): a 1.0 with a new parser, highlighter, LSP, formatter and website, "my target is to have the technical work done around the end of the year with a launch early in the new year" — a target that has slipped.
- **CSP**: mdsvex's `<script>` blocks are Svelte SFC blocks consumed by the compiler; they become module JS and never appear as inline `<script>` in served HTML, so they need no hash. Code fences become `{@html}` around Prism-highlighted `<code>`, which contains no script or style. It injects no `<style>` of its own — you import a Prism theme yourself. Prerender/hydration behaviour is **[unverified]** against any project statement; mechanically the output is an ordinary component. **[inferred]**

Verdict: adoptable, but it would be this project's first dependency on a single-maintainer package with 163 open issues, taken to solve a problem the project's existing dependencies already solve, and it would arrive pinned to an exact patch with a required non-default flag and a known deprecation warning the upstream has deferred to an unscheduled 1.0. `@sveltek/markdown` (0.30.1, 2026-03-10, 21 stars, no activity in five months) is the only alternative named anywhere in mdsvex's own threads and is younger and smaller.

### 4.3 A Vite plugin compiling `.md` at build time

Two shapes: `.md` → Svelte component source (which is what mdsvex is, as a preprocessor rather than a plugin), or `.md` → a module exporting an HTML string. The second needs no plugin at all — `import.meta.glob(..., { query: '?raw' })` plus a pipeline is the same thing with fewer moving parts, and Vite's own docs present `query: '?raw'` as the sanctioned way to do it. A plugin buys HMR granularity on `.md` edits and nothing else here. **[inferred]**

### 4.4 Generating the HTML ahead of the build

This is the shape the repo already speaks: `build:render`, `build:cli`, `build:remark`, `build:vscode`, chained by `build:bundles` (`package.json:29–33`), each writing a committed artifact that a test diffs against a fresh build (`remark/build.js:19–22`). A `build:docs` writing `web/src/lib/docs/*.html` from `docs/*.md` would fit that idiom exactly.

What it buys: the pipeline never enters the app's dependency graph at all, and the generated HTML is reviewable in a diff. What it costs: another committed artifact and another staleness test, on a source that changes every time the prose does — which is far more often than `CanvasSheet.svelte` changes. The committed-bundle idiom exists because "an install (or a `.vsix`) runs no build step" (`README.md:132`); a site's own docs have no such constraint, since `npm run build` always runs. **[inferred]** — the idiom's justification does not transfer.

### 4.5 The unified ecosystem, per sub-problem

All versions from `https://registry.npmjs.org/<pkg>`, checked 2026-08-15; compatibility from each project's own README "Compatibility" section.

| Package | Latest | Published | Notes |
|---|---|---|---|
| `rehype-slug` | 6.0.0 | 2023-08-31 | "unified version 4+" ([README](https://github.com/rehypejs/rehype-slug#compatibility)) |
| `github-slugger` | 2.0.0 | 2022-10-27 | zero deps; last commit is the 2.0.0 release commit |
| `rehype-autolink-headings` | 7.1.0 | 2023-11-08 | declares `unified: ^11.0.0` as a direct dependency |
| `rehype-sanitize` | 6.0.0 | 2023-08-26 | "unified version 6+" |
| `rehype-raw` | 7.0.0 | 2023-08-26 | parse5-based; `passThrough`, `tagfilter` |
| `rehype-starry-night` | 2.2.0 | 2024-10-11 | class-only output; async transform |
| `@shikijs/rehype` | 4.4.3 | 2026-08-10 | inline `style=` output; `engines.node >= 20` |
| `rehype-highlight` | 7.0.2 | 2025-02-03 | class-only output; **sync** |
| `remark-toc` | 9.0.0 | 2023-09-20 | injects a TOC into the body under a matching heading |
| `mdast-util-toc` | 7.1.0 | 2024-06-02 | returns a TOC rather than injecting |
| `hast-util-heading-rank` | 3.0.0 | 2023-08-02 | `headingRank(node) => number \| undefined` |
| `rehype-shiki` | 0.0.9 | **2020-07-29** | **dead** — unified-8 era, `unist-util-visit@^2` |
| `rehype-toc` | 3.0.2 | **2020-07-18** | **dead** — CommonJS, `engines.node >=10`, predates the ESM migration |

Notes that matter here:

- **`rehype-slug` respects an existing `id`.** Its published `lib/index.js` guards on `!node.properties.id`, and the README says it "looks for headings… that do not yet have `id`s" ([README](https://github.com/rehypejs/rehype-slug#what-is-this)). Its only option is `prefix`. It calls `slugs.reset()` at the start of every transform, so ids are deterministic across documents and across runs.
- **`github-slugger`'s algorithm**, verbatim from [`index.js`](https://github.com/Flet/github-slugger/blob/master/index.js): lowercase unless `maintainCase`, delete every character matching a generated Unicode punctuation class, then replace spaces with `-`. Punctuation is **removed, not replaced** (`a.b` → `ab`, `C++` → `c`). Collisions get `-1`, `-2`. Two footguns worth knowing: non-ASCII letters are preserved (`Über Ström & Co.` → `über-ström--co`), and a leading emoji leaves a leading hyphen (`😄 emoji heading` → `-emoji-heading`).
- **`rehype-autolink-headings` requires ids to exist already** — "Use `rehype-slug` to generate `id`s for headings that don't have them" ([README](https://github.com/rehypejs/rehype-autolink-headings#notes)). `behavior` defaults to `'prepend'`; default `content` is `<span class="icon icon-link"></span>`, i.e. it assumes a CSS hook you must ship.
- **There is no maintained rehype TOC plugin.** `remark-toc@9.0.0` is the maintained option but injects into the body under a placeholder heading, which is the wrong shape for this page's sticky sidebar nav. `mdast-util-toc@7.1.0` returns a structure instead. The cheapest correct answer for a sidebar is ~15 lines over `hast-util-heading-rank` after `rehype-slug`, reading the *final* ids off the tree. **[inferred]**
- **Highlighting.** `rehype-starry-night` and `rehype-highlight` emit class names; `@shikijs/rehype` emits inline `style=` on `<pre>` and every `<span>`, including in dual-theme mode where the inline styles carry `--shiki-light`/`--shiki-dark` custom properties. All three are build-time with zero client JS.

**Precedent worth knowing:** `svelte.dev` itself does not use mdsvex or a rehype pipeline for its docs. It uses `marked@^17` with a **custom heading renderer** and `shiki@^4` with a CSS-variables theme (`packages/site-kit/package.json`; `packages/site-kit/src/lib/markdown/renderer.ts:602–610`, which emits `<h${depth} id="${slug}"><span>${html}</span><a href="#${slug}" class="permalink">…`, slugged by its own `slugify` and joined across heading depths). That is a first-party build-time renderer with hand-controlled anchor ids — structurally the same answer this note reaches, arrived at independently by the framework's own team.

---

## 5. Measured: what each shape actually costs in this build

Four temporary routes were added under `web/src/routes/`, built with `npm run build`, measured, and removed; `build/` and `web/.svelte-kit/` are gitignored (`.gitignore`) so nothing tracked moved, and `git status` was clean afterwards. The route sources are kept at `.scratch/markdown-derived-docs/`. All four render `docs/research/*.md` (the two existing files, ~92 KB of Markdown) through `remarkParse → remarkRehype → rehypeStringify` and `{@html}` the result.

| Shape | Prerendered HTML | Inline `<script>` bytes | Route's client chunk | Other output |
|---|---|---|---|---|
| **Universal load** (`+page.ts`) | 107,081 | 473 (SvelteKit's own) | **117,740** (the pipeline) **+ 91,502** (a shared chunk of the raw sources) | — |
| **Server load** (`+page.server.ts`) | **226,948** | **120,412** | 424 | `__data.json`, 121,357 |
| **Module-scope glob, no pipeline** (stands in for a prebuilt HTML string) | 92,037 | 473 | 649 **+ 91,502** (same shared chunk) | — |
| **Server load + `export const csr = false`** | 105,868 | **0** | none | `__data.json`, 121,357 (never fetched) |
| *(reference)* today's hand-authored `/docs` | 35,800 | 473 | 30,531 | — |

Five things fall out of this, and they are the substance of the recommendation:

1. **A universal load ships the whole Markdown pipeline to the browser.** `micromark` appears in exactly one client chunk, the universal route's (`grep -c micromark` over `build/_app/immutable/nodes/*.js`: 1 hit, node 8, 117,740 bytes). The load function runs "again during hydration" ([SvelteKit — Loading data](https://svelte.dev/docs/kit/load)), so the parser has to be there. This is the option most people reach for first and it is the worst one here.
2. **A server load doubles the page.** The rendered HTML is in the body *and* serialized into SvelteKit's inline bootstrap script — 120 KB of inline script for 106 KB of content — and `adapter-static` additionally writes a `__data.json` of the same payload.
3. **`csr = false` removes the inline script entirely**, and with it the page's CSP hash: `rmd-nocsr.html`'s policy is `script-src 'self' https://static.cloudflareinsights.com` with **no `sha256-`** at all. It also removes the page's JavaScript, which would take the scroll-spy with it (`web/src/routes/docs/+page.svelte:36–48`).
4. **Content in the client chunk is the status quo, not a regression.** Today's `/docs` already ships its entire prose to the browser as compiled template strings: 30,531 bytes for a 35,800-byte page. A prebuilt-HTML-string approach ships the same order of bytes, in a chunk that is content-hashed and served under the immutable-year rule (`web/static/_headers:13–14`).
5. **The CSP hash is build-dependent.** Two builds of byte-identical source produced byte-identical `docs.html` (35,800 both times) with **different** hashes (`sha256-dySXKKQZW1ea…` → `sha256-ElSNDEt1Xlby…`), because SvelteKit's bootstrap script embeds a per-build `__sveltekit_<id>` and the hashed chunk filenames. This is exactly why the policy cannot live in `_headers`, and it is the reason C4 exists rather than a restatement of it.

---

## 6. Measured: what the CSP does and does not cover

The load-bearing sentence, from SvelteKit's own configuration reference: "SvelteKit will augment the specified directives with nonces or hashes (depending on mode) **for any inline styles and scripts it generates**" ([SvelteKit — Configuration › csp](https://svelte.dev/docs/kit/configuration#csp)). The same section: "When pages are prerendered, the CSP header is added via a `<meta http-equiv>` tag (note that in this case, `frame-ancestors`, `report-uri` and `sandbox` directives will be ignored)" — which the W3C spec confirms independently ([CSP Level 3 §3.3](https://www.w3.org/TR/CSP3/)).

A fifth probe route settled what "it generates" means, because the answer decides whether several of these approaches are viable at all. A page with three inline scripts — one in `<svelte:head>`, one injected through `{@html}`, and SvelteKit's own bootstrap — produced a policy with **exactly one** hash:

```
0  sha256-cg7QuUQUb7z6gAz/ftCxoIHP6gcJ/zlPrhaDYLpJjQs=   "window.__headProbe = 1;"        (from <svelte:head>)
1  sha256-BI/knjwg2Zh64YPgXvu5e2SHXPed36Pl1UIlHSTH6bU=   "window.__probe = 1;"            (from {@html})
2  sha256-dQPPzI4tgBJfvv2tvbNsEqt4pd7K+nvEn830dOrWE1w=   "\n\t\t\t\t{\n\t\t\t\t\t__svelt…" (SvelteKit's own)

CSP: script-src 'self' https://static.cloudflareinsights.com 'sha256-dQPPzI4tgBJfvv2tvbNsEqt4pd7K+nvEn830dOrWE1w='
```

**Only #2 is hashed.** Scripts #0 and #1 would be blocked in the browser. So:

- **Any approach that puts an inline `<script>` into the page — whether from Markdown raw HTML, a highlighter, a TOC helper, or a copy-button snippet — is dead on arrival**, and it fails silently at build time and loudly at runtime. There is no supported hook for adding a hash to SvelteKit's computed policy; the only sanctioned manual affordance is `%sveltekit.nonce%` in `app.html`, and nonces are "insecure and therefore forbidden" for prerendered pages ([same section](https://svelte.dev/docs/kit/configuration#csp)).
- **Inline `<style>` and `style=` are fine**, because `style-src` carries `'unsafe-inline'` (`web/vite.config.ts:35`) and `style-src-attr` falls back to `style-src` when absent ([CSP3 §6.1](https://www.w3.org/TR/CSP3/)). This is already load-bearing for the homepage's `style=` custom properties (`web/vite.config.ts:25–27`) and was verified live in production (commit `239b38a`).
- **`font-src 'self'` has no `data:`** (`web/vite.config.ts:37`). See §7.5.

---

## 7. The constraint questions, answered

### 7.1 CSP

| Approach | Adds inline script? | Verdict |
|---|---|---|
| unified pipeline in a load function | No — the rendered HTML is markup, and SvelteKit's payload script is its own and is hashed (§5, §6) | **Safe** |
| Prebuild script writing HTML | No | **Safe** |
| Vite plugin → HTML string | No | **Safe** |
| mdsvex | No — its `<script>` blocks are SFC blocks compiled away; its code fences are `{@html}` around `<code>` | **Safe**, on this axis |
| `@shikijs/rehype` | No script; inline `style=` only | **Safe** under C5, but see 7.4 |
| `rehype-sanitize`'s own remedy for its `user-content-` id rewriting | **Yes — a client-side `hashchange` script** ([README](https://github.com/rehypejs/rehype-sanitize#example-headings-dom-clobbering)) | **Blocked** unless moved into a real module |
| Any Markdown source containing a raw `<script>` | Yes | **Blocked**, silently at build |

### 7.2 Static export

Every approach here runs at build time and emits static HTML; `adapter-static` "will prerender your entire site as a collection of static files" and load functions are "invoked at build time" when the page is prerendered ([adapter-static](https://svelte.dev/docs/kit/adapter-static); [load](https://svelte.dev/docs/kit/load)). Measured: all four probe routes prerendered without touching `adapter-static`'s options or `strict` mode (§5). Nothing here needs a server, and nothing here changes C1.

### 7.3 The anchor id contract

This is where the naive answer fails, and it fails concretely.

The eight ids are hand-chosen short nouns on `<section>` elements, not slugs of the headings above them. Run the actual headings through `github-slugger` and only one of eight survives:

| Section title | id today | `github-slugger` would give | Match |
|---|---|---|---|
| The editor | `editor` | `the-editor` | ✗ |
| The Canvas file | `canvas-file` | `the-canvas-file` | ✗ |
| Exports | `exports` | `exports` | ✓ |
| The command line | `cli` | `the-command-line` | ✗ |
| The `bcc` fence | `fence` | `the-bcc-fence` | ✗ |
| The remark plugin | `remark` | `the-remark-plugin` | ✗ |
| The VS Code extension | `vscode` | `the-vs-code-extension` | ✗ |
| The MCP server & plugin | `mcp` | `the-mcp-server--plugin` | ✗ |

(Slug derivations follow the algorithm quoted in §4.5: `&` is a stripped character, not a replaced one, which is where the double hyphen in the last row comes from.)

Three ways to keep the contract, in increasing order of how much they trust a library:

1. **Keep the ids in the Svelte shell.** The `sections` array (`web/src/routes/docs/+page.svelte:21–30`) already *is* the contract — id, chip, label, title in one table. If Markdown supplies only each section's body, the `<section id=…>` wrapper and the nav are untouched and the contract is unchanged and still typechecked. **This is the option that cannot break C2.**
2. **`remark-custom-header-id@1.0.0`** (sindresorhus, published 2024-05-28; deps `@types/unist@^3`, `unist-util-visit@^5`) supports `# Header {#custom-id}` and two MDX-safe variants, emitting `<h1 id="custom-id">Foo</h1>` ([readme](https://github.com/sindresorhus/remark-custom-header-id)). It moves the contract into the Markdown, where a typo is a broken homepage link rather than a compile error. Note it is a single-purpose 1.0.0 from outside the unified collective.
3. **Raw HTML in the Markdown** — `<section id="editor">` written out — which then needs `rehype-raw@7.0.0` for any later rehype plugin to see inside it. Measured by the plugin research: without `rehype-raw`, a `<h2>` living in a raw HTML block is invisible to `rehype-slug` and gets no id at all.

`rehype-slug` is safe to add in all three cases *because* it respects existing ids (§4.5) — it fills in the `<h3>`s inside a section without touching the section's own id.

### 7.4 Sanitisation

The source is first-party, in-repo, and reviewed in the same PR as everything else. `rehype-sanitize`'s own README frames the choice honestly: raw HTML strings are fine "if your final result is HTML and you trust content" ([rehype-raw README](https://github.com/rehypejs/rehype-raw)).

Against that, the measured cost of turning it on with defaults is not small:

- The default schema is GitHub's, re-exported from `hast-util-sanitize@5.0.2`. It sets `clobber: ['ariaDescribedBy','ariaLabelledBy','id','name']` with `clobberPrefix: 'user-content-'`, so **`id="editor"` becomes `id="user-content-editor"`** — which breaks C2 outright, and breaks it for the *homepage's* links, not just internal ones.
- `className` is **stripped everywhere** except seven narrow cases (`code`→`/^language-./`, `li`→`task-list-item`, and five others), so a class-based highlighter goes monochrome and the autolink icon's `class="icon icon-link"` hook disappears.
- `style` is stripped everywhere, so Shiki's inline-style output flattens to unstyled `<span>`s.
- The upstream fix for its own id rewriting is a client-side `hashchange` script — blocked by C3 as an inline script (§6, §7.1).

**Recommendation: no `rehype-sanitize`.** It buys nothing against a first-party source, it collides head-on with the one contract this page has, and disabling enough of it to be harmless (`clobber: []` plus a `className` allowlist per highlighter) leaves a schema that must be maintained in step with every plugin added downstream. The honest defence-in-depth here is a test that fails if any generated docs HTML contains `<script`, which costs three lines and cannot break an anchor.

### 7.5 The existing `remark/` package — overlap and reuse

`remark/` is **not** a Markdown renderer and does not overlap with any pipeline described above. It is one `code`-node transformer: it walks mdast for `code` nodes whose `lang` is `bcc`, replaces each with a raw `html` node from `renderFence()`, and puts a message on the VFile (`remark/src/plugin.ts:97–150`; the split is recorded at `wayfinder/tickets/057-remark-plugin.md:30`). The grammar, resolution, placeholder and preamble all live in `web/src/lib/fence/fence.ts`.

It would, however, **compose** with a docs pipeline, and that is genuinely attractive: `docs/*.md` holding `bcc` fences would let the site's own docs draw real canvases from the committed `examples/*.bcc.json`, through the same adapter the docs page *describes*. Two concrete facts before anyone tries it:

- **`font-src 'self'` blocks it.** `fencePreamble()` emits `<style>` blocks whose `@font-face` rules use `url(data:font/woff2;base64,…)` (`web/src/lib/fence/fence.ts:98–100`; the data URIs are in `web/src/lib/render/dist/render.js`), and the site's policy has `font-src 'self'` with no `data:` (`web/vite.config.ts:37`). The `<style>` itself is fine under `style-src 'unsafe-inline'`; the fonts inside it are not. The sheet would draw in a fallback face — the same failure the Docusaurus work already met from a different cause (`wayfinder/tickets/057-remark-plugin.md:36`). Fixing it means adding `data:` to `font-src`, which widens a directive for the site at large.
- The plugin imports `$lib/fs/root` and `$lib/fence/fence` (`remark/src/plugin.ts:28–29`) and reads the filesystem synchronously — fine in a build, and it caches an opened root across documents (`:98–101`).

For a docs page whose §fence section already shows the sheet as a committed `.bcc.svg` through `<img>` (`web/src/routes/docs/+page.svelte:17,357` — allowed by `img-src 'self'`), the fence route buys authenticity at the price of a policy widening. **[inferred]** Not worth it at first pass.

---

## 8. Comparison

| | Universal load | Server load | Server load + `csr=false` | Prebuild script | mdsvex |
|---|---|---|---|---|---|
| C1 static export | ✓ | ✓ | ✓ | ✓ | ✓ |
| C3 no inline script | ✓ | ✓ | ✓ (no hash at all) | ✓ | ✓ |
| C2 anchor ids | shell keeps them | shell keeps them | shell keeps them | shell keeps them | shell keeps them |
| Scroll-spy survives | ✓ | ✓ | **✗** | ✓ | ✓ |
| Client JS added | **+209 KB** | +0 | none | +0 to +92 KB | Svelte-compiled, comparable to today |
| Prerendered HTML | 107 KB | **227 KB** | 106 KB | ~92 KB | ~ today |
| New dependencies | 0 | 0 | 0 | 0 | **1**, pinned exact, single-maintainer |
| New committed artifact | no | no | no | **yes** + staleness test | no |
| Fits an existing repo idiom | `?raw` at `examples.ts:12–15` | — | — | `build:*` at `package.json:29–33` | — |

---

## 9. Recommendation

**Do it with a build-time unified pipeline over a new `docs/*.md` set, run in a `+page.server.ts` load, with the page's Svelte shell keeping the eight `<section id=…>` wrappers, the chip table and the nav.** Concretely:

- **Source:** `docs/site/{editor,canvas-file,exports,cli,fence,remark,vscode,mcp}.md`, one file per anchor, the file's basename *being* the anchor id. Nothing existing is a coherent source (§3): `SPEC.md` is organised by decision domain and declares this copy outside itself (`SPEC.md:35`), the wayfinder maps are argument rather than instruction, and the READMEs are deliberately in a different register (`wayfinder/tickets/057-remark-plugin.md:64`, and the inverted CLI emphasis at `README.md:28` vs `web/src/routes/docs/+page.svelte:298`).
- **Pipeline:** `remarkParse → remarkRehype({ allowDangerousHtml: true }) → rehypeRaw → rehypeSlug → rehypeStringify`, using the four packages already pinned plus `rehype-slug@6.0.0` and `rehype-raw@7.0.0`. No `rehype-sanitize` (§7.4). No highlighter at first pass — the page's code blocks are shell transcripts and config snippets, currently coloured by hand-placed spans (`web/src/routes/docs/+page.svelte:309–313`); if one is wanted later, `rehype-starry-night@2.2.0` or `rehype-highlight@7.0.2` for class-based output, never `@shikijs/rehype`'s inline styles, which sanitisation and any future `style-src` tightening would both destroy.
- **Placement:** `+page.server.ts`, not `+page.ts`. Measured: a universal load ships 209 KB of parser and sources to the browser to redo work already done at build (§5, finding 1). The cost is a 227 KB prerendered page against 107 KB, which is the price of not shipping a Markdown parser to a reader.
- **Shell keeps the contract.** The `sections` array stays exactly where it is (`web/src/routes/docs/+page.svelte:21–30`); Markdown supplies section bodies only. C2 then cannot be broken by a slugger, a sanitiser, or a renamed heading.
- **Guard:** one test asserting no `<script` appears in any generated docs HTML, and one asserting all eight ids are present in the built `build/docs.html`. Both are cheap and both catch the two failures that are silent at build and fatal in the browser (§6).

### The honest objections

1. **This does not remove the Svelte page; it halves it.** Everything in §2's table stays hand-authored — the chips, the field notes, the filecards, the two-card export grid, the term transcripts, 173 lines of scoped CSS. The maintenance saving is confined to the running prose, which is roughly 40 `<p>`, 15 `<h3>`, 14 `<li>` and one table. That is a real saving for whoever edits copy, and a poor return if the goal was "delete the Svelte page".
2. **It creates a second place the docs live, before it removes the first.** Until every section's body has moved, `/docs` is half Markdown and half markup, and "which file do I edit" gets one more possible answer. A migration that stalls halfway is worse than either endpoint.
3. **It costs 120 KB of duplicated payload per page**, because a server load's data is serialized into the HTML *and* written to `__data.json` (§5, finding 2). The current page is 35.8 KB. Whether that matters for a docs page on a static host with immutable caching is a judgement, not a fact; it is measurably worse than today on the one metric this repo has measured before.
4. **`csr = false` is the option that dominates on every axis except one**, and that one is the scroll-spy (`web/src/routes/docs/+page.svelte:36–48`). It would produce a page with zero JavaScript, zero inline scripts and no CSP hash at all (§5, finding 3). If the sticky-nav highlight can be done in CSS — or dropped — that is strictly the better answer, and it is a design question rather than a research one. It deserves being asked before any of this is built.
5. **The whole thing may be solving a problem that is not there.** SPEC.md:35 already declares this copy documentary and outside the spec; the page's own comment already says it is an arrangement, not a source of truth. The drift risk the Markdown move would guard against is drift between the docs page and the READMEs — and nothing proposed here removes that, because the READMEs stay separate files in a different register. The only version that removes it is one where `/docs` and the READMEs are generated from one source, and §3 argues that source does not and should not exist.

---

## 10. What could not be verified, and what would settle it

- **mdsvex's prerender/hydration behaviour.** Neither the docs, the README, nor any issue makes a statement about it; that its output prerenders like any component is inference from the emitted source. **Settle by:** adding `mdsvex@0.12.8` with `layoutPropForwarding: 'runes'` to a scratch copy of `web/` and running the same probe as §5.
- **`@shikijs/rehype`'s options.** Its registry README is a five-line stub pointing at `shiki.style`, outside the primary-source set used here; the option list came from the shipped `dist/types-*.d.mts`. Type declarations are primary, prose docs were not read. Not load-bearing — the recommendation rejects Shiki on the inline-style ground, which was measured directly.
- **The dev-server path for a repo-root `docs/`.** `server.fs.strict` and the existing `../examples` allowance (`web/vite.config.ts:48–51`) make the fix obvious, but only the *build* was measured; `vite dev` was not run against a `docs/` glob. **Settle by:** `npm run dev` with the glob in place, one page load.
- **Whether a `bcc` fence in the site's own docs actually fails on fonts.** The chain is verified fact by fact — data-URI `@font-face` in the preamble, `font-src 'self'` in the policy — but no browser was driven against a page containing one. **Settle by:** the existing `.scratch/csp/probe.mjs`, pointed at a build with one fence on `/docs`.
- **Why the CSP hash changes between builds of identical source.** Measured (§5, finding 5) and attributed to the per-build `__sveltekit_<id>` and chunk filenames embedded in the bootstrap script; the mechanism generating that id was not traced to SvelteKit's source. The consequence — a header CSP is impossible — is independently stated in `web/static/_headers:3–7` and in SvelteKit's own docs.
- **Whether the scroll-spy can be replaced in CSS.** Not researched; it is the hinge of objection 4.

---

## Sources

- **Vite 8.2.1**: [Features › Glob Import](https://vite.dev/guide/features) · [Static Asset Handling](https://vite.dev/guide/assets) · [Server Options › `server.fs`](https://vite.dev/config/server-options) · [Migration from v7](https://vite.dev/guide/migration)
- **SvelteKit 2.70.2**: [Configuration › `csp`](https://svelte.dev/docs/kit/configuration#csp) · [Page options › prerender / ssr / csr](https://svelte.dev/docs/kit/page-options) · [Loading data](https://svelte.dev/docs/kit/load) · [adapter-static](https://svelte.dev/docs/kit/adapter-static)
- **W3C**: [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/) — §3.3 (meta delivery), §6.1 (`style-src` / `style-src-attr`)
- **mdsvex**: [repo](https://github.com/pngwn/MDsveX) · [CHANGELOG](https://github.com/pngwn/MDsveX/blob/main/packages/mdsvex/CHANGELOG.md) · [docs source](https://github.com/pngwn/MDsveX/blob/main/packages/site/src/routes/_docs.svtext) · issues [#555](https://github.com/pngwn/MDsveX/issues/555), [#649](https://github.com/pngwn/MDsveX/issues/649), [#738](https://github.com/pngwn/MDsveX/issues/738), [#778](https://github.com/pngwn/MDsveX/issues/778), [#815](https://github.com/pngwn/MDsveX/issues/815) · PRs [#599](https://github.com/pngwn/MDsveX/pull/599), [#773](https://github.com/pngwn/MDsveX/pull/773), [#810](https://github.com/pngwn/MDsveX/pull/810) · [discussion #593](https://github.com/pngwn/MDsveX/discussions/593#discussioncomment-14904627) · [registry](https://registry.npmjs.org/mdsvex)
- **unified ecosystem**: [rehype-slug](https://github.com/rehypejs/rehype-slug) · [github-slugger](https://github.com/Flet/github-slugger) · [rehype-autolink-headings](https://github.com/rehypejs/rehype-autolink-headings) · [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) · [hast-util-sanitize schema](https://github.com/syntax-tree/hast-util-sanitize/blob/main/lib/schema.js) · [rehype-raw](https://github.com/rehypejs/rehype-raw) · [rehype-starry-night](https://github.com/rehypejs/rehype-starry-night) · [rehype-highlight](https://github.com/rehypejs/rehype-highlight) · [remark-toc](https://github.com/remarkjs/remark-toc) · [mdast-util-toc](https://github.com/syntax-tree/mdast-util-toc) · [hast-util-heading-rank](https://github.com/syntax-tree/hast-util-heading-rank) · [remark-custom-header-id](https://github.com/sindresorhus/remark-custom-header-id) · versions and dates from `https://registry.npmjs.org/<pkg>`
- **Precedent**: [`sveltejs/svelte.dev`](https://github.com/sveltejs/svelte.dev) — `packages/site-kit/package.json` (marked 17, shiki 4), `packages/site-kit/src/lib/markdown/renderer.ts`, `apps/svelte.dev/src/lib/server/renderer.ts`
- **This repo**: `SPEC.md:34–36` · `CONTEXT.md:21,25` · `README.md:28–46,132–140` · `package.json:18–19,29–33,49–67` · `web/vite.config.ts:12–13,19,21–44,48–51` · `web/src/routes/+layout.ts:1` · `web/src/routes/+page.svelte:61–66` · `web/src/routes/docs/+page.svelte` (whole) · `web/src/lib/chrome/examples.ts:12–15` · `web/src/lib/fence/fence.ts:90–100` · `web/src/lib/render/dist/render.js` · `web/static/_headers` · `web/static/404.html:9–12` · `remark/src/plugin.ts:28–29,97–150` · `remark/build.js:1–23` · `remark/src/plugin.test.ts:21–24` · `wayfinder/map-views.md:26,61` · `wayfinder/tickets/013-pages-deploy-mechanics.md:32` · `wayfinder/tickets/016-web-analytics.md:34,37` · `wayfinder/tickets/057-remark-plugin.md:30,36,64` · probe routes at `.scratch/markdown-derived-docs/`
