# Research: Published example Bounded Context Canvases — sources, quality guidance, licensing

Resolves wayfinder ticket [019-example-canvas-sources](../../wayfinder/tickets/019-example-canvas-sources.md).
Feeds [020-example-roster](../../wayfinder/tickets/020-example-roster.md).

Researched 2026-08-09. All findings grounded in primary sources fetched directly:
the `ddd-crew/bounded-context-canvas` repo (commit
[`4ae5994`](https://github.com/ddd-crew/bounded-context-canvas/commit/4ae59945a9baeeb365dafbfef86e92af8a34616d),
pushed 2026-05-17 — the current `main` HEAD at research time), the canvas authors' own Medium
posts, and creativecommons.org (BY 4.0 legalcode, attribution wiki, FAQ). Example images were
downloaded from `raw.githubusercontent.com` and read directly. Anything not directly observed
is marked **unverified**.

## Question

Three questions for our shipped-examples work: (1) what example canvases have been published,
by whom, how complete, and on which canvas revision; (2) what does ddd-crew guidance say makes
section content good; (3) what attribution does CC licensing add if we derive from a published
example, versus inventing our own domains.

## 1. Survey of published example canvases

### 1.1 The ddd-crew repo itself

There is **no `examples/` directory**. The full repo tree (fetched via the git trees API,
recursive) contains exactly one complete filled example plus one fragment:

- **`resources/BCCanvasExample.jpg`** — the "Scoring" canvas, linked from the README's
  [Example section](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/README.md#example).
  Domain: **retail mortgage credit scoring** ("Provide a fully automated, highly trustable and
  reliable assessment of the approvability of a credit application for retail mortgage loans").
  **V5** (version stamp + CC BY badge printed on the canvas itself). **All eleven sections
  filled**, sparsely: classification `core`/`compliance`/`custom built`; one domain role
  (`execution context`); three inbound lanes (Application Entry, Document Check, Real Estate
  Rating — each one event); two ubiquitous-language terms (Rule Cluster, Scoring Result) with
  1–2-line definitions; three business-decision cards (KO Criteria, Point Based Rules, scoring
  result rule); five outbound message stickies to four collaborators (Document Check, Credit
  Decision, Core Banking System, Credit Agency — the last two drawn as external systems);
  three assumptions; two **quantified** verification metrics ("95% of changes will affect both
  pre- and main scoring…", "75% of changes to the application form will have no impact on
  Scoring"); one open question ("Should there be a score color 'yellow' for errors?").
  Authorship from commit history: added by **Maxime Sanglan-Charlier**
  ([`d2efeb8`](https://github.com/ddd-crew/bounded-context-canvas/commit/d2efeb86aa), 2021-10-17,
  "Added BC canvas filled-in example", then V4), updated to V5 by **Michael Plöd**
  ([`4436a50`](https://github.com/ddd-crew/bounded-context-canvas/commit/4436a5090d), 2022-11-20).
  Permalink: [BCCanvasExample.jpg](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/BCCanvasExample.jpg).
- **`resources/collaborator-example.jpeg`** — a **fragment** (inbound-communication panel only)
  illustrating swimlanes and relationship types: a showroom-management context receiving
  "Find nearest showroom", "Get showroom details", "Close showroom" from a company website
  (relationship `CF`) and "Sale Complete", "Refund Requested", "Quotation Produced" from a
  Sales Context (`PNR`), with `OHS`/`PNR` on the receiving side. Not a full canvas.
  [Permalink](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/collaborator-example.jpeg).

The translated "filled" images (`translations/de|fr|pt/.../…-v5-*.jpg` without `-blank`) are
**not examples** — inspected directly, they are templates with placeholder stickies
(`<Fachbegriff>`, `<Terme du Domaine>`, `<Consulta>`) and grey how-to prose in each section.

### 1.2 Canvas authors' posts and talks

- **Nick Tune, ["Modelling Bounded Contexts with the Bounded Context Design Canvas: A Workshop
  Recipe"](https://medium.com/nick-tune-tech-strategy-blog/modelling-bounded-contexts-with-the-bounded-context-design-canvas-a-workshop-recipe-1f123e592ab)**
  (Medium, 2019-07-22). Shows the **V1** canvas filled progressively across workshop
  activities (overview → +rules/language → +capabilities → complete with dependencies).
  Domain: explicitly fictional ("this is a purely fictional domain; any likenesses are
  unintended"); no real business named, context names not legible from text. Three
  progressive examples plus one complete canvas.
- **Nick Tune, ["Bounded Context Canvas V3: Simplifications and
  Additions"](https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-v2-simplifications-and-additions-229ed35f825f)**
  (URL slug says `v2` — title later renamed; the README links this slug as the V3 article).
  Introduces V3 (Model Traits section, messages split by type consumed/produced). **No filled
  example** — template only.
- **Nick Tune, ["Bounded Context Canvas Recipe: Use Case
  Swimlanes"](https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-recipe-use-case-swimlanes-11ca647175d3)**
  (2020-10-03; linked from the README as an alternative format). Reorganizes the V4
  communication sections into one swimlane per use case (*message in → decisions → messages
  out*). Examples: a **booking** domain (availability / make booking / cancel booking
  swimlanes) and an **Onboarding ↔ Profile** fragment illustrating chatty interactions.
  Partial canvases — communication + decisions only.
- **Kenny Baas-Schwegler** (listed canvas contributor), ["Extending the Bounded Context Canvas
  with BDD Examples"](https://baasie.com/2020/03/09/extending-the-bounded-context-canvas-with-bdd-examples/)
  (2020-03-09; 301s to weave-it.org; linked from the README's Additional Resources via its
  [Xebia mirror](https://xebia.com/blog/extending-the-bounded-context-canvas-with-bdd-examples/)).
  Domain: **movie-theatre seat allocations**. Pre-V4-era canvas with strategic classification,
  ubiquitous language, and domain policies filled, extended with Gherkin acceptance examples.
- **Andrea Magnorsky** teaches strategic DDD with the canvas
  ([ddd.academy](https://ddd.academy/strategic-ddd-andrea/)) but no published filled canvas of
  hers was found. Nick Tune's recorded canvas talks/webinars exist (e.g.
  [Skills Matter webinar](https://www.youtube.com/watch?v=gbS7KNdYSpg)) — video content not
  auditable here; **unverified** whether they show examples beyond the Medium material.

### 1.3 Community-published filled canvases

Kept short — these are primary only for their own content:

- **Fractional Architect newsletter, ["#29 From Chaos to Order: Bounded Context Canvas
  Explained"](https://newsletter.fractionalarchitect.io/p/29-from-chaos-to-order-bounded-context)**
  (2024-09-28). Domain: **credit-risk management** ("Each late payment reduces the credit risk
  score by 5 points"). Central sections (ubiquitous language, business decisions) shown filled;
  version not stated. Attributes ddd-crew with a repo link.
- **Miro/Mural templates**: the official
  [Miroverse template](https://miro.com/miroverse/category/newly-added/the-bounded-context-canvas)
  is **V4** per the README (a V5 Miro board backup, `bounded-context-canvas-v5-miro.rtb`, lives
  in the repo instead) — templates, not filled examples.
- **Contexture** (`example/restaurant-db.json`, restaurant domain) ships canvas-shaped filled
  data — already covered in `docs/research/contexture-schema.md` on `research/contexture-schema`.

### 1.4 Example table

| Example | Domain | Fill level | Canvas rev | Author | License | URL |
|---|---|---|---|---|---|---|
| "Scoring" (repo example) | Retail mortgage credit scoring | All 11 sections, sparse (1–5 items each) | V5 | Maxime Sanglan-Charlier; V5 update Michael Plöd | Repo licence (see §3.2 caveat) | [permalink](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/BCCanvasExample.jpg) |
| Collaborator swimlane fragment | Showrooms/sales | Inbound panel only | V4-era | ddd-crew (**unverified** individual) | Repo licence | [permalink](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/collaborator-example.jpeg) |
| Workshop-recipe canvases (3 progressive + 1 complete) | Fictional, unnamed | Progressive → complete | V1 | Nick Tune | © Nick Tune (Medium; no CC grant stated) | [article](https://medium.com/nick-tune-tech-strategy-blog/modelling-bounded-contexts-with-the-bounded-context-design-canvas-a-workshop-recipe-1f123e592ab) |
| Use-case swimlane examples | Booking; Onboarding/Profile | Communication + decisions only | V4 variant | Nick Tune | © Nick Tune | [article](https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-recipe-use-case-swimlanes-11ca647175d3) |
| BDD-extended canvas | Movie-theatre seat allocation | Classification, language, policies + Gherkin | pre-V4 | Kenny Baas-Schwegler | © author (no CC grant stated) | [article](https://baasie.com/2020/03/09/extending-the-bounded-context-canvas-with-bdd-examples/) |
| Newsletter #29 canvas | Credit risk | Central sections shown | not stated | "MJ", Fractional Architect | © author | [article](https://newsletter.fractionalarchitect.io/p/29-from-chaos-to-order-bounded-context) |

### 1.5 Canvas revision history (from repo commits + author articles)

Our SPEC §3 sections are exactly the V5 set; older examples need translation:

- **V1** (2019-07, [workshop-recipe article](https://medium.com/nick-tune-tech-strategy-blog/modelling-bounded-contexts-with-the-bounded-context-design-canvas-a-workshop-recipe-1f123e592ab)):
  name/description/strategic classification, business rules, ubiquitous language,
  **capabilities**, **dependencies**. Capabilities/dependencies have no direct equivalent in
  our format; rules → `businessDecisions`, dependencies ≈ communication lanes without messages.
- **V3** (repo [initial commit era, 2020-05-04](https://github.com/ddd-crew/bounded-context-canvas/commit/ce71aa595d);
  [v3 image](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/bounded-context-canvas-v3.jpeg);
  [V3 article](https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-v2-simplifications-and-additions-229ed35f825f)):
  Name, Description, Strategic Classification, Business Decisions, Ubiquitous Language,
  **Model Traits**, **Messages Consumed and Produced** (commands/events/queries handled vs
  sent/published/invoked), **Dependencies and Relationships** (message suppliers/consumers +
  relationship). Messages are grouped by type, not by collaborator lane.
- **V4** ([`8fc7251`](https://github.com/ddd-crew/bounded-context-canvas/commit/8fc7251ef7)
  2020-08-09, Nick Tune): the layout our app mirrors minus the bottom row — Model Traits
  renamed **Domain Roles** (README: "model traits was the former name for domain roles"),
  messages+dependencies merged into **Inbound/Outbound Communication** collaborator lanes,
  central Ubiquitous Language + Business Decisions, CC BY badge printed on the canvas.
- **V5** ([`a88b79e`](https://github.com/ddd-crew/bounded-context-canvas/commit/a88b79e6b5)
  2022-11-19, Michael Plöd — "renamed description, added metrics, assumptions and questions"):
  Description → **Purpose**; adds **Assumptions**, **Verification Metrics**, **Open
  Questions**. This is the eleven-section set our SPEC §3 serializes 1:1.

## 2. What ddd-crew guidance says makes section content good

From the [README section definitions and design tips](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/README.md)
unless noted; ordered per V5. Recommended fill order = section-definition order, "or design
outside-in starting with inbound communication or inside out starting with the business rules
and domain language."

- **Name** — "Naming is hard. Writing down the name of your context and gaining agreement as a
  team will frame how you design the context." A name the team agrees on, framing the design.
- **Purpose** — "A few sentences describing the why and what of the context in **business
  language**. **No technical details** here." May "name key actors for whom the bounded context
  provides value." Nick Tune (V1 article): convey "the purpose the context plays in the domain
  and its role in the business, not implementation details."
- **Strategic classification** — one pick per axis from defined vocabularies: domain
  (core = "a key strategic initiative" / supporting / generic), business model (revenue
  generator / engagement creator / compliance enforcer), evolution (genesis / custom built /
  product / commodity, per Wardley). Good content is a *choice*, not prose.
- **Domain roles** — characterize the context's *behaviour* ("Does it receive high volumes of
  data and crunch them into insights — an analysis context? Or does it enforce a workflow — an
  execution context?"); the point is "to avoid coupling responsibilities." The
  [model-traits worksheet](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/model-traits-worksheet.md)
  gives ~15 named roles each with a one-line heuristic and a concrete example
  ("Gateway — Sits at the edge of a system and manages inbound and/or outbound communication.
  Example: IoT Message Gateway").
- **Inbound/outbound communication** — messages are one of three types (command = request to do,
  query = request for information, event = notification something happened), named in domain
  language, **implementation-agnostic** ("No message bus … is obligatory"). Collaborators can be
  bounded contexts, frontends, or "direct user interaction"; group per collaborator swimlane;
  optionally tag context-to-context lanes with a
  [context-mapping](https://github.com/ddd-crew/context-mapping) relationship type. The
  README's interface-critique tips define quality: message names coherent with each other and
  with the purpose; right message type ("should a command be an event?"); interface not too big
  (not too many unique message types); not "exposing too much of its internals"; no messages
  that "seem like they should belong elsewhere."
- **Ubiquitous language** — "the key domain terms that exist **within this context**, and what
  they mean" — context-specific term + definition pairs, not a global glossary.
- **Business decisions** — "key business rules and policies"; Nick Tune's workshop recipe:
  distill the **top 3** from an EventStorm, not an exhaustive rule dump. Kenny Baas-Schwegler:
  policies are a boundary heuristic ("Design Bounded Contexts around policies") and can be
  sharpened into given/when/then examples.
- **Assumptions** — design always happens on incomplete knowledge; "it is highly recommended to
  make them explicit." Good content = the unverified beliefs the design leans on.
- **Verification metrics** — "metrics that you and your team can define in order to gather
  learnings if the chosen boundaries … are a good fit or not" (build-measure-learn); sourced
  from CI/CD, tools like JIRA, live systems. The Scoring example shows the idiom: quantified,
  falsifiable statements about change-coupling ("75% of changes to the application form will
  have no impact on Scoring").
- **Open questions** — questions nobody in the room can answer, kept visible; "many questions
  are a good indicator towards a high degree of uncertainty." Doubles as a certainty gauge.
- **General critique tip** — "Experiment by moving something on the canvas to another context.
  How is the design affected?"

The Scoring example demonstrates the intended fill *density*: every section present, each with
1–5 short stickies — a workshop artifact, not documentation prose. Good news for our examples:
sparse is canonical.

## 3. Licensing

### 3.1 CC BY 4.0 mechanics (from creativecommons.org)

Per the [BY 4.0 legalcode](https://creativecommons.org/licenses/by/4.0/legalcode.en) §3(a)(1),
Sharing licensed material "including in modified form" requires: retaining creator
identification, copyright notice, license notice, warranty-disclaimer notice, and a URI "to the
extent reasonably practicable"; **indicating modifications** and retaining indication of
previous modifications; and indicating + linking the license. §3(a)(2): satisfiable "in any
reasonable manner based on the medium" — a link to a page carrying the information suffices.
§3(a)(3): the licensor can demand removal of attribution. "Adapted Material" (§1(a)) is
material "derived from or based upon" the licensed material that is "translated, altered,
arranged, transformed, or otherwise modified in a manner requiring permission."

The [CC attribution wiki](https://wiki.creativecommons.org/wiki/Best_practices_for_attribution)
frames this as TASL (Title, Author, Source, License; title optional in 4.0) and gives the
derivative wording: *"This work, '[New Title]', is adapted from '[Original Title](URL)' by
[Author], used under [CC License]."*

### 3.2 Caveat first: the repo's license signals conflict

- The [README](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/README.md)
  states "This work is licensed under a Creative Commons **Attribution 4.0** International
  License" with a CC BY badge, and the V4/V5 canvas images carry a **CC BY** badge on the
  artwork itself.
- But [`LICENCE.md`](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/LICENCE.md)
  contains the **BY-SA 4.0** legalcode (Attribution-**ShareAlike**), created
  [2020-05-04](https://github.com/ddd-crew/bounded-context-canvas/commit/7be4ddd4b4) and never
  amended; GitHub's license detection reports the repo as `CC-BY-SA-4.0`.

Which grant governs is ambiguous (**unverified** which was intended; likely a paste error, but
only ddd-crew can say). BY-SA would additionally require (§3(b) of the
[BY-SA legalcode](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en)) that any
Adapted Material we ship be licensed BY-SA-compatible. This is a real, if small, risk for
*derived* content; it is irrelevant for attribution-only compliance, which is identical in both.

### 3.3 If we transcribe/derive an example from the repo (e.g. Scoring)

The filled-in Scoring content is copyrightable **expression** (specific sentences, term
definitions, invented metrics), owned by its authors — per commit history Maxime
Sanglan-Charlier and Michael Plöd — and licensed to us only via the repo's licence (whichever
it is; contributed examples enter the repo under it — the README solicits example PRs).
Transcribing it into our file format is at minimum Sharing in modified form, plausibly Adapted
Material (format translation + edits). Beyond our generic "canvas structure by ddd-crew" line,
§3(a) then obligates, for the *example*: identify the work and its source
(title/author/source — TASL), state the license with a link, and **indicate our
modifications** ("transcribed to BC Canvas file format; wording adjusted"), e.g.:

> "Scoring" example adapted from the [Bounded Context Canvas example](https://github.com/ddd-crew/bounded-context-canvas/blob/main/resources/BCCanvasExample.jpg)
> by The DDD Crew, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
> Transcribed into the BC Canvas file format.

Plus: no implying ddd-crew endorses BC Canvas (legalcode §2(a)(6)), and honoring any removal
request (§3(a)(3)). Under the BY-SA reading, the transcription itself would also have to carry
a BY-SA-compatible license — extra machinery we don't otherwise need.

Examples from Medium/blog posts are worse: those authors publish under default copyright (no CC
grant found on Nick Tune's or Kenny Baas-Schwegler's example content), so transcription isn't
licensed at all without permission.

### 3.4 Inventing our own example domains — the clean path

Yes, it sidesteps the extra obligations cleanly:

- The **blank canvas structure** (section names, layout, method) is what the app already uses
  everywhere, and shipping it is already what obligates the existing generic attribution line —
  invented examples add no new licensed material. (Even the structure claim is generous to
  copyright: the CC FAQ notes "Facts are not subject to copyright, nor are the ideas underlying
  copyrighted content" — the canvas *method* and its short section headings are ideas/short
  phrases; our line is owed for the artwork/text we actually reproduce, and is good practice
  regardless.)
- The **filled content** of an invented example (our purpose sentences, term definitions,
  metrics for a fictional domain) is our own original expression; nothing in it is "derived
  from or based upon" the Licensed Material in the §1(a) sense merely because it sits in the
  same section structure. No per-example attribution, no modification notice, no ShareAlike
  question — the LICENCE.md ambiguity in §3.2 becomes moot.
- Following the *guidance* in §2 (sparse stickies, business language, quantified metrics) is
  copying ideas, not expression — expressly outside copyright per the CC FAQ.

**Verdict:** invent our own domains, keep the existing generic ddd-crew line, and skip
transcription of the Scoring example. If we ever do want to ship a transcription, first get
ddd-crew to resolve the README-vs-LICENCE.md conflict (or treat it as BY-SA and comply with
both), and carry the §3.3 per-example attribution.

## Sources

- Repo tree + files at commit `4ae5994`: [README.md](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/README.md) · [LICENCE.md](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/LICENCE.md) · [BCCanvasExample.jpg](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/BCCanvasExample.jpg) · [collaborator-example.jpeg](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/collaborator-example.jpeg) · [bounded-context-canvas-v3.jpeg](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/bounded-context-canvas-v3.jpeg) · [bounded-context-canvas-v4.jpeg](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/bounded-context-canvas-v4.jpeg) · [model-traits-worksheet.md](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/resources/model-traits-worksheet.md) · [tools/html-version/README.md](https://github.com/ddd-crew/bounded-context-canvas/blob/4ae59945a9baeeb365dafbfef86e92af8a34616d/tools/html-version/README.md)
- Repo commits (GitHub commits API): [`d2efeb8`](https://github.com/ddd-crew/bounded-context-canvas/commit/d2efeb86aa) · [`4436a50`](https://github.com/ddd-crew/bounded-context-canvas/commit/4436a5090d) · [`a88b79e`](https://github.com/ddd-crew/bounded-context-canvas/commit/a88b79e6b5) · [`8fc7251`](https://github.com/ddd-crew/bounded-context-canvas/commit/8fc7251ef7) · [`7be4ddd`](https://github.com/ddd-crew/bounded-context-canvas/commit/7be4ddd4b4) · [`ce71aa5`](https://github.com/ddd-crew/bounded-context-canvas/commit/ce71aa595d)
- Nick Tune: [Workshop Recipe](https://medium.com/nick-tune-tech-strategy-blog/modelling-bounded-contexts-with-the-bounded-context-design-canvas-a-workshop-recipe-1f123e592ab) · [Canvas V3: Simplifications and Additions](https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-v2-simplifications-and-additions-229ed35f825f) · [Use Case Swimlanes](https://medium.com/nick-tune-tech-strategy-blog/bounded-context-canvas-recipe-use-case-swimlanes-11ca647175d3)
- Kenny Baas-Schwegler: [Extending the BCC with BDD Examples](https://baasie.com/2020/03/09/extending-the-bounded-context-canvas-with-bdd-examples/) ([Xebia mirror](https://xebia.com/blog/extending-the-bounded-context-canvas-with-bdd-examples/))
- Community: [Fractional Architect #29](https://newsletter.fractionalarchitect.io/p/29-from-chaos-to-order-bounded-context) · [Miroverse template](https://miro.com/miroverse/category/newly-added/the-bounded-context-canvas) · [DDD Toolbox](https://dddtoolbox.com/bounded-context-canvas)
- Creative Commons: [BY 4.0 legalcode](https://creativecommons.org/licenses/by/4.0/legalcode.en) · [BY-SA 4.0 legalcode](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en) · [Best practices for attribution](https://wiki.creativecommons.org/wiki/Best_practices_for_attribution) · [CC FAQ](https://creativecommons.org/faq/)
- Local: `/Users/mitchell/Projects/bc-canvas-editor/SPEC.md` §3; `docs/research/contexture-schema.md` on branch `research/contexture-schema`
