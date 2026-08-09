# Research: an MCP server for BC Canvas

Ticket: none (exploratory, at Mitchell's request).
Researched: 2026-08-09, against primary sources (the MCP specification revision **2026-07-28**, its `schema.ts`, the official TypeScript SDK v2 repo and docs, Anthropic engineering, npm registry). Claims not confirmed against a primary source are marked **[unverified]**.

Context: BC Canvas is strictly client-side — SvelteKit with `adapter-static` (`vite.config.ts:16`), `prerender = true` (`src/routes/+layout.ts:1`), deployed to Cloudflare Pages, **no server code** (SPEC §2; `wayfinder/map.md` lists "Backend, auth, real-time collaboration" under Out of scope). The durable artifact is the versioned **Canvas file** (`.bcc.json`, SPEC §3), parsed and serialized by DOM-free modules (`src/lib/model/parse.ts`, `src/lib/model/serialize.ts`). An MCP server is therefore *not* an extension of the deployed app; it is a second consumer of the same schema, running somewhere else. This note establishes what MCP actually offers, then reasons to a concrete proposal.

---

## 1. What the Model Context Protocol actually is (2026-07-28)

The current dated revision is **2026-07-28** ([spec index](https://modelcontextprotocol.io/specification/latest)), whose authority is the TypeScript schema at [`schema/2026-07-28/schema.ts`](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) (3,197 lines; fetched 2026-08-09). JSON-RPC 2.0 between **hosts** (LLM apps), **clients** (connectors inside them) and **servers** (us).

### 1.1 The three server primitives and who controls them

The spec is explicit about *who decides* when each primitive fires, and this is the whole basis of the mapping in §5:

| Primitive | Control | Spec wording | Discovery / invocation |
|---|---|---|---|
| **Tools** | **model-controlled** | "Tools in MCP are designed to be **model-controlled**, meaning that the language model can discover and invoke tools automatically" ([tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)) | `tools/list` → `tools/call` |
| **Resources** | **application-driven** | "Resources in MCP are designed to be **application-driven**, with host applications determining how to incorporate context based on their needs" ([resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)) | `resources/list`, `resources/templates/list` → `resources/read` |
| **Prompts** | **user-controlled** | "Prompts are designed to be **user-controlled** … the intention of the user being able to explicitly select them", typically "as slash commands" ([prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)) | `prompts/list` → `prompts/get` |

The consequence that matters: **an agent cannot rely on a resource being in its context.** The host decides. Anything the model must be able to reach on its own initiative has to be a tool (or ride in a tool result as a `resource_link` / embedded `resource`, both of which the tools spec explicitly permits).

### 1.2 Tools: shape, output, annotations, errors

- A tool is `{ name, title?, description, icons?, inputSchema, outputSchema?, annotations? }`. `inputSchema` **MUST** be a valid JSON Schema object, defaulting to draft 2020-12. Names **SHOULD** be 1–128 chars from `[A-Za-z0-9_.-]`, case-sensitive, unique per server; aggregating clients may need prefix disambiguation — hence namespacing.
- Results carry **unstructured** `content[]` (`text`, `image`, `audio`, `resource_link`, embedded `resource`) and/or **structured** `structuredContent`, "any JSON value … that conforms to the tool's `outputSchema` if one is defined". If an `outputSchema` is given, "Servers **MUST** provide structured results that conform to this schema."
- Backwards-compat note with a real cost: "For backwards compatibility, a tool that returns structured content SHOULD also return the serialized JSON in a TextContent block" — i.e. the spec's default advice is to emit the payload **twice**. §7.3 declines that on token grounds.
- **Annotations** are hints only. From `schema.ts:1903–1954`:
  > "NOTE: all properties in `ToolAnnotations` are **hints**. They are not guaranteed to provide a faithful description of tool behavior (including descriptive properties like `title`). Clients should never make tool use decisions based on `ToolAnnotations` received from untrusted servers."

  Fields and their documented defaults: `readOnlyHint` (default `false`), `destructiveHint` (default **`true`**, meaningful only when `readOnlyHint == false`), `idempotentHint` (default `false`), `openWorldHint` (default `true`). The defaults are pessimistic on purpose: an unannotated tool is assumed destructive and open-world.
- **Two error channels.** *Protocol errors* (unknown tool, malformed request) are JSON-RPC errors — "Clients **MAY** provide protocol errors to language models, though these are less likely to result in successful recovery." *Tool execution errors* are ordinary results with `isError: true` and "contain actionable feedback that language models can use to self-correct and retry" — "Clients **SHOULD** provide tool execution errors to language models to enable self-correction." **Validation failures belong in `isError`, not JSON-RPC.**
- **No protocol session.** "MCP has no protocol-level session, so a server cannot rely on implicit per-connection state to relate one tool call to the next." The spec's remedy is explicit opaque handles returned from a creation tool and passed back as ordinary arguments.
- `tools/list` supports pagination and caching; servers **SHOULD** return tools in deterministic order for prompt-cache hit rates. `notifications/tools/list_changed` is delivered on a `subscriptions/listen` stream, not pushed blind.

### 1.3 Resources: URIs, templates, subscriptions

- `resources/read` returns `contents[]`, each `{ uri, mimeType?, text | blob }`. **Multiple contents per read are allowed** ("a server could return the contents of several files when a directory resource is read") — the SDK's own `report://latest` example returns markdown *and* a PNG blob under one URI.
- **Resource templates** are [RFC 6570](https://datatracker.ietf.org/doc/html/rfc6570) URI templates listed via `resources/templates/list`; their variables can be auto-completed through `completion/complete`.
- Standard schemes are `https://`, `file://`, `git://`; **custom schemes are explicitly allowed** if RFC 3986-conformant. `file://` is for things that "behave like a filesystem"; `https://` should be used *only* when the client can fetch it directly without the server.
- Annotations on resources/templates/content blocks: `audience` (`"user"` / `"assistant"`), `priority` (0.0–1.0), `lastModified` (ISO 8601).
- Subscriptions: the client opens `subscriptions/listen` with `notifications.resourceSubscriptions`; the server pushes `notifications/resources/updated`. Capability is `resources: { listChanged, subscribe }`, either advertised independently.
- Errors: missing resource **MUST** be JSON-RPC `-32602`; "Servers **MUST NOT** return an empty `contents` array for a non-existent resource." Security: "Servers **MUST** sanitize file paths to prevent directory traversal attacks when serving `file://` resources."

### 1.4 Prompts and completions

`prompts/get` returns `{ description?, messages[] }` with the same content union as tool results, including embedded resources ("enable prompts to seamlessly incorporate server-managed content"). Argument validation failure is a **protocol** error (`-32602`), unlike tools.

`completion/complete` takes `ref: { type: "ref/prompt" | "ref/resource" }`, an `argument: { name, value }`, and optional `context.arguments` (already-resolved values, so one field's suggestions can depend on another's). Results: max 100 `values`, optional `total`, `hasMore`. Note the scope: **completions cover prompt arguments and resource-template variables only — not tool arguments.**

### 1.5 Client features — two of the three are now deprecated

This is the sharpest finding of the research pass, and it kills a whole class of designs:

| Client feature | Status in 2026-07-28 | Source |
|---|---|---|
| **Elicitation** | Live; form mode + URL mode | [elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) |
| **Sampling** | **Deprecated** (SEP-2577). "New implementations **SHOULD NOT** adopt it; existing implementations **SHOULD** migrate to integrating directly with LLM provider APIs." | [sampling](https://modelcontextprotocol.io/specification/2026-07-28/client/sampling) |
| **Roots** | **Deprecated** (SEP-2577). "existing implementations **SHOULD** migrate to passing directories or files via tool parameters, resource URIs, or server configuration." | [roots](https://modelcontextprotocol.io/specification/2026-07-28/client/roots) |

`schema.ts` carries 21 `@deprecated Deprecated as of protocol version 2026-07-28 (SEP-2577)` markers, including `LoggingMessageNotificationParams` (`schema.ts:2022`) — **server logging over the protocol is deprecated too**. Deprecated features remain for at least twelve months under the [feature lifecycle policy](https://modelcontextprotocol.io/community/feature-lifecycle).

Practical translation for us: **the workspace root comes from server configuration or a tool argument, not `roots/list`; the server never asks the host's model to think for it; diagnostics go to stderr, not `notifications/message`.**

**Elicitation** survives and is interesting for a pick-heavy domain. Form mode's `requestedSchema` is "limited to flat objects with primitive properties only" — string/number/boolean/enum, where the titled-enum form is exactly `oneOf: [{ const, title }]`. That is a structural match for BC Canvas's pickers (SPEC §4). Servers **MUST NOT** use form mode for secrets. Delivery is via the multi-round-trip pattern (§1.6), not a server-initiated request.

### 1.6 Multi round-trip requests (MRTR) — servers cannot call clients

New in this revision: "servers do not initiate JSON-RPC requests and clients do not send JSON-RPC responses." When a server needs elicitation (or sampling/roots), it returns an `InputRequiredResult` with `resultType: "input_required"`, `inputRequests`, and an opaque `requestState`; the client re-sends the *original* request with `inputResponses` and a **different** JSON-RPC `id`. Every server-initiated interaction is therefore a re-entrant call, and the server must be able to resume from `requestState` alone.

### 1.7 Transports and their security requirements

**stdio** ([spec](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)) — the client launches the server as a subprocess; newline-delimited UTF-8 JSON-RPC, one message per line, messages "**MUST NOT** contain embedded newlines". Two rules that bite implementers:

> "The server **MAY** write UTF-8 strings to `stderr` for any logging purposes … The server **MUST NOT** write anything to its `stdout` that is not a valid MCP message."

Shutdown is by closing stdin; "Servers **SHOULD** exit promptly when their standard input is closed."

**Streamable HTTP** ([spec](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)) — single POST endpoint. This revision **removed the GET stream endpoint and removed protocol-level sessions** (`Mcp-Session-Id` is to be ignored; `Last-Event-ID` resumability is gone). Required headers `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, validated against the body (`-32020 HeaderMismatch`). Security block, verbatim:

> "1. Servers **MUST** validate the `Origin` header on all incoming connections to prevent DNS rebinding attacks. … 2. When running locally, servers **SHOULD** bind only to localhost (127.0.0.1) rather than all network interfaces (0.0.0.0). 3. Servers **SHOULD** implement proper authentication for all connections."

The 2024-11-05 **HTTP+SSE** transport is deprecated; "New implementations **SHOULD NOT** adopt it."

**Authorization** ([spec](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)) — "Authorization is **OPTIONAL** for MCP implementations", but the split is decisive for us:

> "Implementations using an HTTP-based transport **SHOULD** conform to this specification. Implementations using an STDIO transport **SHOULD NOT** follow this specification, and instead retrieve credentials from the environment."

Going HTTP means OAuth 2.1, mandatory RFC 9728 Protected Resource Metadata, RFC 8707 resource indicators, PKCE, RFC 9207 `iss` validation. Going stdio means an environment variable, if that.

### 1.8 The TypeScript SDK, concretely

The `main` branch is **SDK v2**, split into `@modelcontextprotocol/server` and `@modelcontextprotocol/client`, implementing 2026-07-28 ([README](https://github.com/modelcontextprotocol/typescript-sdk)). Schemas use [Standard Schema](https://standardschema.dev/) — Zod v4, Valibot, ArkType. Surface actually used below:

```ts
import { McpServer, ResourceTemplate, ProtocolError, ProtocolErrorCode,
         ResourceNotFoundError, completable } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'bc-canvas', version: '1.0.0' });

server.registerTool('greet',
  { description: '…', inputSchema: z.object({ name: z.string() }) },
  async ({ name }) => ({ content: [{ type: 'text', text: `Hello, ${name}!` }] }));

await server.connect(new StdioServerTransport());
```

Facts worth designing around, from the SDK's own docs:
- `.describe()` on a Zod field "survives the conversion: the JSON Schema advertised for `query` carries [it] as its `description` — **the only documentation the model gets for that argument**."
- Schema rejection is automatic and arrives as a tool error: `{ content: [{ type:'text', text:'Input validation error: …' }], isError: true }`. "The handler never runs."
- `outputSchema` + `structuredContent` are validated server-side before the result leaves.
- `annotations: { readOnlyHint, destructiveHint, idempotentHint }` on `registerTool`; "Annotations never change how the SDK runs the tool."
- Anything a tool handler **throws** becomes the same `isError: true` shape. Resource/prompt/completion callbacks have no `isError` channel — throw `ProtocolError(code, message)` or `ResourceNotFoundError(uri)`.
- `registerResource(name, uriOrTemplate, config, cb)`; `new ResourceTemplate('users://{userId}/profile', { list, complete })`, where `list` is a required key (pass `undefined` for unbounded sets) and `complete` is a per-variable completion map.
- Registration handles auto-notify: `registerTool(...).update()/.disable()/.remove()` each emit `list_changed`; `sendResourceListChanged()` exists but "Most servers never call a `send*ListChanged()` method directly."

### 1.9 First-party guidance on writing tools for agents

Anthropic, [Writing effective tools for AI agents](https://www.anthropic.com/engineering/writing-tools-for-agents):
- "More tools don't always lead to better outcomes. A common error we've observed is tools that merely wrap existing software functionality or API endpoints." Prefer consolidated, high-leverage tools (`schedule_event` over `list_users`+`list_events`+`create_event`).
- Namespace with consistent prefixes; "we have found selecting between prefix- and suffix-based namespacing to have non-trivial effects on our tool-use evaluations."
- "Resolving arbitrary alphanumeric UUIDs to more semantically meaningful and interpretable language … significantly improves Claude's precision in retrieval tasks."
- Offer response-verbosity control (a `DETAILED`/`CONCISE` enum) rather than one fixed shape.
- "Even small refinements to tool descriptions can yield dramatic improvements." Write them as you would for a new team member; make implicit context explicit; unambiguous parameter names.
- Error messages should steer toward a better strategy, not surface opaque codes.

### 1.10 Prior art — checked honestly

| Project | What it is | Relevance |
|---|---|---|
| [`context-mapper-mcp`](https://github.com/thijs-hakkenberg/contextmapper_mcp) (npm v1.1.0, published 2026-02-04) | MCP server over Context Mapper's CML: ~36 tools — `cml_create_model`, `cml_load_model`, `cml_save_model`, `cml_validate_model`, `cml_list_bounded_contexts`, `cml_create_relationship`, `cml_batch_add_elements`, `cml_generate_context_map_diagram` … Reads/writes CML files on disk, validates, emits PlantUML. **No resources, no prompts documented.** | The closest DDD analogue, and a cautionary one: an extremely fine-grained, tool-only surface. |
| [JSON Canvas MCP](https://mcpservers.org/servers/Cam10001110101/mcp-server-obsidian-jsoncanvas) | Obsidian `.canvas` files: `create_canvas`, `validate_canvas`, `read_canvas`, `list_canvases`, `edit_canvas` (atomic add/update/remove of nodes and edges; "a failed operation leaves the file unchanged"), `export_canvas`, `search_canvases`; renders an interactive viewer via MCP Apps. | The closest *structured-document* analogue, and it lands on exactly the hybrid this note recommends: whole-document create/read plus **one** batched atomic edit tool. |
| draw.io / JGraph MCP server (reported released 2026-02-03) | Diagram generation from a codebase. | Adjacent; details not verified against a first-party source. **[unverified]** |
| **A Bounded Context Canvas / ddd-crew / Contexture MCP server** | **None found.** Searches across the ddd-crew org, Contexture, and MCP directories surface DDD *applied to* MCP server design (e.g. `Chris-hughes10/mcp-ddd`), not a canvas server. | Greenfield. |

Also worth knowing: **MCP Apps** ([extension overview](https://modelcontextprotocol.io/extensions/apps/overview)) lets a tool declare `_meta.ui.resourceUri` pointing at a `ui://` resource; the host renders that HTML in a sandboxed iframe and the app talks back over postMessage. Starter templates exist for **Svelte**. This is the only honest way to *show* a rendered canvas without a browser export (see §6.2 and §9).

---

## 2. What is the server FOR?

Four candidate purposes, and they are not equal.

| Purpose | Verdict | Why |
|---|---|---|
| **(a) Authoring** — an agent drafts/edits a Canvas from a conversation or a codebase | **Build.** The reason to do this at all. | An agent that has just read a service's handlers, events and clients already knows the inbound/outbound lanes, the ubiquitous language and half the open questions. Today that knowledge has to be retyped into the sheet by hand. |
| **(b) Reading/analysis** — an agent consumes `.bcc.json` as context about a system | **Build; it is nearly free.** | Falls out of (a)'s parse path. A committed canvas is the best available prose description of a bounded context, and it is machine-readable by construction. |
| **(c) Teaching the method** — expose the ddd-crew canvas method, the curated vocabularies and their one-liners | **Build — but not as a product; as the mechanism inside (a).** | The vocabularies (SPEC §4) and the section questions (SPEC §10) are the difference between a canvas and a JSON file with plausible strings in it. A standalone "method server" is a document that wants to be a README. |
| **(d) Production** — render Artifacts (HTML / PNG) | **Trap. Do not.** | SPEC §9 makes the shared read-only `CanvasSheet` Svelte component the canonical visual truth; the HTML artifact inlines the compiled Tailwind sheet fetched *same-origin at export time* (`src/lib/artifact/html.ts:1–10`) and the PNG is a SnapDOM foreignObject rasterization (`src/lib/artifact/png.ts:9`). Both require a browser running the app. Reproducing them in Node means either shipping headless Chromium inside an MCP server or forking the renderer — the second violates "editor and artifact cannot diverge" (SPEC §8.4). |

**The server is an authoring-and-reading server whose authoring quality comes entirely from the method material it carries.** Artifacts stay where they are: the app's Export menu, or a `resource_link` back to the `.bcc.json` the human opens.

One nuance on (d): the *legitimate* rendering path is MCP Apps — a `ui://` resource carrying the quiet sheet as self-contained HTML, rendered in the host's sandboxed iframe from the same component. That is a preview, not an Artifact (no PNG, no export semantics, no `Unexported changes` interaction). Filed as a decision in §10, not a v1 commitment.

---

## 3. Where does it run, and on what state?

Three options against the "no server" constraint.

| Option | State it edits | Cost | Verdict |
|---|---|---|---|
| **Local stdio server over `.bcc.json` on disk** | Files in a directory the developer configures (typically `docs/contexts/` in their repo) | A Node package that must exist somewhere; the schema modules become a shared dependency | **Recommended** |
| **Remote Streamable HTTP server** | Canvases in hosted storage | Reintroduces exactly what `wayfinder/map.md` put out of scope: backend, auth, storage. MUST-level obligations: Origin validation, OAuth 2.1 + RFC 9728. And this revision **removed sessions**, so multi-call canvas state needs explicit opaque handles (§1.2) — strictly worse than a filename | **No** |
| **In-browser bridge to the running editor** | The live `CanvasEditor` document (`src/lib/editor/document.svelte.ts`) | MCP defines no browser-hosted server binding: stdio needs a subprocess, Streamable HTTP needs a listening socket. A page can do neither. It would need a local relay process — i.e. option 1, plus a WebSocket, plus a merge problem against autosave and undo | **No** |

### 3.1 Why stdio-over-files is the honest fit

The Canvas file was designed for this without anyone intending it. From `wayfinder/tickets/003-canvas-file-schema.md`: "No metadata envelope: `version` + content only. No timestamps, no generator string — **deterministic output, clean git diffs**." A format engineered for git is a format engineered for an agent working in a repo.

The enabling technical fact: the schema modules are already DOM-free and dependency-free.

- `src/lib/model/canvas.ts` — types, `CANVAS_VERSION`, `blankCanvas()`, `stampIds()`, `moveItem()`. Only browser touch: `crypto.randomUUID()` in `newId()` (`canvas.ts:84–86`), which is a Node global from 19+.
- `src/lib/model/parse.ts` — `parseCanvasFile()`, `parseCanvasImport()`, the `MIGRATIONS` table, the version gate.
- `src/lib/model/serialize.ts` — `toCanvasFile()`, `serializeCanvas()`.
- `src/lib/model/embed.ts` — `extractEmbeddedCanvas()`, so `.bcc.html` artifacts import through the same path.
- `src/lib/editor/vocab.ts` — `PICK_OPTIONS`, `TRAITS`, `CLEAR_LABELS`, with the teaching one-liners.

Five files, zero Svelte imports, zero DOM. The MCP server is a second front-end onto the same model layer, exactly as `src/lib/chrome/examples.ts:26–31` is a third one.

**What it costs, plainly:** SPEC §2's "no server code" becomes "no *deployed* server code." A Node build target, a `bin`, and a publish story appear in a repo that currently has one artifact. If the server lives outside this repo, `src/lib/model/*` must be published as a package or duplicated — and duplication is precisely the failure `examples.ts` was written to avoid. That is a real architectural decision, not a detail (§10, Q1).

One serializer seam to note: `serializeCanvas(doc: CanvasDoc)` takes the *runtime* document (with ephemeral ids); a `CanvasFile` is not structurally assignable to it. The server either calls `stampIds(file)` first or the model layer gains a `serializeCanvasFile(file: CanvasFile): string`. The latter is cleaner and one function long.

---

## 4. Sizing the token argument before designing the tools

Whole-document tools are usually rejected on token cost. Measure it first — the four bundled examples on disk:

| File | Bytes | ≈ tokens |
|---|---|---|
| `examples/order-fulfillment.bcc.json` (every section filled) | 3,321 | ~850 |
| `examples/appointment-scheduling.bcc.json` | 2,984 | ~760 |
| `examples/notifications.bcc.json` | 1,773 | ~450 |
| `examples/royalty-distribution.bcc.json` (mid-workshop) | 1,756 | ~450 |

A *maximally filled* Canvas is under a kilotoken. A single bounded context canvas is a small document by construction — that is the point of the method. Fifteen fine-grained tool calls, with their arguments, results and the model's interleaved reasoning, cost **more** than emitting the whole document once. This inverts the usual verdict and drives §7.

---

## 5. Primitive mapping

| Thing | Primitive | Justification |
|---|---|---|
| A canvas on disk | **Resource** (`bcc://canvas/{path}`, templated) **and** reachable by tool | Resources are application-driven: the user attaches a canvas as context. But an agent that decides mid-task to consult a canvas cannot wait for the host — hence the tool too (see §5.1). |
| The four bundled Examples | **Resources** (`bcc://example/{slug}`) | Static, enumerable, `audience: ["assistant"]`, high `priority`. The cheapest few-shot in the project already exists as committed bytes (`examples/*.bcc.json`). |
| The curated vocabularies | **Tool-input-schema descriptions first**, resources second | See §5.2 — this is the load-bearing decision of the whole design. |
| Section questions / the ddd-crew method | **Resource** + a `bcc_explain` tool | Same reasoning as vocabularies: the model must be able to pull it without host cooperation. |
| Facilitation workflows ("draft a canvas for this service", "review this canvas with me") | **Prompts** | Textbook fit: user-controlled, surfaced as slash commands. This is where the ddd-crew workshop lives. |
| Reading, writing, editing, listing | **Tools** | Model-controlled by definition. |

### 5.1 Should the read path be a resource, a tool, or both? — Both, one truth

A canvas is a document, and the spec's word for a document is *resource*. But "application-driven" means the host decides what gets attached, and an agent drafting a new canvas that wants to imitate `order-fulfillment` cannot ask the host to attach it. The spec anticipates precisely this and provides the bridge: "A tool **MAY** return links to Resources … the tool will return a URI that can be subscribed to or fetched by the client."

**Recommendation:** one read implementation, two doors.
- `resources/read` on `bcc://canvas/{path}` returns **two contents under one URI** (permitted, and the SDK's own `report://latest` example does it): a `text/markdown` digest for the model, and the exact `application/json` bytes.
- `bcc_read_canvas` calls the same function and returns the digest as `content`, the `CanvasFile` as `structuredContent`, and a `resource_link` to the same `bcc://` URI so the host can pin it.

Use a **custom `bcc://` scheme, not `file://`**, because what is served is a derived, model-legible view of the file, not the file. `file://` would promise byte-identity we deliberately do not deliver on the markdown item. (Custom schemes are explicitly sanctioned; only `https://` carries a "client can fetch it itself" contract we would be lying about.)

Register it as a `ResourceTemplate('bcc://canvas/{path}', { list, complete: { path } })`: `list` enumerates discovered `*.bcc.json` under the configured root so canvases show up in the host's picker, and `complete` gives the human path autocompletion — the only place completions apply at all (§1.4).

### 5.2 Where the vocabularies actually have to live

SPEC §4 is a picker-plus-escape-hatch design whose *teaching* is the one-liners: `wayfinder/tickets/012-reference-material.md` deliberately put no relationship glossary in the Reference dialog because "relationship patterns [are] taught by one-liners in their picker". The MCP equivalent of "in the picker" is **in the input schema of the tool that sets the value**, because the SDK docs state flatly that a field's `.describe()` is "the only documentation the model gets for that argument".

So:

```ts
relationship: z.string().optional().describe(
  'Context-mapping pattern for this lane. Applies only when the collaborator is another ' +
  'bounded context. The nine curated ddd-crew patterns:\n' +
  'partnership — The two contexts succeed or fail together; teams coordinate as equals.\n' +
  'shared-kernel — Both contexts share a piece of the model, changed only by mutual agreement.\n' +
  'customer-supplier — Upstream plans around this context\'s needs, like a supplier serving a customer.\n' +
  // … the remaining six, verbatim from src/lib/editor/vocab.ts
  'Any other string is accepted as a custom pattern and renders as-is. Omit for no relationship.'
)
```

Note it is `z.string()`, **not** `z.enum()`. A hard enum would make the SDK reject `"strangler-fig"` before the handler runs — which would contradict SPEC §4 ("**custom…** accepts any string, which renders identically to curated values and round-trips through the serializer"). The one place `z.enum` is correct is `message.type`, which SPEC §3.2 calls "a genuinely **closed** enum … no escape hatch (it carries the Event Storming color semantics)". That asymmetry must be visible in the schemas: **closed enums are enums; escape-hatched vocabularies are described strings.**

Cost: the vocabulary text is ~1.5 KB across the tool list, paid once per session and prompt-cacheable (hence the spec's deterministic-ordering advice). That is the right price for the model picking `conformist` correctly instead of inventing `"upstream-downstream"`.

---

## 6. What must NOT be built

Stated first, because scope discipline is what makes the rest small.

1. **No undo/redo over MCP.** Undo is a session-scoped stack of full-document snapshots inside the editor (`src/lib/editor/document.svelte.ts`, SPEC §6.1) that is explicitly cleared on import and never persisted. An MCP server has no session (§1.2) and no such stack. The agent's undo is git. Exposing `bcc_undo` would invent a second, weaker history that nothing else respects.
2. **No PNG.** SnapDOM rasterizes an SVG `foreignObject` in a live browser. There is no Node path that is not "ship Chromium," and shipping Chromium in a canvas-editing MCP server is a category error.
3. **No HTML artifact.** Same reason plus §9.1's same-origin stylesheet fetch. If an agent needs a shareable artifact, it hands the human a `.bcc.json` path and the human presses Export. The round trip is byte-safe by design: `extractEmbeddedCanvas()` means a `.bcc.html` the human exports can be re-read by the server later.
4. **No concurrent editing, no locking, no presence.** The app already answered this: last-write-wins plus a notice (SPEC §6.1). A server that added locking would be stricter than the product it serves.
5. **No database, no multi-canvas library, no cross-canvas context map.** `wayfinder/map.md` puts these out of scope. `bcc_list_canvases` globbing a configured directory is the ceiling; a canvas index with relationships is a different product.
6. **No autosave, no `localStorage` mirroring, no talking to a running browser tab.**
7. **No foreign-format import** (Contexture, Miro, Excalidraw) — SPEC §1 out of scope, and the temptation is much stronger when an LLM is in the loop and "could probably map it."
8. **Never write to stdout.** On stdio, "The server **MUST NOT** write anything to its `stdout` that is not a valid MCP message." In a repo whose day-to-day is Vite and Svelte, one stray `console.log` in a shared module silently corrupts the protocol stream. Diagnostics go to `stderr` — and *not* to `notifications/message`, which is deprecated (§1.5).
9. **Do not build on Sampling or Roots.** Both deprecated in the revision we would target.

---

## 7. The tool surface

### 7.1 The central tension, resolved

| | Coarse (`get_canvas` / `set_canvas`) | Fine (`add_message_to_lane`, `set_strategic_classification`, …) |
|---|---|---|
| Round trips for a first draft | 1 | 25–40 |
| Round trips for "add one event to the Notifications lane" | 1 (re-emit ~850 tokens) | 1 (~40 tokens) |
| Token cost per call | ≤ ~850 tokens (§4) | tens |
| Failure mode | Model silently drops sections when re-emitting a long document | Model mis-addresses a row; partial state after a failed sequence |
| Addressing | None needed | Hard: **the file has no row ids** (SPEC §3.2, "the file is pure content") — must address by position or by name |
| Fit with existing code | Exact: `parseCanvasFile` validates whole documents; `document.svelte.ts` snapshots whole documents per commit | Requires a new mutation layer duplicating the editor's structural operations |
| Tool-count discipline | 1 tool | 15–25 tools; against Anthropic's consolidation guidance and `context-mapper-mcp`'s 36-tool cautionary example |

**Verdict: the middle path, and it is genuinely a middle — not a hedge.** Two write tools:

- **`bcc_write_canvas`** — whole document, whole validation. The drafting hammer. Drafting a canvas from a codebase is inherently a whole-document act; a canvas at ~850 tokens is cheap enough that splitting it into 30 calls is the expensive option.
- **`bcc_edit_canvas`** — a **list of typed operations applied atomically** (all-or-nothing, mirroring JSON Canvas MCP's "a failed operation leaves the file unchanged"). One tool, not fifteen; the operation vocabulary is a *discriminated union in the input schema*, so it costs one entry in `tools/list` and the model still sees every legal move.

The operation vocabulary should be **Commit** as `CONTEXT.md` defines it — "a field edit accepted on blur, or a single structural action (add, remove, reorder, pick)" — so the server's grain is the app's grain, and an agent's edit is describable in the same words as a human's.

Rows are addressed by **natural key** (collaborator name, message name, term, trait, decision name), never by index and never by a synthesized id — this is Anthropic's "resolve UUIDs to semantically meaningful language" applied at the input side. Ambiguity is a tool error that names the collision (§8).

### 7.2 The five tools

Prefix everything `bcc_` (namespacing guidance; well within the `[A-Za-z0-9_.-]` charset rule).

```ts
// 1 ─────────────────────────────────────────────────────────────────────
bcc_list_canvases: {
  description: 'List the Bounded Context Canvas files in the workspace, with each ' +
               'canvas\'s name, one-line description and how complete it is.',
  inputSchema: z.object({}),                       // root comes from config, not roots/list
  outputSchema: z.object({ canvases: z.array(z.object({
    path: z.string(), name: z.string(), description: z.string(),
    filledSections: z.number(), emptySections: z.array(z.string()),
    uri: z.string()                                // bcc://canvas/{path}
  })) }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
}

// 2 ─────────────────────────────────────────────────────────────────────
bcc_read_canvas: {
  description: 'Read one Bounded Context Canvas. Returns a readable digest of all ' +
               'eleven V5 sections; pass view:"json" for the exact Canvas file.',
  inputSchema: z.object({
    path: z.string().describe('Path to a .bcc.json or .bcc.html file in the workspace'),
    view: z.enum(['digest', 'json']).default('digest')
      .describe('digest — prose rendering of every section, cheapest to read. ' +
                'json — the exact Canvas file, needed only to rewrite it wholesale.')
  }),
  outputSchema: CanvasFileSchema,                  // mirrors src/lib/model/canvas.ts
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
}

// 3 ─────────────────────────────────────────────────────────────────────
bcc_write_canvas: {
  description: 'Create or replace a whole Bounded Context Canvas. Validates the ' +
               'complete document, then writes canonical Canvas file bytes. ' +
               'Replaces everything at that path — use bcc_edit_canvas to change part of one.',
  inputSchema: z.object({ path: z.string(), canvas: CanvasFileInputSchema }),
  outputSchema: z.object({
    path: z.string(), uri: z.string(),
    warnings: z.array(z.string()),                 // custom vocabulary values, empty sections
    summary: z.string()
  }),
  annotations: { readOnlyHint: false, destructiveHint: true,
                 idempotentHint: true, openWorldHint: false }
}

// 4 ─────────────────────────────────────────────────────────────────────
bcc_edit_canvas: {
  description: 'Apply a list of edits to an existing canvas, atomically — if any ' +
               'operation fails, the file is left untouched. Rows are addressed by ' +
               'name (collaborator, message, term, trait), never by position.',
  inputSchema: z.object({
    path: z.string(),
    operations: z.array(z.discriminatedUnion('op', [
      z.object({ op: z.literal('set_name'),         value: z.string() }),
      z.object({ op: z.literal('set_description'),  value: z.string() }),
      z.object({ op: z.literal('set_classification'),
                 axis: z.enum(['domain','businessModel','evolution']),
                 value: z.string().nullable().describe(/* curated values + one-liners; null clears */) }),
      z.object({ op: z.literal('add_trait'),        name: z.string().describe(/* the 15 + descriptions */) }),
      z.object({ op: z.literal('remove_trait'),     name: z.string() }),
      z.object({ op: z.literal('add_lane'),         direction: Direction, collaborator: z.string(),
                 relationship: z.string().optional().describe(/* the 9 + one-liners */) }),
      z.object({ op: z.literal('remove_lane'),      direction: Direction, collaborator: z.string() }),
      z.object({ op: z.literal('set_relationship'), direction: Direction, collaborator: z.string(),
                 value: z.string().nullable() }),
      z.object({ op: z.literal('add_message'),      direction: Direction, collaborator: z.string(),
                 type: z.enum(['command','query','event']),   // closed — SPEC §3.2
                 name: z.string(), description: z.string().optional() }),
      z.object({ op: z.literal('remove_message'),   direction: Direction, collaborator: z.string(),
                 name: z.string() }),
      z.object({ op: z.literal('add_term'),         term: z.string(), definition: z.string().optional() }),
      z.object({ op: z.literal('remove_term'),      term: z.string() }),
      z.object({ op: z.literal('add_decision'),     name: z.string(), description: z.string().optional() }),
      z.object({ op: z.literal('remove_decision'),  name: z.string() }),
      z.object({ op: z.literal('add_note'),         section: NoteSection, text: z.string() }),
      z.object({ op: z.literal('remove_note'),      section: NoteSection, text: z.string() })
    ])).min(1)
  }),
  outputSchema: z.object({ path: z.string(), uri: z.string(),
                           applied: z.array(z.string()), warnings: z.array(z.string()) }),
  annotations: { readOnlyHint: false, destructiveHint: true,   // removals are destructive
                 idempotentHint: false, openWorldHint: false }
}
// Direction = z.enum(['inbound','outbound']);
// NoteSection = z.enum(['assumptions','verificationMetrics','openQuestions']);

// 5 ─────────────────────────────────────────────────────────────────────
bcc_explain: {
  description: 'Explain part of the Bounded Context Canvas method: what a section is ' +
               'for and the question it answers, or the curated values for a vocabulary.',
  inputSchema: z.object({ topic: z.enum([
    'canvas', 'strategic-classification', 'domain-roles', 'relationships',
    'inbound', 'outbound', 'ubiquitous-language', 'business-decisions',
    'assumptions', 'verification-metrics', 'open-questions'
  ]) }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
}
```

Reorder operations are **deliberately absent**. Alt+arrow reordering (SPEC §8.2) is a human affordance about visual reading order; an agent has no eyes on the sheet and would burn calls arranging chips. If order ever matters, it arrives with `bcc_write_canvas`.

### 7.3 Two shaping decisions worth stating

**Digest as `content`, `CanvasFile` as `structuredContent`.** The spec's backwards-compat advice is to *also* serialize the structured payload into a text block — which would double a whole canvas in context for nothing. Instead: `content` carries the prose digest (what the model should read), `structuredContent` carries the exact `CanvasFile` (what a client can validate against `outputSchema`). The cost is a pre-2025-06-18 client seeing only the digest. Accepted, and worth a line in the server's README.

**The digest is prose, not JSON.** Roughly:

```
Order Fulfillment — core · revenue · custom-built
Coordinates picking, packing and shipping once an order is paid.
Roles: execution context

Inbound
  Checkout (customer-supplier)
    ▶ Place Order
    ◆ Payment Confirmed — Triggers fulfillment.

Outbound
  Notifications
    ◆ Order Shipped

Ubiquitous language
  Shipment — A physical parcel dispatched against an order.
Business decisions
  No partial shipments — An order ships complete or not at all.
Assumptions: Warehouse stock counts are accurate within the hour.
Verification metrics: Time from payment to dispatch under 4 hours.
Open questions: Who owns returns — this context or a new one?
```

Roughly 40% of the JSON's tokens, and it re-uses the glyph vocabulary the app already teaches in its footer legend (SPEC §10) — the same `▶ ? ◆` the human sees.

### 7.4 Prompts

Three, and only three:

- **`draft-canvas-from-code`** (args: `area`, `path?`) — the ddd-crew facilitation script turned into a message: read this code, identify the boundary, work the sections in canonical order, ask rather than invent for classification, end with `bcc_write_canvas`. Embeds `bcc://example/order-fulfillment` as a worked example (`type: 'resource'`, which prompts explicitly support).
- **`review-canvas`** (arg: `path`) — read the canvas, name what is missing, and *ask the open questions back*.
- **`canvas-workshop`** (arg: `area`) — the interactive, section-by-section facilitation, one question at a time, using the SPEC §10 placeholder questions verbatim.

`completable()` on the `path` argument gives host-side autocompletion over discovered canvases (the SDK wires the `completions` capability automatically on first use).

---

## 8. How it behaves — three sessions

### 8.1 "Draft a canvas for the shipping service"

The user invokes the `draft-canvas-from-code` prompt. The agent reads code, then:

**→ `bcc_explain { topic: 'strategic-classification' }`** — the model has a canvas shape in mind but not the axis values.

```
Strategic classification places the context on three axes. Values are suggestions,
not a closed list — any other string is kept as written.

domain — core | supporting | generic
businessModel — revenue | engagement | compliance | cost-reduction
evolution — genesis | custom-built | product | commodity

Any axis may be left unset; an unset axis renders "—" on the sheet. Leave it unset
rather than guessing: which axis a context sits on is a business judgement, and
"unset" is a legitimate mid-workshop state.
```

That last sentence is the whole point of (c) in §2. It is why the model *asks* instead of stamping `core` on everything — and it matches what `examples/royalty-distribution.bcc.json` actually looks like on disk (`strategicClassification` carries only `businessModel`).

**→ `bcc_write_canvas`** with the full document. Result:

```json
{ "content": [{ "type": "text", "text":
    "Wrote docs/contexts/shipping.bcc.json — Shipping.\n3 inbound lanes (5 messages), 2 outbound lanes (2 messages), 4 terms, 2 decisions.\nEmpty: strategicClassification.domain, strategicClassification.evolution, verificationMetrics.\nAccepted \"logistics gateway\" as a custom domain-role trait (not one of the 15 curated ddd-crew traits)." }],
  "structuredContent": { "path": "docs/contexts/shipping.bcc.json",
                         "uri": "bcc://canvas/docs/contexts/shipping.bcc.json",
                         "warnings": ["custom trait: logistics gateway"] },
  "isError": false }
```

Two behaviors to notice. The custom trait is **accepted with a note, not refused** — that is SPEC §4's escape hatch, and the server matching the UI is non-negotiable (see §9.2). And the result names what is *empty*, which is what makes the agent's next sentence "I left domain and evolution unset — is Shipping core to the business, or supporting?" rather than silence.

### 8.2 "Review the royalty distribution canvas"

**→ `bcc_list_canvases`** → four rows with `filledSections` and `emptySections`; Royalty Distribution shows `["assumptions", "verificationMetrics"]` and a partial classification.

**→ `bcc_read_canvas { path, view: 'digest' }`** → ~450 tokens of prose (§7.3). The four `openQuestions` are right there in the digest, including "Core or supporting? Accurate splits build artist trust — or is this plumbing every competitor has?"

The agent puts those questions to the human, they answer, and:

**→ `bcc_edit_canvas`** with `[ {op:'set_classification', axis:'domain', value:'core'}, {op:'remove_note', section:'openQuestions', text:'Core or supporting? …'}, {op:'add_note', section:'assumptions', text:'Territory-level play data is complete by the 5th of the month.'} ]` — one atomic call, three commits' worth of change, one file write.

### 8.3 "Notifications also sends an SMS Delivered event" — and the error path

**→ `bcc_edit_canvas`** with a mistyped collaborator:

```json
{ "content": [{ "type": "text", "text":
    "No outbound lane for \"SMS Gateway\" in notifications.bcc.json. Outbound collaborators here: \"Customer\", \"Delivery Log\". Inbound: \"Order Fulfillment\", \"Account Preferences\". Add the lane first with {\"op\":\"add_lane\",\"direction\":\"outbound\",\"collaborator\":\"SMS Gateway\"}, or use one of the existing names. Nothing was changed." }],
  "isError": true }
```

`isError: true`, not a JSON-RPC error — the spec's whole reason for the second channel is that "Clients **SHOULD** provide tool execution errors to language models to enable self-correction." The message does the three things Anthropic's guidance asks: names the failure, lists the legal values, and shows the exact operation that fixes it.

The retry succeeds; the atomic guarantee means the *other* two operations in the original batch were never written.

---

## 9. Validation, errors and the version stance

### 9.1 The refusal path needs to get more specific — and only for MCP

`src/lib/model/parse.ts` collapses every shape failure into one value: `{ ok: false, reason: 'not-canvas' }` (`parse.ts:22–27`), because a `Refusal` is thrown at the first bad field (`parse.ts:37`, `44`) and caught blind (`parse.ts:144–146`). For the app this is exactly right — SPEC §10 gives the user a single sentence: "This file couldn't be read as a Canvas file."

For MCP it is exactly wrong. A tool error must teach. `"not a Canvas file"` gives the model nothing to fix.

**Recommendation:** give `Refusal` a path and an expectation (`inboundCommunication[1].messages[0].type: expected one of "command", "query", "event", got "notification"`), surface it in `ParseResult`, and leave the app's copy alone by ignoring the detail at the UI call site. One source of truth for validation, two levels of disclosure. The alternative — a Zod mirror of the schema inside the MCP server — creates the second definition of the Canvas file that this project has been careful to avoid (`examples.ts:26–31` reads the committed bytes *through the real parse path* precisely so no second definition can drift).

Layered on top, the server should reject at the schema boundary wherever the vocabulary is genuinely closed. `message.type` as `z.enum(['command','query','event'])` means the SDK rejects `"notification"` before the handler runs, with `Input validation error: … Invalid option`. Free, and correct.

### 9.2 Off-vocabulary values: accept, with a note

SPEC §4: "the picker offers the canonical strings below; **custom…** accepts any string, which renders identically to curated values and round-trips through the serializer." SPEC §3.2: "Escape hatch = single string field … Unknown values round-trip by construction."

**The server must match the UI: accept, never refuse.** A server stricter than its editor would produce canvases the editor can write but the server can't read — which is precisely the trap `wayfinder/tickets/001-contexture-schema-lessons.md` recorded: "Contexture's backend has an `OtherDomainType of string` escape hatch that its frontend's closed enums can't display."

But acceptance without feedback teaches the model nothing, so every custom value produces a **warning string in the result**, phrased as observation not reproach: `Accepted "strangler-fig" as a custom relationship pattern (not one of the nine curated ddd-crew patterns).` The model gets one chance to reconsider; the human gets the value they asked for.

The exceptions are the two places SPEC closes the door: `message.type` (closed enum, carries color semantics) and the eleven section keys (all always present, SPEC §3.2).

### 9.3 The version stance maps straight through

`parse.ts:131`: `if (version > CANVAS_VERSION) return { ok: false, reason: 'newer-version', version }` — refused, never mutated, no best-effort parsing (SPEC §3.3, ticket 003).

Server behavior, unchanged in spirit:

```
This canvas file is format version 3; this server reads up to version 1. The file has
not been read or changed. Update the bc-canvas MCP server, then try again.
```

`isError: true`. **No read, no partial parse, and above all no write** — an agent that "helpfully" downgrades a newer canvas would destroy data the app itself refuses to touch. Older versions migrate forward through the existing `MIGRATIONS` table (`parse.ts:33`) on load, exactly as the app does; writes always emit `CANVAS_VERSION`.

### 9.4 Write files, or return documents?

**Write files.** The entire justification for stdio-over-disk (§3) is that the file is the medium. Returning bytes for the host to persist adds a step that nothing in the loop is better at.

Constraints on writing:
- **Atomic**: write to a temp file in the same directory, then rename. `bcc_edit_canvas` validates the whole resulting document before any bytes land — a failed operation leaves the file untouched.
- **Canonical bytes**: through `serializeCanvas` (2-space indent, fixed key order, optional fields omitted, `<` escaped) plus the trailing newline the `examples/` files carry. Anything else churns git diffs and breaks byte-identity with what the app exports — the property `wayfinder/tickets/003` was designed for and `src/lib/chrome/examples.test.ts` pins.
- **Confined to the configured root.** Resolve, then verify containment. The spec's resource guidance is explicit: "Servers **MUST** sanitize file paths to prevent directory traversal attacks."
- **Never write `.bcc.html`.** The server can *read* one via `extractEmbeddedCanvas()`; writing one means rendering (§6.3).

### 9.5 Unexported changes is a browser concept, and stays one

`CONTEXT.md`: "**Unexported changes** — the Canvas has changed since it was last carried out of the browser in a re-importable form." An MCP write never enters the browser, so it neither sets nor clears the flag. If the human has the same canvas open in a tab, the two are simply disjoint: the tab's autosave wins on the next export, silently. That is the same last-write-wins the app already chose for multi-tab (SPEC §6.1) — but it is a *new* instance of it, across a boundary the multi-tab notice cannot see. Flagged in §10 (Q5); the honest v1 answer is a line in the server's README, not a mechanism.

---

## 10. Open questions — decisions for Mitchell

1. **Does the MCP server live in this repo?** It ends "no server code" as a literal statement even though nothing deploys. Options: a workspace package here (`packages/mcp/`) importing `src/lib/model/*` directly; or a separate repo consuming a published `@bc-canvas/model`. Duplicating the schema is not an option — that is the failure mode ticket 001 recorded and `examples.ts` was written against.
2. **Two write tools, or one?** §7 recommends `bcc_write_canvas` + `bcc_edit_canvas` with a Commit-shaped operation union. The alternative (whole-document only, agent re-emits) is genuinely defensible at ~850 tokens a canvas and would halve the surface. Which grain?
3. **Does `parse.ts` gain a detailed refusal?** §9.1 proposes a path-carrying `Refusal` with the app's single-sentence copy unchanged. It touches a module SPEC §3.3 describes and `parse.test.ts` pins.
4. **Natural-key collisions.** Two lanes named "Payments" is legal in the schema. Refuse the operation and name the collision, or apply to the first match? (Recommendation: refuse — silent first-match is the kind of thing an agent will never notice.)
5. **Agent writes vs. an open browser tab.** README warning, or something more? Related: should `bcc_write_canvas` refuse to overwrite a file changed since the agent last read it (a cheap mtime check)?
6. **Vocabulary in schema descriptions vs. a fetch tool.** §5.2 puts ~1.5 KB of one-liners in `tools/list`, paid every session. The alternative is a leaner list plus a mandatory `bcc_explain` call before any pick — cheaper per session, one more round trip, and skippable by the model. Which way?
7. **Do the four bundled Examples ship as resources?** Cheap, excellent few-shot, and already committed bytes. Risk: the model imitates the invented domains (Order Fulfillment shows up in every drafted canvas as a collaborator).
8. **MCP Apps preview (`ui://`), yes or no?** It is the only honest way to *show* the quiet sheet without an export, there is a first-party Svelte starter, and the `CanvasSheet` component already exists. But it is an extension with partial client support, and it would put a second renderer path next to the one SPEC §9 declares canonical. Defer, or prototype?
9. **Does any of this need a `/grilling` ticket at all**, or is an MCP server a separate map? The wayfinder map closed at "Signed off 2026-08-07 — the map is complete."

---

## 11. Recommendation

**Build a local stdio MCP server, in this repo, over `.bcc.json` files on disk, reusing `src/lib/model/*` unchanged.** It is an authoring-and-reading server whose whole value is that it carries the ddd-crew method — the curated vocabularies and the section questions — into the model's context at the moment of the pick. Target spec revision 2026-07-28.

- **Transport: stdio.** Remote Streamable HTTP reintroduces the backend the project deliberately doesn't have and drags in OAuth 2.1 and RFC 9728 as MUSTs; this revision also removed protocol sessions, so hosted canvas state would need explicit handles — worse than a filename. An in-browser bridge is not expressible in MCP's transport bindings at all.
- **Primitives:** canvases as **resources** under a templated `bcc://canvas/{path}` (list + path completion) *and* reachable by tool, with tool results carrying `resource_link`s to the same URIs — resources are application-driven, so a self-directed agent cannot depend on them alone. The Examples as resources. Facilitation as three **prompts**. Everything else as five **tools**.
- **Tools:** `bcc_list_canvases`, `bcc_read_canvas`, `bcc_write_canvas`, `bcc_edit_canvas`, `bcc_explain`. Whole-document write for drafting; one atomic, Commit-shaped batch-edit tool for surgery; natural-key addressing because the file has no row ids by design. Annotate honestly (`readOnlyHint`, `destructiveHint`, `openWorldHint: false`) while remembering annotations are untrusted hints, not enforcement.
- **Vocabularies live in the input schemas**, as `.describe()` text on `z.string()` fields — described strings for the escape-hatched vocabularies, a real `z.enum` only for `message.type`, which SPEC §3.2 genuinely closes. Off-vocabulary values are **accepted with a note**, matching the UI exactly; a server stricter than its editor is a bug.
- **Errors teach.** Validation failures are `isError: true` results naming the field, the expectation and the legal values — which requires making `parse.ts`'s single `not-canvas` refusal carry a path, without changing what the app shows the user. Newer `version` is refused with the file untouched, exactly as `parse.ts:131` does today.
- **Write canonical bytes atomically inside a configured root**, and stop there. No PNG, no HTML artifact, no undo, no locking, no library, nothing on stdout.

The three sharpest findings behind all of this: **Roots and Sampling are deprecated in 2026-07-28** (the root comes from configuration; the server never borrows the host's model), **a full Bounded Context Canvas is under a kilotoken** (which inverts the usual verdict against whole-document tools), and **no BC Canvas / ddd-crew MCP server exists** — the nearest neighbours are `context-mapper-mcp`'s 36 fine-grained CML tools and the JSON Canvas server's whole-document-plus-one-atomic-edit shape, which is the design this note independently arrives at.

## Sources

- MCP specification 2026-07-28 (checked 2026-08-09): [index](https://modelcontextprotocol.io/specification/latest) · [tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) · [resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) · [prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts) · [completion](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/completion) · [elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) · [sampling (deprecated)](https://modelcontextprotocol.io/specification/2026-07-28/client/sampling) · [roots (deprecated)](https://modelcontextprotocol.io/specification/2026-07-28/client/roots) · [transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports) · [stdio](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio) · [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) · [authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- Normative schema: [`schema/2026-07-28/schema.ts`](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) — `ToolAnnotations` at lines 1903–1954; 21 `@deprecated … (SEP-2577)` markers including `LoggingMessageNotificationParams` (line 2022)
- MCP Apps extension: [overview](https://modelcontextprotocol.io/extensions/apps/overview) · [ext-apps examples incl. Svelte starter](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples)
- TypeScript SDK v2 (`@modelcontextprotocol/server`): [README](https://github.com/modelcontextprotocol/typescript-sdk) · docs [tools](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/tools.md) · [resources](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/resources.md) · [prompts](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/prompts.md) · [errors](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/errors.md) · [completion](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/completion.md) · [notifications](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/notifications.md)
- Anthropic engineering: [Writing effective tools for AI agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- Prior art: [`thijs-hakkenberg/contextmapper_mcp`](https://github.com/thijs-hakkenberg/contextmapper_mcp) (npm `context-mapper-mcp` 1.1.0, 2026-02-04, via registry.npmjs.org) · [JSON Canvas MCP server](https://mcpservers.org/servers/Cam10001110101/mcp-server-obsidian-jsoncanvas) · [ddd-crew/bounded-context-canvas](https://github.com/ddd-crew/bounded-context-canvas) · [trustbit/Contexture](https://github.com/trustbit/Contexture)
- This repo: `SPEC.md` §§1–4, 6.1, 8.2, 9, 10 · `CONTEXT.md` · `wayfinder/map.md` · `wayfinder/tickets/001-contexture-schema-lessons.md`, `003-canvas-file-schema.md`, `012-reference-material.md` · `src/lib/model/{canvas,parse,serialize,embed}.ts` · `src/lib/editor/{vocab,document.svelte}.ts` · `src/lib/chrome/examples.ts` · `src/lib/artifact/{html,png}.ts` · `examples/*.bcc.json` · `vite.config.ts:16` · `src/routes/+layout.ts:1`
