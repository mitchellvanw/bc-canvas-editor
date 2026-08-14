#!/usr/bin/env node

// ../src/lib/fs/root.ts
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { realpathSync, statSync } from "node:fs";
var OutsideRoot = class extends Error {
  constructor(input, root) {
    super(
      `${input}: outside the canvas root. Paths are relative to ${root}, and a path out of it is not followed.`
    );
    this.input = input;
    this.root = root;
  }
  input;
  root;
};
function realAncestor(path) {
  const below = [];
  let at = path;
  for (; ; ) {
    try {
      return join(realpathSync(at), ...below);
    } catch {
      const up = dirname(at);
      if (up === at) return path;
      below.unshift(basename(at));
      at = up;
    }
  }
}
function boundary(root) {
  return root.endsWith(sep) ? root : root + sep;
}
function inside(path, root) {
  return path === root || path.startsWith(boundary(root));
}
function whyUnservable(path) {
  if (dirname(path) !== path) return null;
  return `${path} is the filesystem root, not a project \u2014 listing it would walk the whole disk.
Pass --root <directory>, naming the folder your canvases live under.`;
}
function openRoot(input) {
  const absolute = resolve(input);
  let path;
  try {
    path = realpathSync(absolute);
  } catch {
    throw new Error(`no such directory: ${absolute}`);
  }
  if (!statSync(path).isDirectory()) throw new Error(`not a directory: ${absolute}`);
  return {
    path,
    resolve(candidate) {
      const target = realAncestor(isAbsolute(candidate) ? candidate : resolve(path, candidate));
      if (!inside(target, path)) throw new OutsideRoot(candidate, path);
      return target;
    },
    relative(absolutePath) {
      if (!inside(absolutePath, path)) throw new OutsideRoot(absolutePath, path);
      return absolutePath.slice(boundary(path).length).split(sep).join("/");
    }
  };
}

// src/args.ts
var UsageError = class extends Error {
};
function known(spec) {
  return [...spec.booleans ?? [], ...spec.values ?? []].map((name) => `--${name}`).sort();
}
function parseOptions(argv, spec) {
  const booleans = /* @__PURE__ */ new Set();
  const values = /* @__PURE__ */ new Map();
  const operands = [];
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i];
    if (argument === "--") {
      operands.push(...argv.slice(i + 1));
      break;
    }
    if (!argument.startsWith("--")) {
      operands.push(argument);
      continue;
    }
    const split = argument.indexOf("=");
    const name = (split === -1 ? argument : argument.slice(0, split)).slice(2);
    if (spec.booleans?.includes(name)) {
      if (split !== -1) throw new UsageError(`--${name} takes no value.`);
      booleans.add(name);
      continue;
    }
    if (spec.values?.includes(name)) {
      const value = split === -1 ? argv[++i] : argument.slice(split + 1);
      if (value === void 0 || value === "") {
        throw new UsageError(`--${name} needs a value after it.`);
      }
      values.set(name, value);
      continue;
    }
    throw new UsageError(
      `no such option: ${argument}. This command takes ${known(spec).join(", ")}.`
    );
  }
  return { booleans, values, operands };
}

// src/check.ts
import { readFileSync as readFileSync2 } from "node:fs";

// ../src/lib/fs/read.ts
import { readFileSync } from "node:fs";

// ../src/lib/model/canvas.ts
var CANVAS_VERSION = 2;
function newId() {
  return crypto.randomUUID();
}
function stampLane(lane) {
  return {
    id: newId(),
    collaborator: { ...lane.collaborator },
    ...lane.relationship !== void 0 && { relationship: { ...lane.relationship } },
    messages: lane.messages.map((message2) => ({ ...message2, id: newId() }))
  };
}
function stampIds(file) {
  return {
    version: file.version,
    name: file.name,
    purpose: file.purpose,
    strategicClassification: { ...file.strategicClassification },
    domainRoles: file.domainRoles.map((role) => ({ ...role, id: newId() })),
    inboundCommunication: file.inboundCommunication.map(stampLane),
    ubiquitousLanguage: file.ubiquitousLanguage.map((row) => ({ ...row, id: newId() })),
    businessDecisions: file.businessDecisions.map((row) => ({ ...row, id: newId() })),
    outboundCommunication: file.outboundCommunication.map(stampLane),
    assumptions: [...file.assumptions],
    verificationMetrics: [...file.verificationMetrics],
    openQuestions: [...file.openQuestions]
  };
}

// ../src/lib/model/embed.ts
var OPEN = '<script type="application/json" data-canvas-file>';
var CLOSE = "</script>";
function embeddedCanvasBlock(json) {
  return `${OPEN}
${json}
${CLOSE}`;
}
function extractEmbeddedCanvas(text) {
  const open = text.indexOf(OPEN);
  if (open < 0) return null;
  const start = open + OPEN.length;
  const close = text.indexOf(CLOSE, start);
  if (close < 0) return null;
  return text.slice(start, close).trim();
}

// ../src/lib/model/parse.ts
function notCanvas(detail) {
  return { ok: false, reason: "not-canvas", detail: /[.!?]$/.test(detail) ? detail : `${detail}.` };
}
var NOT_JSON = "expected valid JSON";
function migrateLaneV1(item) {
  if (!isRecord(item)) return item;
  const { collaborator, relationship, ...rest2 } = item;
  return {
    ...rest2,
    ...collaborator !== void 0 && {
      collaborator: typeof collaborator === "string" ? { name: collaborator } : collaborator
    },
    ...relationship !== void 0 && {
      relationship: typeof relationship === "string" ? { ours: relationship } : relationship
    }
  };
}
function migrateLanesV1(raw, key) {
  const lanes2 = raw[key];
  return Array.isArray(lanes2) ? { [key]: lanes2.map(migrateLaneV1) } : {};
}
var MIGRATIONS = {
  // v1 → v2 (ticket canvas-file-v2): `description` becomes `purpose` —
  // upstream's own v4→v5 rename, adopted with the version bump — and the two
  // lane fields take their v2 shapes (see migrateLaneV1). Free text is never
  // rewritten: a domain role that stopped matching the picker vocabulary
  // survives exactly as typed.
  1: (raw) => {
    const { description, ...rest2 } = raw;
    return {
      ...rest2,
      version: 2,
      ...description !== void 0 && { purpose: description },
      ...migrateLanesV1(raw, "inboundCommunication"),
      ...migrateLanesV1(raw, "outboundCommunication")
    };
  }
};
var MESSAGE_TYPES = ["command", "query", "event"];
var COLLABORATOR_KINDS = [
  "bounded-context",
  "external-system",
  "frontend",
  "user"
];
var Refusal = class extends Error {
  constructor(path, expectation) {
    super(path === "" ? expectation : `${path}: ${expectation}`);
    this.path = path;
    this.expectation = expectation;
  }
  path;
  expectation;
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function typeName(value) {
  if (value === void 0) return "nothing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  switch (typeof value) {
    case "string":
      return "a string";
    case "number":
      return "a number";
    case "boolean":
      return "a boolean";
    case "object":
      return "an object";
    default:
      return typeof value;
  }
}
function field(path, key) {
  return path === "" ? key : `${path}.${key}`;
}
function asString(value, path) {
  if (typeof value !== "string") {
    throw new Refusal(path, `expected a string, got ${typeName(value)}`);
  }
  return value;
}
function optionalString(row, key, path) {
  const value = row[key];
  if (value === void 0) return {};
  if (typeof value !== "string") {
    throw new Refusal(
      field(path, key),
      `expected a string or no key at all, got ${typeName(value)}`
    );
  }
  return { [key]: value };
}
function asRows(value, path, row) {
  if (!Array.isArray(value)) throw new Refusal(path, `expected an array, got ${typeName(value)}`);
  return value.map((item, i) => {
    const at = `${path}[${i}]`;
    if (!isRecord(item)) throw new Refusal(at, `expected an object, got ${typeName(item)}`);
    return row(item, at);
  });
}
function asStrings(value, path) {
  if (!Array.isArray(value)) throw new Refusal(path, `expected an array, got ${typeName(value)}`);
  return value.map((item, i) => asString(item, `${path}[${i}]`));
}
function asClassification(value, path) {
  if (!isRecord(value)) throw new Refusal(path, `expected an object, got ${typeName(value)}`);
  return {
    ...optionalString(value, "domain", path),
    ...optionalString(value, "businessModel", path),
    ...optionalString(value, "evolution", path)
  };
}
function isMessageType(value) {
  return MESSAGE_TYPES.includes(value);
}
function asMessage(row, path) {
  const typePath = field(path, "type");
  const type = asString(row.type, typePath);
  if (!isMessageType(type)) {
    const allowed = MESSAGE_TYPES.map((t) => JSON.stringify(t)).join(", ");
    throw new Refusal(typePath, `expected one of ${allowed}, got ${JSON.stringify(type)}`);
  }
  return {
    type,
    name: asString(row.name, field(path, "name")),
    ...optionalString(row, "description", path)
  };
}
function isCollaboratorKind(value) {
  return COLLABORATOR_KINDS.includes(value);
}
function asCollaborator(value, path) {
  if (!isRecord(value)) throw new Refusal(path, `expected an object, got ${typeName(value)}`);
  const kindPath = field(path, "kind");
  const kind = value.kind;
  if (kind !== void 0 && typeof kind !== "string") {
    throw new Refusal(kindPath, `expected a string or no key at all, got ${typeName(kind)}`);
  }
  if (typeof kind === "string" && !isCollaboratorKind(kind)) {
    const allowed = COLLABORATOR_KINDS.map((k) => JSON.stringify(k)).join(", ");
    throw new Refusal(
      kindPath,
      `expected one of ${allowed} or no key at all, got ${JSON.stringify(kind)}`
    );
  }
  return {
    name: asString(value.name, field(path, "name")),
    ...kind !== void 0 && { kind }
  };
}
function asRelationship(value, path) {
  if (value === void 0) return {};
  if (!isRecord(value)) {
    throw new Refusal(path, `expected an object or no key at all, got ${typeName(value)}`);
  }
  return {
    relationship: {
      ...optionalString(value, "theirs", path),
      ...optionalString(value, "ours", path)
    }
  };
}
function asLane(row, path) {
  return {
    collaborator: asCollaborator(row.collaborator, field(path, "collaborator")),
    ...asRelationship(row.relationship, field(path, "relationship")),
    messages: asRows(row.messages, field(path, "messages"), asMessage)
  };
}
function asCanvasFile(raw) {
  return {
    version: CANVAS_VERSION,
    name: asString(raw.name, "name"),
    purpose: asString(raw.purpose, "purpose"),
    strategicClassification: asClassification(
      raw.strategicClassification,
      "strategicClassification"
    ),
    domainRoles: asRows(raw.domainRoles, "domainRoles", (row, path) => ({
      name: asString(row.name, field(path, "name"))
    })),
    inboundCommunication: asRows(raw.inboundCommunication, "inboundCommunication", asLane),
    ubiquitousLanguage: asRows(
      raw.ubiquitousLanguage,
      "ubiquitousLanguage",
      (row, path) => ({
        term: asString(row.term, field(path, "term")),
        ...optionalString(row, "definition", path)
      })
    ),
    businessDecisions: asRows(
      raw.businessDecisions,
      "businessDecisions",
      (row, path) => ({
        name: asString(row.name, field(path, "name")),
        ...optionalString(row, "description", path)
      })
    ),
    outboundCommunication: asRows(raw.outboundCommunication, "outboundCommunication", asLane),
    assumptions: asStrings(raw.assumptions, "assumptions"),
    verificationMetrics: asStrings(raw.verificationMetrics, "verificationMetrics"),
    openQuestions: asStrings(raw.openQuestions, "openQuestions")
  };
}
function parseCanvasFile(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return notCanvas(`${NOT_JSON} (${error instanceof Error ? error.message : String(error)})`);
  }
  if (!isRecord(raw)) {
    return notCanvas(`expected a JSON object at the top level, got ${typeName(raw)}`);
  }
  const version = raw.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    const got = typeof version === "number" ? String(version) : typeName(version);
    return notCanvas(`version: expected an integer of 1 or more, got ${got}`);
  }
  if (version > CANVAS_VERSION) return { ok: false, reason: "newer-version", version };
  let migrated = raw;
  for (let v = version; v < CANVAS_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) throw new Error(`No migration from Canvas file version ${v} to ${v + 1}`);
    migrated = migrate(migrated);
  }
  try {
    return {
      ok: true,
      file: asCanvasFile(migrated),
      ...version < CANVAS_VERSION && { migratedFrom: version }
    };
  } catch (error) {
    if (error instanceof Refusal) return notCanvas(error.message);
    throw error;
  }
}
var NEITHER_FORM = "expected a Canvas file (JSON) or an HTML artifact carrying an embedded Canvas file; this text is neither";
function parseCanvasImport(text) {
  const direct = parseCanvasFile(text);
  if (direct.ok || direct.reason === "newer-version") return direct;
  const embedded = extractEmbeddedCanvas(text);
  if (embedded !== null) return parseCanvasFile(embedded);
  return direct.detail?.startsWith(NOT_JSON) ? notCanvas(NEITHER_FORM) : direct;
}

// ../src/lib/fs/read.ts
function readCanvas(root, input) {
  let absolute;
  try {
    absolute = root.resolve(input);
  } catch (error) {
    if (error instanceof OutsideRoot) {
      return { ok: false, reason: "outside-root", path: input, detail: error.message };
    }
    throw error;
  }
  const path = root.relative(absolute);
  let raw;
  try {
    raw = readFileSync(absolute, "utf8");
  } catch (error) {
    return {
      ok: false,
      reason: "unreadable",
      path,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
  const parsed = parseCanvasImport(raw);
  if (!parsed.ok) {
    return parsed.reason === "newer-version" ? { ok: false, reason: "newer-version", path, version: parsed.version } : { ok: false, reason: "not-canvas", path, detail: parsed.detail };
  }
  const text = parseCanvasFile(raw).ok ? raw : extractEmbeddedCanvas(raw) ?? raw;
  return { ok: true, path, file: parsed.file, text };
}
function readProblem(result, disclosure = {}) {
  const detail = disclosure.detail ?? true;
  switch (result.reason) {
    case "outside-root":
      return detail ? result.detail : `${result.path}: outside the canvas root, and a path out of it is not followed.`;
    case "unreadable":
      return detail ? `${result.path}: could not be read (${result.detail}).` : `${result.path}: could not be read.`;
    case "newer-version":
      return `${result.path}: written by a newer version of BC Canvas (format version ${result.version}); version ${CANVAS_VERSION} is the newest that can be read here.`;
    case "not-canvas":
      return `${result.path}: ${(detail ? result.detail : void 0) ?? "not a Canvas file."}`;
  }
}

// src/image.ts
import { extname } from "node:path";

// ../src/lib/render/dist/render.js
var UNINITIALIZED = /* @__PURE__ */ Symbol("uninitialized");
var ATTR_REGEX = /[&"<]/g;
var CONTENT_REGEX = /[&<]/g;
function escape_html(value, is_attr) {
  const str = String(value ?? "");
  const pattern = is_attr ? ATTR_REGEX : CONTENT_REGEX;
  pattern.lastIndex = 0;
  let escaped2 = "";
  let last = 0;
  while (pattern.test(str)) {
    const i = pattern.lastIndex - 1;
    const ch = str[i];
    escaped2 += str.substring(last, i) + (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;");
    last = i + 1;
  }
  return escaped2 + str.substring(last);
}
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx$1() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}
Array.prototype.indexOf;
Array.prototype.includes;
Array.prototype;
var has_own_property = Object.prototype.hasOwnProperty;
var noop = () => {
};
function deferred() {
  var resolve2;
  var reject;
  return {
    promise: new Promise((res, rej) => {
      resolve2 = res;
      reject = rej;
    }),
    resolve: resolve2,
    reject
  };
}
var replacements = { translate: /* @__PURE__ */ new Map([[true, "yes"], [false, "no"]]) };
function attr(name, value, is_boolean = false) {
  if (name === "hidden" && value !== "until-found") is_boolean = true;
  if (value == null || !value && is_boolean) return "";
  const normalized = has_own_property.call(replacements, name) && replacements[name].get(value) || value;
  return ` ${name}${is_boolean ? `=""` : `="${escape_html(normalized, true)}"`}`;
}
function clsx(value) {
  if (typeof value === "object") return clsx$1(value);
  else return value ?? "";
}
var whitespace = [..." 	\n\r\f\xA0\v\uFEFF"];
function to_class(value, hash, directives) {
  var classname = value == null ? "" : "" + value;
  if (hash) classname = classname ? classname + " " + hash : hash;
  if (directives) {
    for (var key of Object.keys(directives)) if (directives[key]) classname = classname ? classname + " " + key : key;
    else if (classname.length) {
      var len = key.length;
      var a = 0;
      while ((a = classname.indexOf(key, a)) >= 0) {
        var b = a + len;
        if ((a === 0 || whitespace.includes(classname[a - 1])) && (b === classname.length || whitespace.includes(classname[b]))) classname = (a === 0 ? "" : classname.substring(0, a)) + classname.substring(b + 1);
        else a = b;
      }
    }
  }
  return classname === "" ? null : classname;
}
function append_styles(styles, important = false) {
  var separator = important ? " !important;" : ";";
  var css = "";
  for (var key of Object.keys(styles)) {
    var value = styles[key];
    if (value != null && value !== "") css += " " + key + ": " + value + separator;
  }
  return css;
}
function to_css_name(name) {
  if (name[0] !== "-" || name[1] !== "-") return name.toLowerCase();
  return name;
}
function to_style(value, styles) {
  if (styles) {
    var new_style = "";
    var normal_styles;
    var important_styles;
    if (Array.isArray(styles)) {
      normal_styles = styles[0];
      important_styles = styles[1];
    } else normal_styles = styles;
    if (value) {
      value = String(value).replaceAll(/\s*\/\*.*?\*\/\s*/g, "").trim();
      var in_str = false;
      var in_apo = 0;
      var in_comment = false;
      var reserved_names = [];
      if (normal_styles) reserved_names.push(...Object.keys(normal_styles).map(to_css_name));
      if (important_styles) reserved_names.push(...Object.keys(important_styles).map(to_css_name));
      var start_index = 0;
      var name_index = -1;
      const len = value.length;
      for (var i = 0; i < len; i++) {
        var c = value[i];
        if (in_comment) {
          if (c === "/" && value[i - 1] === "*") in_comment = false;
        } else if (in_str) {
          if (in_str === c) in_str = false;
        } else if (c === "/" && value[i + 1] === "*") in_comment = true;
        else if (c === '"' || c === "'") in_str = c;
        else if (c === "(") in_apo++;
        else if (c === ")") in_apo--;
        if (!in_comment && in_str === false && in_apo === 0) {
          if (c === ":" && name_index === -1) name_index = i;
          else if (c === ";" || i === len - 1) {
            if (name_index !== -1) {
              var name = to_css_name(value.substring(start_index, name_index).trim());
              if (!reserved_names.includes(name)) {
                if (c !== ";") i++;
                var property = value.substring(start_index, i).trim();
                new_style += " " + property + ";";
              }
            }
            start_index = i + 1;
            name_index = -1;
          }
        }
      }
    }
    if (normal_styles) new_style += append_styles(normal_styles);
    if (important_styles) new_style += append_styles(important_styles, true);
    new_style = new_style.trim();
    return new_style === "" ? null : new_style;
  }
  return value == null ? null : String(value);
}
var CLEAN = 1024;
var DIRTY = 2048;
var MAYBE_DIRTY = 4096;
var EFFECT_TRANSPARENT = 65536;
var EFFECT_PRESERVED = 1 << 19;
var STALE_REACTION = new class StaleReactionError extends Error {
  name = "StaleReactionError";
  message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}();
globalThis.document?.contentType;
var async_mode_flag = false;
~(DIRTY | MAYBE_DIRTY | CLEAN);
EFFECT_TRANSPARENT | EFFECT_PRESERVED;
var BLOCK_OPEN = `<!--[-->`;
var BLOCK_CLOSE = `<!--]-->`;
var DOM_BOOLEAN_ATTRIBUTES = [
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "webkitdirectory",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback"
];
function is_boolean_attribute(name) {
  return DOM_BOOLEAN_ATTRIBUTES.includes(name);
}
[...DOM_BOOLEAN_ATTRIBUTES];
var controller = null;
function abort() {
  controller?.abort(STALE_REACTION);
  controller = null;
}
function async_local_storage_unavailable() {
  const error = /* @__PURE__ */ new Error(`async_local_storage_unavailable
The node API \`AsyncLocalStorage\` is not available, but is required to use async server rendering.
https://svelte.dev/e/async_local_storage_unavailable`);
  error.name = "Svelte error";
  throw error;
}
function await_invalid() {
  const error = /* @__PURE__ */ new Error(`await_invalid
Encountered asynchronous work while rendering synchronously.
https://svelte.dev/e/await_invalid`);
  error.name = "Svelte error";
  throw error;
}
function html_deprecated() {
  const error = /* @__PURE__ */ new Error(`html_deprecated
The \`html\` property of server render results has been deprecated. Use \`body\` instead.
https://svelte.dev/e/html_deprecated`);
  error.name = "Svelte error";
  throw error;
}
function invalid_csp() {
  const error = /* @__PURE__ */ new Error(`invalid_csp
\`csp.nonce\` was set while \`csp.hash\` was \`true\`. These options cannot be used simultaneously.
https://svelte.dev/e/invalid_csp`);
  error.name = "Svelte error";
  throw error;
}
function invalid_id_prefix() {
  const error = /* @__PURE__ */ new Error(`invalid_id_prefix
The \`idPrefix\` option cannot include \`--\`.
https://svelte.dev/e/invalid_id_prefix`);
  error.name = "Svelte error";
  throw error;
}
function server_context_required() {
  const error = /* @__PURE__ */ new Error(`server_context_required
Could not resolve \`render\` context.
https://svelte.dev/e/server_context_required`);
  error.name = "Svelte error";
  throw error;
}
var ssr_context = null;
function set_ssr_context(v) {
  ssr_context = v;
}
function push(fn) {
  ssr_context = {
    p: ssr_context,
    c: null,
    r: null
  };
}
function pop() {
  ssr_context = ssr_context.p;
}
function unresolved_hydratable(key, stack) {
  console.warn(`https://svelte.dev/e/unresolved_hydratable`);
}
var current_render = null;
var context = null;
function get_render_context() {
  const store = context ?? als?.getStore();
  if (!store) server_context_required();
  return store;
}
async function with_render_context(fn) {
  context = { hydratable: {
    lookup: /* @__PURE__ */ new Map(),
    comparisons: [],
    unresolved_promises: /* @__PURE__ */ new Map()
  } };
  if (in_webcontainer()) {
    const { promise, resolve: resolve2 } = deferred();
    const previous_render = current_render;
    current_render = promise;
    await previous_render;
    return fn().finally(resolve2);
  }
  try {
    if (als === null) async_local_storage_unavailable();
    return als.run(context, fn);
  } finally {
    context = null;
  }
}
var als = null;
var als_import = null;
function init_render_context() {
  als_import ??= import("node:async_hooks").then((hooks) => {
    als = new hooks.AsyncLocalStorage();
  }).then(noop, noop);
  return als_import;
}
function in_webcontainer() {
  return !!globalThis.process?.versions?.webcontainer;
}
var text_encoder;
var crypto$1;
var obfuscated_import = (module_name) => import(
  /* @vite-ignore */
  module_name
);
async function sha256(data) {
  text_encoder ??= new TextEncoder();
  crypto$1 ??= globalThis.crypto?.subtle?.digest ? globalThis.crypto : (await obfuscated_import("node:crypto")).webcrypto;
  return base64_encode(await crypto$1.subtle.digest("SHA-256", text_encoder.encode(data)));
}
function base64_encode(bytes) {
  if (globalThis.Buffer) return globalThis.Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
var MAX_ARRAY_INDEX = 2 ** 32 - 1 - 1;
var escaped = {
  "<": "\\u003C",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var DevalueError = class extends Error {
  /**
  * @param {string} message
  * @param {string[]} keys
  * @param {any} [value] - The value that failed to be serialized
  * @param {any} [root] - The root value being serialized
  */
  constructor(message2, keys, value, root) {
    super(message2);
    this.name = "DevalueError";
    this.path = keys.join("");
    this.value = value;
    this.root = root;
  }
};
function is_primitive(thing) {
  return thing === null || typeof thing !== "object" && typeof thing !== "function";
}
var object_proto_names = /* @__PURE__ */ Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function is_plain_object(thing) {
  const proto = Object.getPrototypeOf(thing);
  return proto === Object.prototype || proto === null || Object.getPrototypeOf(proto) === null || Object.getOwnPropertyNames(proto).sort().join("\0") === object_proto_names;
}
function get_type(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function get_escaped_char(char) {
  switch (char) {
    case '"':
      return '\\"';
    case "<":
      return "\\u003C";
    case "\\":
      return "\\\\";
    case "\n":
      return "\\n";
    case "\r":
      return "\\r";
    case "	":
      return "\\t";
    case "\b":
      return "\\b";
    case "\f":
      return "\\f";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return char < " " ? `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}` : "";
  }
}
function stringify_string(str) {
  let result = "";
  let last_pos = 0;
  const len = str.length;
  for (let i = 0; i < len; i += 1) {
    const char = str[i];
    const replacement = get_escaped_char(char);
    if (replacement) {
      result += str.slice(last_pos, i) + replacement;
      last_pos = i + 1;
    }
  }
  return `"${last_pos === 0 ? str : result + str.slice(last_pos)}"`;
}
function enumerable_symbols(object) {
  return Object.getOwnPropertySymbols(object).filter((symbol) => Object.getOwnPropertyDescriptor(object, symbol).enumerable);
}
var is_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function stringify_key(key) {
  return is_identifier.test(key) ? "." + key : "[" + JSON.stringify(key) + "]";
}
function is_valid_array_index(n) {
  if (!Number.isInteger(n)) return false;
  if (n < 0) return false;
  if (n > MAX_ARRAY_INDEX) return false;
  return true;
}
function is_valid_array_index_string(s) {
  if (s.length === 0) return false;
  if (s.length > 1 && s.charCodeAt(0) === 48) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return is_valid_array_index(+s);
}
function array_index_cut(keys) {
  for (var i = keys.length - 1; i >= 0; i--) if (is_valid_array_index_string(keys[i])) break;
  return i + 1;
}
function valid_array_indices(array) {
  const keys = Object.keys(array);
  keys.length = array_index_cut(keys);
  return keys;
}
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafe_chars = /[<\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
function uneval(value, replacer) {
  const counts = /* @__PURE__ */ new Map();
  const keys = [];
  const custom = /* @__PURE__ */ new Map();
  function walk(thing) {
    if (!is_primitive(thing)) {
      if (counts.has(thing)) {
        counts.set(thing, counts.get(thing) + 1);
        return;
      }
      counts.set(thing, 1);
      if (replacer) {
        const str2 = replacer(thing, (value2) => uneval(value2, replacer));
        if (typeof str2 === "string") {
          custom.set(thing, str2);
          return;
        }
      }
      if (typeof thing === "function") throw new DevalueError(`Cannot stringify a function`, keys, thing, value);
      switch (get_type(thing)) {
        case "Number":
        case "BigInt":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
        case "URL":
        case "URLSearchParams":
          return;
        case "Array":
          thing.forEach((value2, i) => {
            keys.push(`[${i}]`);
            walk(value2);
            keys.pop();
          });
          break;
        case "Set":
          Array.from(thing).forEach(walk);
          break;
        case "Map":
          for (const [key, value2] of thing) {
            keys.push(`.get(${is_primitive(key) ? stringify_primitive(key) : "..."})`);
            walk(key);
            walk(value2);
            keys.pop();
          }
          break;
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Float16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array":
        case "DataView":
          walk(thing.buffer);
          return;
        case "ArrayBuffer":
          return;
        case "Temporal.Duration":
        case "Temporal.Instant":
        case "Temporal.PlainDate":
        case "Temporal.PlainTime":
        case "Temporal.PlainDateTime":
        case "Temporal.PlainMonthDay":
        case "Temporal.PlainYearMonth":
        case "Temporal.ZonedDateTime":
          return;
        default:
          if (!is_plain_object(thing)) throw new DevalueError(`Cannot stringify arbitrary non-POJOs`, keys, thing, value);
          if (enumerable_symbols(thing).length > 0) throw new DevalueError(`Cannot stringify POJOs with symbolic keys`, keys, thing, value);
          for (const key of Object.keys(thing)) {
            if (key === "__proto__") throw new DevalueError(`Cannot stringify objects with __proto__ keys`, keys, thing, value);
            keys.push(stringify_key(key));
            walk(thing[key]);
            keys.pop();
          }
      }
    } else if (typeof thing === "symbol") throw new DevalueError(`Cannot stringify a Symbol primitive`, keys, thing, value);
  }
  walk(value);
  const names = /* @__PURE__ */ new Map();
  Array.from(counts).filter((entry) => entry[1] > 1).sort((a, b) => b[1] - a[1]).forEach((entry, i) => {
    names.set(entry[0], get_name(i));
  });
  function stringify2(thing) {
    if (names.has(thing)) return names.get(thing);
    if (is_primitive(thing)) return stringify_primitive(thing);
    if (custom.has(thing)) return custom.get(thing);
    const type = get_type(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
      case "BigInt":
        return `Object(${stringify2(thing.valueOf())})`;
      case "RegExp":
        const { source, flags } = thing;
        return flags ? `new RegExp(${stringify_string(source)},"${flags}")` : `new RegExp(${stringify_string(source)})`;
      case "Date":
        return `new Date(${thing.getTime()})`;
      case "URL":
        return `new URL(${stringify_string(thing.toString())})`;
      case "URLSearchParams":
        return `new URLSearchParams(${stringify_string(thing.toString())})`;
      case "Array": {
        let has_holes = false;
        let result = "[";
        for (let i = 0; i < thing.length; i += 1) {
          if (i > 0) result += ",";
          if (Object.hasOwn(thing, i)) result += stringify2(thing[i]);
          else if (!has_holes) {
            const populated_keys = valid_array_indices(thing);
            const population = populated_keys.length;
            const d = String(thing.length).length;
            if (thing.length + 2 > 25 + d + population * (d + 2)) {
              const entries = populated_keys.map((k) => `${k}:${stringify2(thing[k])}`).join(",");
              return `Object.assign(Array(${thing.length}),{${entries}})`;
            }
            has_holes = true;
          }
        }
        const tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return result + tail + "]";
      }
      case "Set":
      case "Map":
        return `new ${type}([${Array.from(thing).map(stringify2).join(",")}])`;
      case "Int8Array":
      case "Uint8Array":
      case "Uint8ClampedArray":
      case "Int16Array":
      case "Uint16Array":
      case "Float16Array":
      case "Int32Array":
      case "Uint32Array":
      case "Float32Array":
      case "Float64Array":
      case "BigInt64Array":
      case "BigUint64Array": {
        let str2 = `new ${type}`;
        if (!names.has(thing.buffer)) str2 += `([${stringify_typed_array_elements(new thing.constructor(thing.buffer))}])`;
        else str2 += `(${stringify2(thing.buffer)})`;
        if (thing.byteLength !== thing.buffer.byteLength) {
          const start = thing.byteOffset / thing.BYTES_PER_ELEMENT;
          const end = start + thing.length;
          str2 += `.subarray(${start},${end})`;
        }
        return str2;
      }
      case "DataView": {
        let str2 = `new DataView`;
        if (!names.has(thing.buffer)) str2 += `(new Uint8Array([${new Uint8Array(thing.buffer)}]).buffer`;
        else str2 += `(${stringify2(thing.buffer)}`;
        if (thing.byteLength !== thing.buffer.byteLength) str2 += `,${thing.byteOffset},${thing.byteLength}`;
        return str2 + ")";
      }
      case "ArrayBuffer":
        return `new Uint8Array([${new Uint8Array(thing).toString()}]).buffer`;
      case "Temporal.Duration":
      case "Temporal.Instant":
      case "Temporal.PlainDate":
      case "Temporal.PlainTime":
      case "Temporal.PlainDateTime":
      case "Temporal.PlainMonthDay":
      case "Temporal.PlainYearMonth":
      case "Temporal.ZonedDateTime":
        return `${type}.from(${stringify_string(thing.toString())})`;
      default:
        const keys2 = Object.keys(thing);
        const obj = keys2.map((key) => `${safe_key(key)}:${stringify2(thing[key])}`).join(",");
        if (Object.getPrototypeOf(thing) === null) return keys2.length > 0 ? `{${obj},__proto__:null}` : `{__proto__:null}`;
        return `{${obj}}`;
    }
  }
  const str = stringify2(value);
  if (names.size) {
    const params = [];
    const statements = [];
    const values = [];
    const reconstructions = [];
    names.forEach((name, thing) => {
      params.push(name);
      if (custom.has(thing)) {
        values.push(custom.get(thing));
        return;
      }
      if (is_primitive(thing)) {
        values.push(stringify_primitive(thing));
        return;
      }
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "BigInt":
          values.push(`Object(${stringify2(thing.valueOf())})`);
          break;
        case "RegExp":
          const { source, flags } = thing;
          const regexp = flags ? `new RegExp(${stringify_string(source)},"${flags}")` : `new RegExp(${stringify_string(source)})`;
          values.push(regexp);
          break;
        case "Date":
          values.push(`new Date(${thing.getTime()})`);
          break;
        case "URL":
          values.push(`new URL(${stringify_string(thing.toString())})`);
          break;
        case "URLSearchParams":
          values.push(`new URLSearchParams(${stringify_string(thing.toString())})`);
          break;
        case "Array":
          values.push(`Array(${thing.length})`);
          thing.forEach((v, i) => {
            statements.push(`${name}[${i}]=${stringify2(v)}`);
          });
          break;
        case "Set": {
          values.push(`new Set`);
          const adds = Array.from(thing).map((v) => `.add(${stringify2(v)})`);
          if (adds.length > 0) statements.push(name + adds.join(""));
          break;
        }
        case "Map": {
          values.push(`new Map`);
          const sets = Array.from(thing).map(([k, v]) => `.set(${stringify2(k)}, ${stringify2(v)})`);
          if (sets.length > 0) statements.push(name + sets.join(""));
          break;
        }
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Float16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array": {
          let str2 = `new ${type}`;
          if (!names.has(thing.buffer)) str2 += `([${stringify_typed_array_elements(new thing.constructor(thing.buffer))}])`;
          else str2 += `(${stringify2(thing.buffer)})`;
          if (thing.byteLength !== thing.buffer.byteLength) {
            const start = thing.byteOffset / thing.BYTES_PER_ELEMENT;
            const end = start + thing.length;
            str2 += `.subarray(${start},${end})`;
          }
          values.push(`{}`);
          reconstructions.push(`${name}=${str2}`);
          break;
        }
        case "DataView": {
          let str2 = `new DataView`;
          if (!names.has(thing.buffer)) str2 += `(new Uint8Array([${new Uint8Array(thing.buffer)}]).buffer`;
          else str2 += `(${stringify2(thing.buffer)}`;
          if (thing.byteLength !== thing.buffer.byteLength) str2 += `,${thing.byteOffset},${thing.byteLength}`;
          str2 += ")";
          values.push(`{}`);
          reconstructions.push(`${name}=${str2}`);
          break;
        }
        case "ArrayBuffer":
          values.push(`new Uint8Array([${new Uint8Array(thing)}]).buffer`);
          break;
        case "Temporal.Duration":
        case "Temporal.Instant":
        case "Temporal.PlainDate":
        case "Temporal.PlainTime":
        case "Temporal.PlainDateTime":
        case "Temporal.PlainMonthDay":
        case "Temporal.PlainYearMonth":
        case "Temporal.ZonedDateTime":
          values.push(`${type}.from(${stringify_string(thing.toString())})`);
          break;
        default:
          values.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach((key) => {
            statements.push(`${name}${safe_prop(key)}=${stringify2(thing[key])}`);
          });
      }
    });
    statements.push(`return ${str}`);
    const body2 = [...reconstructions, ...statements].join(";");
    return `(function(${params.join(",")}){${body2}}(${values.join(",")}))`;
  } else return str;
}
function stringify_typed_array_elements(array) {
  if (array instanceof BigInt64Array || array instanceof BigUint64Array) return Array.from(array, (element) => `${element}n`).join(",");
  return array.toString();
}
function get_name(num) {
  let name = "";
  do {
    name = chars[num % 54] + name;
    num = ~~(num / 54) - 1;
  } while (num >= 0);
  return reserved.test(name) ? `${name}0` : name;
}
function escape_unsafe_char(c) {
  return escaped[c] || c;
}
function escape_unsafe_chars(str) {
  return str.replace(unsafe_chars, escape_unsafe_char);
}
function safe_key(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escape_unsafe_chars(JSON.stringify(key));
}
function safe_prop(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? `.${key}` : `[${escape_unsafe_chars(JSON.stringify(key))}]`;
}
function stringify_primitive(thing) {
  const type = typeof thing;
  if (type === "string") return stringify_string(thing);
  if (thing === void 0) return "void 0";
  if (thing === 0 && 1 / thing < 0) return "-0";
  const str = String(thing);
  if (type === "number") return str.replace(/^(-)?0\./, "$1.");
  if (type === "bigint") return thing + "n";
  return str;
}
var Renderer = class Renderer2 {
  /**
  * The contents of the renderer.
  * @type {RendererItem[]}
  */
  #out = [];
  /**
  * Any `onDestroy` callbacks registered during execution of this renderer.
  * @type {(() => void)[] | undefined}
  */
  #on_destroy = void 0;
  /**
  * Whether this renderer is a component body.
  * @type {boolean}
  */
  #is_component_body = false;
  /**
  * If set, this renderer is an error boundary. When async collection
  * of the children fails, the failed snippet is rendered instead.
  * @type {{
  * 	failed: (renderer: Renderer, error: unknown, reset: () => void) => void;
  * 	transformError: (error: unknown) => unknown;
  * 	context: SSRContext | null;
  * } | null}
  */
  #boundary = null;
  /**
  * The type of string content that this renderer is accumulating.
  * @type {RendererType}
  */
  type;
  /** @type {Renderer | undefined} */
  #parent;
  /**
  * Asynchronous work associated with this renderer
  * @type {Promise<void> | undefined}
  */
  promise = void 0;
  /**
  * State which is associated with the content tree as a whole.
  * It will be re-exposed, uncopied, on all children.
  * @type {SSRState}
  * @readonly
  */
  global;
  /**
  * State that is local to the branch it is declared in.
  * It will be shallow-copied to all children.
  *
  * @type {{ select_value: string | undefined }}
  */
  local;
  /**
  * @param {SSRState} global
  * @param {Renderer | undefined} [parent]
  */
  constructor(global, parent) {
    this.#parent = parent;
    this.global = global;
    this.local = parent ? { ...parent.local } : { select_value: void 0 };
    this.type = parent ? parent.type : "body";
  }
  /**
  * @param {(renderer: Renderer) => void} fn
  */
  head(fn) {
    const head = new Renderer2(this.global, this);
    head.type = "head";
    this.#out.push(head);
    head.child(fn);
  }
  /**
  * @param {Array<Promise<void>>} blockers
  * @param {(renderer: Renderer) => void} fn
  */
  async_block(blockers, fn) {
    this.#out.push(BLOCK_OPEN);
    this.async(blockers, fn);
    this.#out.push(BLOCK_CLOSE);
  }
  /**
  * @param {Array<Promise<void>>} blockers
  * @param {(renderer: Renderer) => void} fn
  */
  async(blockers, fn) {
    let callback = fn;
    if (blockers.length > 0) {
      const context2 = ssr_context;
      callback = (renderer) => {
        return Promise.all(blockers).then(() => {
          const previous_context = ssr_context;
          try {
            set_ssr_context(context2);
            return fn(renderer);
          } finally {
            set_ssr_context(previous_context);
          }
        });
      };
    }
    this.child(callback);
  }
  /**
  * @param {Array<() => void>} thunks
  */
  run(thunks) {
    const context2 = ssr_context;
    let promise = Promise.resolve(thunks[0]());
    const promises = [promise];
    for (const fn of thunks.slice(1)) {
      promise = promise.then(() => {
        const previous_context = ssr_context;
        set_ssr_context(context2);
        try {
          return fn();
        } finally {
          set_ssr_context(previous_context);
        }
      });
      promises.push(promise);
    }
    promise.catch(noop);
    this.promise = promise;
    return promises;
  }
  /**
  * @param {(renderer: Renderer) => MaybePromise<void>} fn
  */
  child_block(fn) {
    this.#out.push(BLOCK_OPEN);
    this.child(fn);
    this.#out.push(BLOCK_CLOSE);
  }
  /**
  * Create a child renderer. The child renderer inherits the state from the parent,
  * but has its own content.
  * @param {(renderer: Renderer) => MaybePromise<void>} fn
  */
  child(fn) {
    const child = new Renderer2(this.global, this);
    this.#out.push(child);
    const parent = ssr_context;
    set_ssr_context({
      ...ssr_context,
      p: parent,
      c: null,
      r: child
    });
    const result = fn(child);
    set_ssr_context(parent);
    if (result instanceof Promise) {
      result.catch(noop);
      result.finally(() => set_ssr_context(null)).catch(noop);
      if (child.global.mode === "sync") await_invalid();
      child.promise = result;
    }
    return child;
  }
  /**
  * Render children inside an error boundary. If the children throw and the API-level
  * `transformError` transform handles the error (doesn't re-throw), the `failed` snippet is
  * rendered instead. Otherwise the error propagates.
  *
  * @param {{ failed?: (renderer: Renderer, error: unknown, reset: () => void) => void }} props
  * @param {(renderer: Renderer) => MaybePromise<void>} children_fn
  */
  boundary(props, children_fn) {
    const child = new Renderer2(this.global, this);
    this.#out.push(child);
    const parent_context = ssr_context;
    if (props.failed) child.#boundary = {
      failed: props.failed,
      transformError: this.global.transformError,
      context: parent_context
    };
    set_ssr_context({
      ...ssr_context,
      p: parent_context,
      c: null,
      r: child
    });
    try {
      const result = children_fn(child);
      set_ssr_context(parent_context);
      if (result instanceof Promise) {
        if (child.global.mode === "sync") await_invalid();
        result.catch(noop);
        child.promise = result;
      }
    } catch (error) {
      set_ssr_context(parent_context);
      const failed_snippet = props.failed;
      if (!failed_snippet) throw error;
      const result = this.global.transformError(error);
      child.#out.length = 0;
      child.#boundary = null;
      if (result instanceof Promise) {
        if (this.global.mode === "sync") await_invalid();
        child.promise = result.then((transformed) => {
          set_ssr_context(parent_context);
          child.#out.push(Renderer2.#serialize_failed_boundary(transformed));
          failed_snippet(child, transformed, noop);
          child.#out.push(BLOCK_CLOSE);
        });
        child.promise.catch(noop);
      } else {
        child.#out.push(Renderer2.#serialize_failed_boundary(result));
        failed_snippet(child, result, noop);
        child.#out.push(BLOCK_CLOSE);
      }
    }
  }
  /**
  * Create a component renderer. The component renderer inherits the state from the parent,
  * but has its own content. It is treated as an ordering boundary for ondestroy callbacks.
  * @param {(renderer: Renderer) => MaybePromise<void>} fn
  * @param {Function} [component_fn]
  * @returns {void}
  */
  component(fn, component_fn) {
    push(component_fn);
    const child = this.child(fn);
    child.#is_component_body = true;
    pop();
  }
  /**
  * @param {Record<string, any>} attrs
  * @param {(renderer: Renderer) => void} fn
  * @param {string | undefined} [css_hash]
  * @param {Record<string, boolean> | undefined} [classes]
  * @param {Record<string, string> | undefined} [styles]
  * @param {number | undefined} [flags]
  * @param {boolean | undefined} [is_rich]
  * @returns {void}
  */
  select(attrs, fn, css_hash, classes, styles, flags, is_rich) {
    const { value, ...select_attrs } = attrs;
    this.push(`<select${attributes(select_attrs, css_hash, classes, styles, flags)}>`);
    this.child((renderer) => {
      renderer.local.select_value = value;
      fn(renderer);
    });
    this.push(`${is_rich ? "<!>" : ""}</select>`);
  }
  /**
  * @param {Record<string, any>} attrs
  * @param {string | number | boolean | ((renderer: Renderer) => void)} body
  * @param {string | undefined} [css_hash]
  * @param {Record<string, boolean> | undefined} [classes]
  * @param {Record<string, string> | undefined} [styles]
  * @param {number | undefined} [flags]
  * @param {boolean | undefined} [is_rich]
  */
  option(attrs, body2, css_hash, classes, styles, flags, is_rich) {
    this.#out.push(`<option${attributes(attrs, css_hash, classes, styles, flags)}`);
    const close = (renderer, value, { head, body: body3 }) => {
      if (has_own_property.call(attrs, "value")) value = attrs.value;
      if (value === this.local.select_value) renderer.#out.push(' selected=""');
      renderer.#out.push(`>${body3}${is_rich ? "<!>" : ""}</option>`);
      if (head) renderer.head((child) => child.push(head));
    };
    if (typeof body2 === "function") this.child((renderer) => {
      const r2 = new Renderer2(this.global, this);
      body2(r2);
      if (this.global.mode === "async") return r2.#collect_content_async().then((content) => {
        close(renderer, content.body.replaceAll("<!---->", ""), content);
      });
      else {
        const content = r2.#collect_content();
        close(renderer, content.body.replaceAll("<!---->", ""), content);
      }
    });
    else close(this, body2, { body: escape_html(body2) });
  }
  /**
  * @param {(renderer: Renderer) => void} fn
  */
  title(fn) {
    const path = this.get_path();
    const close = (head) => {
      this.global.set_title(head, path);
    };
    this.child((renderer) => {
      const r2 = new Renderer2(renderer.global, renderer);
      fn(r2);
      if (renderer.global.mode === "async") return r2.#collect_content_async().then((content) => {
        close(content.head);
      });
      else {
        const content = r2.#collect_content();
        close(content.head);
      }
    });
  }
  /**
  * @param {string | (() => Promise<string>)} content
  */
  push(content) {
    if (typeof content === "function") this.child(async (renderer) => renderer.push(await content()));
    else this.#out.push(content);
  }
  /**
  * @param {() => void} fn
  */
  on_destroy(fn) {
    (this.#on_destroy ??= []).push(fn);
  }
  /**
  * @returns {number[]}
  */
  get_path() {
    return this.#parent ? [...this.#parent.get_path(), this.#parent.#out.indexOf(this)] : [];
  }
  /**
  * @deprecated this is needed for legacy component bindings
  */
  copy() {
    const copy = new Renderer2(this.global, this.#parent);
    copy.#out = this.#out.map((item) => item instanceof Renderer2 ? item.copy() : item);
    copy.promise = this.promise;
    return copy;
  }
  /**
  * @param {Renderer} other
  * @deprecated this is needed for legacy component bindings
  */
  subsume(other) {
    if (this.global.mode !== other.global.mode) throw new Error("invariant: A renderer cannot switch modes. If you're seeing this, there's a compiler bug. File an issue!");
    this.local = other.local;
    this.#out = other.#out.map((item, i) => {
      const current = this.#out[i];
      if (current instanceof Renderer2 && item instanceof Renderer2) {
        current.subsume(item);
        return current;
      }
      return item;
    });
    this.promise = other.promise;
    this.type = other.type;
  }
  get length() {
    return this.#out.length;
  }
  /**
  * Creates the hydration comment that marks the start of a failed boundary.
  * The error is JSON-serialized and embedded inside an HTML comment for the client
  * to parse during hydration. The JSON is escaped to prevent `-->` or `<!--` sequences
  * from breaking out of the comment (XSS). Uses unicode escapes which `JSON.parse()`
  * handles transparently.
  * @param {unknown} error
  * @returns {string}
  */
  static #serialize_failed_boundary(error) {
    return `<!--[?${JSON.stringify(error).replace(/>/g, "\\u003e").replace(/</g, "\\u003c")}-->`;
  }
  /**
  * Only available on the server and when compiling with the `server` option.
  * Takes a component and returns an object with `body` and `head` properties on it, which you can use to populate the HTML when server-rendering your app.
  * @template {Record<string, any>} Props
  * @param {Component<Props>} component
  * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp }} [options]
  * @returns {RenderOutput}
  */
  static render(component, options = {}) {
    let sync;
    let async;
    const result = {};
    Object.defineProperties(result, {
      html: { get: () => {
        return (sync ??= Renderer2.#render(component, options)).body;
      } },
      head: { get: () => {
        return (sync ??= Renderer2.#render(component, options)).head;
      } },
      body: { get: () => {
        return (sync ??= Renderer2.#render(component, options)).body;
      } },
      hashes: { value: { script: "" } },
      then: { value: (
        /**
        * this is not type-safe, but honestly it's the best I can do right now, and it's a straightforward function.
        *
        * @template TResult1
        * @template [TResult2=never]
        * @param { (value: SyncRenderOutput) => TResult1 } onfulfilled
        * @param { (reason: unknown) => TResult2 } onrejected
        */
        (onfulfilled, onrejected) => {
          if (!async_mode_flag) {
            const result2 = sync ??= Renderer2.#render(component, options);
            const user_result = onfulfilled({
              head: result2.head,
              body: result2.body,
              html: result2.body,
              hashes: { script: [] }
            });
            return Promise.resolve(user_result);
          }
          async ??= init_render_context().then(() => with_render_context(() => Renderer2.#render_async(component, options)));
          return async.then((result2) => {
            Object.defineProperty(result2, "html", { get: () => {
              html_deprecated();
            } });
            return onfulfilled(result2);
          }, onrejected);
        }
      ) }
    });
    return result;
  }
  /**
  * Collect all of the `onDestroy` callbacks registered during rendering. In an async context, this is only safe to call
  * after awaiting `collect_async`.
  *
  * Child renderers are "porous" and don't affect execution order, but component body renderers
  * create ordering boundaries. Within a renderer, callbacks run in order until hitting a component boundary.
  * @returns {Iterable<() => void>}
  */
  *#collect_on_destroy() {
    for (const component of this.#traverse_components()) yield* component.#collect_ondestroy();
  }
  /**
  * Performs a depth-first search of renderers, yielding the deepest components first, then additional components as we backtrack up the tree.
  * @returns {Iterable<Renderer>}
  */
  *#traverse_components() {
    for (const child of this.#out) if (typeof child !== "string") yield* child.#traverse_components();
    if (this.#is_component_body) yield this;
  }
  /**
  * @returns {Iterable<() => void>}
  */
  *#collect_ondestroy() {
    if (this.#on_destroy) for (const fn of this.#on_destroy) yield fn;
    for (const child of this.#out) if (child instanceof Renderer2 && !child.#is_component_body) yield* child.#collect_ondestroy();
  }
  /**
  * Render a component. Throws if any of the children are performing asynchronous work.
  *
  * @template {Record<string, any>} Props
  * @param {Component<Props>} component
  * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string }} options
  * @returns {AccumulatedContent}
  */
  static #render(component, options) {
    var previous_context = ssr_context;
    try {
      const renderer = Renderer2.#open_render("sync", component, options);
      const content = renderer.#collect_content();
      return Renderer2.#close_render(content, renderer);
    } finally {
      abort();
      set_ssr_context(previous_context);
    }
  }
  /**
  * Render a component.
  *
  * @template {Record<string, any>} Props
  * @param {Component<Props>} component
  * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp }} options
  * @returns {Promise<AccumulatedContent & { hashes: { script: Sha256Source[] } }>}
  */
  static async #render_async(component, options) {
    const previous_context = ssr_context;
    try {
      const renderer = Renderer2.#open_render("async", component, options);
      const content = await renderer.#collect_content_async();
      const hydratables = await renderer.#collect_hydratables();
      if (hydratables !== null) content.head = hydratables + content.head;
      return Renderer2.#close_render(content, renderer);
    } finally {
      set_ssr_context(previous_context);
      abort();
    }
  }
  /**
  * Collect all of the code from the `out` array and return it as a string, or a promise resolving to a string.
  * @param {AccumulatedContent} content
  * @returns {AccumulatedContent}
  */
  #collect_content(content = {
    head: "",
    body: ""
  }) {
    for (const item of this.#out) if (typeof item === "string") content[this.type] += item;
    else if (item instanceof Renderer2) item.#collect_content(content);
    return content;
  }
  /**
  * Collect all of the code from the `out` array and return it as a string.
  * @param {AccumulatedContent} content
  * @returns {Promise<AccumulatedContent>}
  */
  async #collect_content_async(content = {
    head: "",
    body: ""
  }) {
    await this.promise;
    for (const item of this.#out) if (typeof item === "string") content[this.type] += item;
    else if (item instanceof Renderer2) {
      if (item.#boundary) {
        const boundary_content = {
          head: "",
          body: ""
        };
        try {
          await item.#collect_content_async(boundary_content);
          content.head += boundary_content.head;
          content.body += boundary_content.body;
        } catch (error) {
          const { context: context2, failed, transformError } = item.#boundary;
          set_ssr_context(context2);
          let promise = transformError(error);
          set_ssr_context(null);
          let transformed = await promise;
          set_ssr_context(context2);
          const failed_renderer = new Renderer2(item.global, item);
          failed_renderer.type = item.type;
          failed_renderer.#out.push(Renderer2.#serialize_failed_boundary(transformed));
          failed(failed_renderer, transformed, noop);
          failed_renderer.#out.push(BLOCK_CLOSE);
          await failed_renderer.#collect_content_async(content);
        }
      } else await item.#collect_content_async(content);
    }
    return content;
  }
  async #collect_hydratables() {
    const ctx = get_render_context().hydratable;
    for (const [_, key] of ctx.unresolved_promises) unresolved_hydratable(key, ctx.lookup.get(key)?.stack ?? "<missing stack trace>");
    for (const comparison of ctx.comparisons) await comparison;
    return await this.#hydratable_block(ctx);
  }
  /**
  * @template {Record<string, any>} Props
  * @param {'sync' | 'async'} mode
  * @param {import('svelte').Component<Props>} component
  * @param {{ props?: Omit<Props, '$$slots' | '$$events'>; context?: Map<any, any>; idPrefix?: string; csp?: Csp; transformError?: (error: unknown) => unknown }} options
  * @returns {Renderer}
  */
  static #open_render(mode, component, options) {
    if (options.idPrefix?.includes("--")) invalid_id_prefix();
    var previous_context = ssr_context;
    try {
      const renderer = new Renderer2(new SSRState(mode, options.idPrefix ? options.idPrefix + "-" : "", options.csp, options.transformError));
      set_ssr_context({
        p: null,
        c: options.context ?? null,
        r: renderer
      });
      renderer.push(BLOCK_OPEN);
      component(renderer, options.props ?? {});
      renderer.push(BLOCK_CLOSE);
      return renderer;
    } finally {
      set_ssr_context(previous_context);
    }
  }
  /**
  * @param {AccumulatedContent} content
  * @param {Renderer} renderer
  * @returns {AccumulatedContent & { hashes: { script: Sha256Source[] } }}
  */
  static #close_render(content, renderer) {
    for (const cleanup of renderer.#collect_on_destroy()) cleanup();
    let head = content.head + renderer.global.get_title();
    let body2 = content.body;
    for (const { hash, code } of renderer.global.css) head += `<style id="${hash}">${code}</style>`;
    return {
      head,
      body: body2,
      hashes: { script: renderer.global.csp.script_hashes }
    };
  }
  /**
  * @param {HydratableContext} ctx
  */
  async #hydratable_block(ctx) {
    if (ctx.lookup.size === 0) return null;
    let entries = [];
    let has_promises = false;
    for (const [k, v] of ctx.lookup) {
      if (v.promises) {
        has_promises = true;
        for (const p of v.promises) await p;
      }
      entries.push(`[${uneval(k)},${v.serialized}]`);
    }
    let prelude = `const h = (window.__svelte ??= {}).h ??= new Map();`;
    if (has_promises) prelude = `const r = (v) => Promise.resolve(v);
				${prelude}`;
    const body2 = `
			{
				${prelude}

				for (const [k, v] of [
					${entries.join(",\n					")}
				]) {
					h.set(k, v);
				}
			}
		`;
    let csp_attr = "";
    if (this.global.csp.nonce) csp_attr = ` nonce="${this.global.csp.nonce}"`;
    else if (this.global.csp.hash) {
      const hash = await sha256(body2);
      this.global.csp.script_hashes.push(`sha256-${hash}`);
    }
    return `
		<script${csp_attr}>${body2}</script>`;
  }
};
var SSRState = class {
  /** @readonly @type {Csp & { script_hashes: Sha256Source[] }} */
  csp;
  /** @readonly @type {'sync' | 'async'} */
  mode;
  /** @readonly @type {() => string} */
  uid;
  /** @readonly @type {Set<{ hash: string; code: string }>} */
  css = /* @__PURE__ */ new Set();
  /**
  * `transformError` passed to `render`. Called when an error boundary catches an error.
  * Throws by default if unset in `render`.
  * @type {(error: unknown) => unknown}
  */
  transformError;
  /** @type {{ path: number[], value: string }} */
  #title = {
    path: [],
    value: ""
  };
  /**
  * @param {'sync' | 'async'} mode
  * @param {string} id_prefix
  * @param {Csp} csp
  * @param {((error: unknown) => unknown) | undefined} [transformError]
  */
  constructor(mode, id_prefix = "", csp = { hash: false }, transformError) {
    this.mode = mode;
    this.csp = {
      ...csp,
      script_hashes: []
    };
    this.transformError = transformError ?? ((error) => {
      throw error;
    });
    let uid = 1;
    this.uid = () => `${id_prefix}s${uid++}`;
  }
  get_title() {
    return this.#title.value;
  }
  /**
  * Performs a depth-first (lexicographic) comparison using the path. Rejects sets
  * from earlier than or equal to the current value.
  * @param {string} value
  * @param {number[]} path
  */
  set_title(value, path) {
    const current = this.#title.path;
    let i = 0;
    let l = Math.min(path.length, current.length);
    while (i < l && path[i] === current[i]) i += 1;
    if (path[i] === void 0) return;
    if (current[i] === void 0 || path[i] > current[i]) {
      this.#title.path = path;
      this.#title.value = value;
    }
  }
};
function html(value) {
  return "<!---->" + String(value ?? "") + "<!---->";
}
var INVALID_ATTR_NAME_CHAR_REGEX = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
function render(component, options = {}) {
  if (options.csp?.hash && options.csp.nonce) invalid_csp();
  return Renderer.render(component, options);
}
function attributes(attrs, css_hash, classes, styles, flags = 0) {
  if (styles) attrs.style = to_style(attrs.style, styles);
  if (attrs.class) attrs.class = clsx(attrs.class);
  if (css_hash || classes) attrs.class = to_class(attrs.class, css_hash, classes);
  let attr_str = "";
  let name;
  const is_html = (flags & 1) === 0;
  const lowercase = (flags & 2) === 0;
  const is_input = (flags & 4) !== 0;
  for (name of Object.keys(attrs)) {
    if (typeof attrs[name] === "function") continue;
    if (name[0] === "$" && name[1] === "$") continue;
    if (name === "" || INVALID_ATTR_NAME_CHAR_REGEX.test(name)) continue;
    var value = attrs[name];
    var lower = name.toLowerCase();
    if (lowercase) name = lower;
    if (lower.length > 2 && lower.startsWith("on")) continue;
    if (is_input) {
      if (name === "defaultvalue" || name === "defaultchecked") {
        name = name === "defaultvalue" ? "value" : "checked";
        if (attrs[name]) continue;
      }
    }
    attr_str += attr(name, value, is_html && is_boolean_attribute(name));
  }
  return attr_str;
}
function stringify(value) {
  return typeof value === "string" ? value : value == null ? "" : value + "";
}
function attr_class(value, hash, directives) {
  var result = to_class(value, hash, directives);
  return result ? ` class="${escape_html(result, true)}"` : "";
}
function ensure_array_like(array_like_or_iterator) {
  if (array_like_or_iterator) return array_like_or_iterator.length !== void 0 ? array_like_or_iterator : Array.from(array_like_or_iterator);
  return [];
}
function once(get_value) {
  let value = UNINITIALIZED;
  return () => {
    if (value === UNINITIALIZED) value = get_value();
    return value;
  };
}
function derived(fn) {
  const get_value = ssr_context === null ? fn : once(fn);
  let updated_value;
  return function(new_value) {
    if (arguments.length === 0) return updated_value ?? get_value();
    updated_value = new_value;
    return updated_value;
  };
}
var CAUTION_TRAITS = new Set([
  {
    value: "specification model",
    description: "Encodes the detailed rules of a critical business calculation."
  },
  {
    value: "draft context",
    description: "A model still being explored; expect churn."
  },
  {
    value: "execution context",
    description: "Carries out a business workflow from trigger to outcome."
  },
  {
    value: "analysis context",
    description: "Derives insight from data other contexts produce."
  },
  {
    value: "audit model",
    description: "Records what happened for traceability and compliance."
  },
  {
    value: "approver",
    description: "Decides whether a requested action may proceed."
  },
  {
    value: "enforcer",
    description: "Makes other contexts comply with a policy or standard."
  },
  {
    value: "octopus enforcer",
    description: "Holds many contexts at once to the same standard rule."
  },
  {
    value: "interchange context",
    description: "Translates between two models so neither has to bend."
  },
  {
    value: "gateway context",
    description: "Fronts an external system or protocol for the rest of the system."
  },
  {
    value: "gateway interchange",
    description: "Fronts an external protocol and translates its model in the same place."
  },
  {
    value: "dogfood context",
    description: "Used daily by the team that builds it, so the model is tested from inside."
  },
  {
    value: "bubble context",
    description: "A clean model kept apart from legacy behind a translation layer."
  },
  {
    value: "autonomous bubble",
    description: "Deliberately isolated from legacy models so it can evolve freely."
  },
  {
    value: "brain context",
    description: "Concentrates so much logic that everything else leans on it \u2014 likely an anti-pattern.",
    caution: true
  },
  {
    value: "funnel context",
    description: "Condenses input from many sources into one stream."
  },
  {
    value: "engagement context",
    description: "Drives user interaction and experience."
  },
  {
    value: "service context",
    description: "Offers a capability other contexts consume on demand. Local addition, not on the community worksheet."
  }
].filter((trait) => trait.caution).map((trait) => trait.value));
function newId2() {
  return crypto.randomUUID();
}
function kindIcon($$renderer, kind, size) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg"${attr_class(clsx(size === "lane" ? "kind__svg" : "key__svg"))} viewBox="0 0 16 16" fill="none" stroke="currentColor"${attr("stroke-width", size === "lane" ? 1.3 : 1.4)} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${html(KIND_META[kind].icon)}</svg>`);
}
var GLYPHS = {
  command: "\u25B6",
  query: "?",
  event: "\u25C6"
};
var KIND_META = {
  "bounded-context": {
    label: "Bounded context",
    icon: '<path d="M4.6 12h6.2a2.6 2.6 0 0 0 .3-5.18A3.65 3.65 0 0 0 4.3 6.9 2.55 2.55 0 0 0 4.6 12Z"/>'
  },
  "external-system": {
    label: "External system",
    icon: '<circle cx="8" cy="8" r="2.3"/><path d="M8 1.4v1.9M8 12.7v1.9M1.4 8h1.9M12.7 8h1.9M3.35 3.35l1.35 1.35M11.3 11.3l1.35 1.35M12.65 3.35 11.3 4.7M4.7 11.3l-1.35 1.35"/>'
  },
  frontend: {
    label: "Frontend",
    icon: '<rect x="1.9" y="2.9" width="12.2" height="8.3" rx="1.1"/><path d="M6 13.7h4M8 11.2v2.5"/>'
  },
  user: {
    label: "Direct user interaction",
    icon: '<circle cx="8" cy="5.1" r="2.4"/><path d="M3.3 13.3a4.7 4.7 0 0 1 9.4 0"/>'
  }
};
var $$css = {
  hash: "svelte-18zyimi",
  code: "\n	/* The sheet's own screen-reader utility, and the last thing it depended on\n	   something outside itself for. Tailwind has an identical `sr-only`, but\n	   the headless renderer (wayfinder ticket 050) never runs Tailwind, and a\n	   copy in the renderer's preamble would be two definitions of one rule that\n	   drift silently and only for screen-reader users. Here, Svelte scopes it\n	   to the sheet and returns it on SSR's `head` with everything else, so the\n	   sheet is self-contained by construction rather than by a rule someone\n	   remembered to copy. */.sr-only.svelte-18zyimi {position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0, 0, 0, 0);white-space:nowrap;border-width:0;}.quiet-sheet.svelte-18zyimi {--gap: 18px;font-family:var(--font-serif);color:var(--color-ink);line-height:1.5;}\n\n	/* ---- title block (SPEC \xA75): ink block, eyebrow, name ---- */.tb.svelte-18zyimi {display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--gap) 2.5rem;margin-bottom:var(--gap);padding:1.5rem 1.7rem;border-radius:6px;background:var(--color-ink);color:var(--color-sheet);}.tb__id.svelte-18zyimi {flex:1 1 320px;min-width:0;}.tb__eyebrow.svelte-18zyimi {margin:0 0 0.55rem;font-family:var(--font-sans);font-size:0.62rem;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;opacity:0.6;}.tb__name.svelte-18zyimi {margin:0;font-family:var(--font-sans);font-weight:700;font-size:2.4rem;line-height:1.1;letter-spacing:0.01em;min-height:1.1em;}\n\n	/* ---- the V5 canonical 12-column grid (SPEC \xA75): ten panels ---- */.grid.svelte-18zyimi {display:grid;gap:var(--gap);grid-template-columns:repeat(12, 1fr);grid-template-areas:'purpose purpose purpose purpose purpose classification classification classification classification roles roles roles'\n			'inbound inbound inbound inbound centre centre centre centre outbound outbound outbound outbound'\n			'assumptions assumptions assumptions assumptions metrics metrics metrics metrics questions questions questions questions';}.area-purpose.svelte-18zyimi {grid-area:purpose;}.area-classification.svelte-18zyimi {grid-area:classification;}.area-roles.svelte-18zyimi {grid-area:roles;}.area-inbound.svelte-18zyimi {grid-area:inbound;}.area-centre.svelte-18zyimi {grid-area:centre;}.area-outbound.svelte-18zyimi {grid-area:outbound;}.area-assumptions.svelte-18zyimi {grid-area:assumptions;}.area-metrics.svelte-18zyimi {grid-area:metrics;}.area-questions.svelte-18zyimi {grid-area:questions;}\n\n	/* ---- section sheets ---- */.panel.svelte-18zyimi {min-width:0;padding:1.35rem;background:var(--color-sheet);border:1px solid var(--color-line);border-radius:5px;box-shadow:0 1px 2px rgb(26 30 32 / 0.04);\n		/* Small-caps label underline: section hue, neutral where none applies. */--label-hue: var(--color-ink-faint);}.panel--collab.svelte-18zyimi {--label-hue: var(--color-collaborator-ink);}.panel--lang.svelte-18zyimi {--label-hue: var(--color-term-ink);}.panel--decisions.svelte-18zyimi {--label-hue: var(--color-policy-ink);}.panel--hotspot.svelte-18zyimi {--label-hue: var(--color-hotspot-ink);}.panel__label.svelte-18zyimi {display:inline-block;margin:0;padding-bottom:0.5rem;border-bottom:2px solid var(--label-hue);font-family:var(--font-sans);font-size:0.64rem;font-weight:700;letter-spacing:0.17em;text-transform:uppercase;}.panel__body.svelte-18zyimi {margin-top:1rem;}.prose.svelte-18zyimi {margin:0;font-size:1rem;line-height:1.55;}\n\n	/* ---- strategic classification: the tenth panel ---- */\n	/* The title block's own idiom, kept verbatim on the panel: spaced-caps\n	   label, mono value, no fill and no box \u2014 the finding was about where\n	   classification lives, not how it looks. */.axes.svelte-18zyimi {display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));grid-template-rows:auto auto;gap:0.45rem 0.9rem;margin:0;}\n	/* Subgrid keeps the three sub-labels on one row, so the values share a\n	   baseline even when \"Business model\" wraps. */.axes.svelte-18zyimi > div:where(.svelte-18zyimi) {display:grid;grid-row:span 2;grid-template-rows:subgrid;align-content:start;min-width:0;}.axes.svelte-18zyimi dt:where(.svelte-18zyimi) {margin:0;font-family:var(--font-sans);font-size:0.57rem;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--color-ink-soft);}.axes.svelte-18zyimi dd:where(.svelte-18zyimi) {margin:0;font-family:var(--font-mono);font-size:0.8rem;line-height:1.35;overflow-wrap:break-word;}\n\n	/* ---- domain roles ---- */.roles.svelte-18zyimi {display:flex;flex-wrap:wrap;gap:0.4rem;margin:0;padding:0;list-style:none;}.role.svelte-18zyimi {padding:0.22rem 0.68rem;border:1px solid var(--color-ink);border-radius:999px;font-family:var(--font-sans);font-size:0.74rem;font-weight:600;}\n	/* File values are lowercase prose; the sheet displays them sentence-case. */.role.svelte-18zyimi::first-letter {text-transform:uppercase;}\n	/* The worksheet flags the trait \"(likely anti-pattern)\": a caution ring in\n	   hotspot ink so an exported PNG carries the warning (pair AA-gated in\n	   contrast.test.ts; the wash is the hotspot fill at 8%). */.role--caution.svelte-18zyimi {border-color:var(--color-hotspot-ink);color:var(--color-hotspot-ink);background:rgb(247 107 163 / 0.08);}.role__caution.svelte-18zyimi {margin-left:0.4em;font-family:var(--font-mono);font-size:0.86em;font-weight:400;}\n\n	/* ---- communication lanes ---- */.lanes.svelte-18zyimi {margin:0;padding:0;list-style:none;}.lane.svelte-18zyimi + .lane:where(.svelte-18zyimi) {margin-top:1.05rem;padding-top:1.05rem;border-top:1px solid var(--color-line);}.lane__head.svelte-18zyimi {display:flex;flex-wrap:wrap;align-items:baseline;gap:0.45rem;}.lane__who.svelte-18zyimi {display:inline-flex;align-items:baseline;gap:0.4rem;margin:0;padding-bottom:0.1rem;border-bottom:2px solid var(--color-collaborator);font-family:var(--font-sans);font-size:0.8rem;font-weight:600;color:var(--color-collaborator-ink);}.kind.svelte-18zyimi {flex:none;align-self:center;width:15px;height:15px;color:var(--color-collaborator-ink);}.kind.svelte-18zyimi .kind__svg {display:block;width:100%;height:100%;}\n\n	/* The two-sided relationship: theirs set back in ink-soft (the sheet's\n	   AA-passing secondary text \u2014 ink-faint is decorative-only), ours forward\n	   in full ink at 500. The pair works without labels because order is fixed\n	   and the footer legend keys it. */.rel.svelte-18zyimi {display:flex;flex-wrap:wrap;align-items:baseline;gap:0.34rem;margin:0.45rem 0 0;font-family:var(--font-mono);font-size:0.69rem;line-height:1.4;}.rel__theirs.svelte-18zyimi {color:var(--color-ink-soft);}.rel__arrow.svelte-18zyimi {color:var(--color-ink-soft);}.rel__ours.svelte-18zyimi {color:var(--color-ink);font-weight:500;}.msgs.svelte-18zyimi {display:flex;flex-wrap:wrap;gap:0.35rem;margin:0.55rem 0 0;padding:0;list-style:none;}\n	/* One meaning\u2192(fill, edge) mapping shared by chips and legend swatches. */[data-meaning='command'].svelte-18zyimi {--fill: var(--color-command);--edge: var(--color-command-ink);}[data-meaning='query'].svelte-18zyimi {--fill: var(--color-query);--edge: var(--color-query-ink);}[data-meaning='event'].svelte-18zyimi {--fill: var(--color-event);--edge: var(--color-event-ink);}[data-meaning='policy'].svelte-18zyimi {--fill: var(--color-policy);--edge: var(--color-policy-ink);}[data-meaning='collaborator'].svelte-18zyimi {--fill: var(--color-collaborator);--edge: var(--color-collaborator-ink);}[data-meaning='hotspot'].svelte-18zyimi {--fill: var(--color-hotspot);--edge: var(--color-hotspot-ink);}.msg.svelte-18zyimi {padding:0.28rem 0.55rem;background:var(--fill);border:1px solid var(--edge);border-radius:4px;font-family:var(--font-mono);font-size:0.73rem;line-height:1.25;}.msg__glyph.svelte-18zyimi {margin-right:0.42em;font-size:0.7em;vertical-align:0.08em;}.msg[data-meaning='query'].svelte-18zyimi .msg__glyph:where(.svelte-18zyimi) {font-weight:700;}\n	/* Message descriptions render as visible text: the prototype's title\n	   tooltip is pointer-only and print-invisible, which fails the artifact's\n	   AA bar (SPEC \xA712 bans exactly that pattern for relationship values). */.msg__desc.svelte-18zyimi {display:block;margin-top:0.1rem;font-family:var(--font-serif);font-style:italic;font-size:0.78rem;}\n\n	/* ---- the shared centre plate (SPEC \xA75) ---- */\n	/* The canonical template's outer rectangle, drawn as ground instead of\n	   line: a translucent ink wash at grid-line intensity, so the drafting\n	   grid shows through and the region reads as marked paper. */.centre.svelte-18zyimi {display:flex;flex-direction:column;gap:var(--gap);min-width:0;padding:var(--gap);background:rgb(26 30 32 / 0.045);border-radius:6px;}.centre.svelte-18zyimi .panel:where(.svelte-18zyimi) {flex:1 1 auto;}\n\n	/* ---- ubiquitous language ---- */.terms.svelte-18zyimi {margin:0;}.terms__row.svelte-18zyimi + .terms__row:where(.svelte-18zyimi) {margin-top:0.8rem;}.terms.svelte-18zyimi dt:where(.svelte-18zyimi) {display:inline-block;padding:0 0.15rem;font-family:var(--font-mono);font-size:0.76rem;font-weight:500;\n		/* Highlighter stroke under the mono term. */background:linear-gradient(\n			transparent 45%,\n			var(--color-term) 45%,\n			var(--color-term) 92%,\n			transparent 92%\n		);}.terms.svelte-18zyimi dd:where(.svelte-18zyimi) {margin:0.15rem 0 0;font-size:0.9rem;line-height:1.45;color:var(--color-ink-soft);}\n\n	/* ---- decisions / assumptions / questions ---- */.stack.svelte-18zyimi {margin:0;padding:0;list-style:none;}.stack.svelte-18zyimi li:where(.svelte-18zyimi) {position:relative;padding-left:1.15rem;font-size:0.9rem;line-height:1.5;}.stack.svelte-18zyimi li:where(.svelte-18zyimi) + li:where(.svelte-18zyimi) {margin-top:0.65rem;}.stack.svelte-18zyimi li:where(.svelte-18zyimi)::before {content:'';position:absolute;left:0;top:0.48em;width:7px;height:7px;border-radius:2px;background:var(--color-ink-faint);}.stack--policy.svelte-18zyimi li:where(.svelte-18zyimi)::before {background:var(--color-policy);border:1px solid var(--color-policy-ink);}.stack--hotspot.svelte-18zyimi li:where(.svelte-18zyimi)::before {background:var(--color-hotspot);border:1px solid var(--color-hotspot-ink);transform:rotate(14deg);}.stack.svelte-18zyimi b:where(.svelte-18zyimi) {font-family:var(--font-sans);font-size:0.8rem;font-weight:600;letter-spacing:0.01em;}.stack__detail.svelte-18zyimi {color:var(--color-ink-soft);}\n\n	/* ---- footer: legend + attribution (SPEC \xA710), inside the capture region ---- */.foot.svelte-18zyimi {display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:0.6rem 2rem;margin-top:var(--gap);padding-top:1rem;border-top:1px solid var(--color-line);}.key.svelte-18zyimi {display:flex;flex-wrap:wrap;align-items:center;gap:0.45rem 1.05rem;margin:0;padding:0;list-style:none;}.key.svelte-18zyimi li:where(.svelte-18zyimi) {display:inline-flex;align-items:center;gap:0.35rem;font-family:var(--font-mono);font-size:0.72rem;color:var(--color-ink-soft);}.key__swatch.svelte-18zyimi {display:inline-block;width:10px;height:10px;background:var(--fill);border:1px solid var(--edge);border-radius:3px;}.key__icon.svelte-18zyimi {display:inline-block;width:12px;height:12px;color:var(--color-collaborator-ink);}.key__icon.svelte-18zyimi .key__svg {display:block;width:100%;height:100%;}\n	/* The relationship-pair key: the same set-back/forward inks the lanes use,\n	   so the legend entry is the convention. */.key__theirs.svelte-18zyimi {color:var(--color-ink-soft);}.key__ours.svelte-18zyimi {color:var(--color-ink);font-weight:500;}.key__arrow.svelte-18zyimi {margin:0 0.35rem;}\n	/* The \xA710 one-line legend separators \u2014 decorative, hidden from AT. */.key.svelte-18zyimi li:where(.svelte-18zyimi):not(:last-child)::after {content:'\xB7' / '';margin-left:0.7rem;color:var(--color-ink-faint);}.note.svelte-18zyimi {margin:0;font-size:0.74rem;color:var(--color-ink-soft);}.note.svelte-18zyimi a:where(.svelte-18zyimi) {color:inherit;}\n\n	/* ---- responsive tiers (SPEC \xA75) ---- */\n	/* Sized by the editor's container, never the viewport: the offscreen\n	   artifact mount and the exported HTML declare no container, so every\n	   rule here is inert in an export and artifacts keep the fixed desktop\n	   grid (\xA79.2). The artifact's own 760px stack lives in \xA79.1. Last in\n	   the sheet so each tier outranks the base rules it adjusts. */\n\n	/* Trim tier: the canonical grid, tightened \u2014 smaller gutters and panel\n	   padding buy the twelve columns another ~180px before anything\n	   collides, where the old 1080px floor gave up. */\n	@container (max-width: 1060px) {.quiet-sheet.svelte-18zyimi {--gap: 14px;}.panel.svelte-18zyimi {padding:1.1rem;}.tb.svelte-18zyimi {padding:1.2rem 1.35rem;}\n	}\n\n	/* Two-column tier: inbound stays left of outbound, so the lanes keep\n	   their in/out reading; the centre pair turns side by side inside its\n	   full-width box. */\n	@container (max-width: 880px) {.grid.svelte-18zyimi {grid-template-columns:repeat(2, minmax(0, 1fr));grid-template-areas:'purpose purpose'\n				'classification roles'\n				'inbound outbound'\n				'centre centre'\n				'assumptions metrics'\n				'questions questions';}.centre.svelte-18zyimi {flex-direction:row;}.centre.svelte-18zyimi .panel:where(.svelte-18zyimi) {flex:1 1 0;min-width:0;}\n	}\n\n	/* Stack tier: one column in the artifact's reading order (\xA79.1). */\n	@container (max-width: 620px) {.grid.svelte-18zyimi {grid-template-columns:minmax(0, 1fr);grid-template-areas:'purpose' 'classification' 'roles' 'inbound' 'centre'\n				'outbound' 'assumptions' 'metrics' 'questions';}.centre.svelte-18zyimi {flex-direction:column;}.tb.svelte-18zyimi {padding:1rem 1.15rem;}.tb__name.svelte-18zyimi {font-size:1.9rem;}\n	}"
};
function CanvasSheet($$renderer, $$props) {
  $$renderer.global.css.add($$css);
  $$renderer.component(($$renderer2) => {
    let { doc, field: field2, removeItem, addItem, addMessage, grip, pickValue, addTrait } = $$props;
    const REPO_URL = "https://github.com/ddd-crew/bounded-context-canvas";
    const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
    const LEGEND = [
      {
        meaning: "command",
        label: "command"
      },
      {
        meaning: "query",
        label: "query"
      },
      {
        meaning: "event",
        label: "event"
      },
      {
        meaning: "policy",
        label: "decision"
      },
      {
        meaning: "collaborator",
        label: "collaborator"
      },
      {
        meaning: "hotspot",
        label: "open question"
      }
    ];
    function ghostFace(count, terse, question) {
      return {
        label: count ? terse : question,
        teaching: count === 0
      };
    }
    function setRelationshipEnd(lane, side, value) {
      const next = {
        ...lane.relationship,
        [side]: value
      };
      if (next.theirs === void 0) delete next.theirs;
      if (next.ours === void 0) delete next.ours;
      lane.relationship = next.theirs === void 0 && next.ours === void 0 ? void 0 : next;
    }
    const axes = derived(() => [
      {
        kind: "domain",
        label: "Domain",
        value: doc.strategicClassification.domain
      },
      {
        kind: "businessModel",
        label: "Business model",
        value: doc.strategicClassification.businessModel
      },
      {
        kind: "evolution",
        label: "Evolution",
        value: doc.strategicClassification.evolution
      }
    ]);
    function text($$renderer3, slot) {
      if (field2) {
        $$renderer3.push("<!--[0-->");
        field2($$renderer3, slot);
        $$renderer3.push(`<!---->`);
      } else {
        $$renderer3.push("<!--[-1-->");
        $$renderer3.push(`${escape_html(slot.value)}`);
      }
      $$renderer3.push(`<!--]-->`);
    }
    function communication($$renderer3, label, lanes2, area, question) {
      $$renderer3.push(`<section${attr_class(`panel panel--collab ${stringify(area)}`, "svelte-18zyimi")}><h2 class="panel__label svelte-18zyimi">${escape_html(label)}</h2> <div class="panel__body svelte-18zyimi">`);
      if (lanes2.length > 0) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<ul class="lanes svelte-18zyimi"><!--[-->`);
        const each_array = ensure_array_like(lanes2);
        for (let laneIndex = 0, $$length = each_array.length; laneIndex < $$length; laneIndex++) {
          let lane = each_array[laneIndex];
          $$renderer3.push(`<li class="lane svelte-18zyimi"><div class="lane__head svelte-18zyimi">`);
          if (grip) {
            $$renderer3.push("<!--[0-->");
            grip($$renderer3);
            $$renderer3.push(`<!---->`);
          } else $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<!--]--> <h3 class="lane__who svelte-18zyimi">`);
          if (pickValue) {
            $$renderer3.push("<!--[0-->");
            pickValue($$renderer3, {
              kind: "collaboratorKind",
              key: `${lane.id}:kind`,
              label: `Collaborator kind for ${lane.collaborator.name}`.trim(),
              value: lane.collaborator.kind,
              set: (value) => lane.collaborator.kind = value
            });
            $$renderer3.push(`<!---->`);
          } else if (lane.collaborator.kind) {
            $$renderer3.push("<!--[1-->");
            $$renderer3.push(`<span class="kind svelte-18zyimi" aria-hidden="true">`);
            kindIcon($$renderer3, lane.collaborator.kind, "lane");
            $$renderer3.push(`<!----></span><span class="sr-only svelte-18zyimi">${escape_html(`${KIND_META[lane.collaborator.kind].label}: `)}</span>`);
          } else $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<!--]--> `);
          text($$renderer3, {
            value: lane.collaborator.name,
            label: "Collaborator",
            placeholder: "Collaborator",
            set: (value) => lane.collaborator.name = value
          });
          $$renderer3.push(`<!----></h3> `);
          removeItem?.($$renderer3, {
            label: `Remove collaborator ${lane.collaborator.name}`.trim(),
            type: "Collaborator",
            remove: () => lanes2.splice(laneIndex, 1)
          });
          $$renderer3.push(`<!----></div> `);
          if (pickValue) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<p${attr_class("rel svelte-18zyimi", void 0, { "rel--unset": lane.relationship === void 0 })}><span class="rel__theirs svelte-18zyimi">`);
            pickValue($$renderer3, {
              kind: "relationship",
              key: `${lane.id}:theirs`,
              label: `Their relationship for ${lane.collaborator.name}`.trim(),
              value: lane.relationship?.theirs,
              set: (value) => setRelationshipEnd(lane, "theirs", value)
            });
            $$renderer3.push(`<!----></span><span class="rel__arrow svelte-18zyimi" aria-hidden="true">\u2192</span><span class="rel__ours svelte-18zyimi">`);
            pickValue($$renderer3, {
              kind: "relationship",
              key: `${lane.id}:ours`,
              label: `Our relationship for ${lane.collaborator.name}`.trim(),
              value: lane.relationship?.ours,
              set: (value) => setRelationshipEnd(lane, "ours", value)
            });
            $$renderer3.push(`<!----></span></p>`);
          } else if (lane.relationship) {
            $$renderer3.push("<!--[1-->");
            $$renderer3.push(`<p class="rel svelte-18zyimi">`);
            if (lane.relationship.theirs !== void 0) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<span class="sr-only svelte-18zyimi">Collaborator: </span><span class="rel__theirs svelte-18zyimi">${escape_html(lane.relationship.theirs)}</span>`);
            } else $$renderer3.push("<!--[-1-->");
            $$renderer3.push(`<!--]--><span class="rel__arrow svelte-18zyimi" aria-hidden="true">\u2192</span>`);
            if (lane.relationship.ours !== void 0) {
              $$renderer3.push("<!--[0-->");
              $$renderer3.push(`<span class="sr-only svelte-18zyimi">this context: </span><span class="rel__ours svelte-18zyimi">${escape_html(lane.relationship.ours)}</span>`);
            } else $$renderer3.push("<!--[-1-->");
            $$renderer3.push(`<!--]--></p>`);
          } else $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<!--]--> `);
          if (lane.messages.length > 0) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<ul class="msgs svelte-18zyimi"><!--[-->`);
            const each_array_1 = ensure_array_like(lane.messages);
            for (let messageIndex = 0, $$length2 = each_array_1.length; messageIndex < $$length2; messageIndex++) {
              let message2 = each_array_1[messageIndex];
              $$renderer3.push(`<li class="msg svelte-18zyimi"${attr("data-meaning", message2.type)}><span class="msg__glyph svelte-18zyimi" aria-hidden="true">${escape_html(GLYPHS[message2.type])}</span><span class="sr-only svelte-18zyimi">${escape_html(message2.type)},</span>`);
              text($$renderer3, {
                value: message2.name,
                label: "Message name",
                placeholder: "Message name",
                set: (value) => message2.name = value
              });
              $$renderer3.push(`<!----> `);
              if (field2 || message2.description) {
                $$renderer3.push("<!--[0-->");
                $$renderer3.push(`<span class="msg__desc svelte-18zyimi">`);
                text($$renderer3, {
                  value: message2.description ?? "",
                  label: "Message description",
                  placeholder: "detail",
                  multiline: true,
                  set: (value) => message2.description = value
                });
                $$renderer3.push(`<!----></span>`);
              } else $$renderer3.push("<!--[-1-->");
              $$renderer3.push(`<!--]--> `);
              removeItem?.($$renderer3, {
                label: `Remove ${message2.type} ${message2.name}`.trim(),
                type: message2.type.charAt(0).toUpperCase() + message2.type.slice(1),
                remove: () => lane.messages.splice(messageIndex, 1)
              });
              $$renderer3.push(`<!----></li>`);
            }
            $$renderer3.push(`<!--]--></ul>`);
          } else $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<!--]--> `);
          addMessage?.($$renderer3, {
            laneId: lane.id,
            add: (type) => lane.messages.push({
              id: newId2(),
              type,
              name: ""
            })
          });
          $$renderer3.push(`<!----></li>`);
        }
        $$renderer3.push(`<!--]--></ul>`);
      } else $$renderer3.push("<!--[-1-->");
      $$renderer3.push(`<!--]--> `);
      addItem?.($$renderer3, {
        ...ghostFace(lanes2.length, "+ collaborator", question),
        focusField: "Collaborator",
        add: () => lanes2.push({
          id: newId2(),
          collaborator: { name: "" },
          messages: []
        })
      });
      $$renderer3.push(`<!----></div></section>`);
    }
    function languageSection($$renderer3) {
      $$renderer3.push(`<section class="panel panel--lang svelte-18zyimi"><h2 class="panel__label svelte-18zyimi">Ubiquitous language</h2> <div class="panel__body svelte-18zyimi">`);
      if (doc.ubiquitousLanguage.length > 0) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<dl class="terms svelte-18zyimi"><!--[-->`);
        const each_array_2 = ensure_array_like(doc.ubiquitousLanguage);
        for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
          let entry = each_array_2[index];
          $$renderer3.push(`<div class="terms__row svelte-18zyimi"><dt class="svelte-18zyimi">`);
          text($$renderer3, {
            value: entry.term,
            label: "Term",
            placeholder: "Term",
            set: (value) => entry.term = value
          });
          $$renderer3.push(`<!---->`);
          removeItem?.($$renderer3, {
            label: `Remove term ${entry.term}`.trim(),
            type: "Term",
            remove: () => doc.ubiquitousLanguage.splice(index, 1)
          });
          $$renderer3.push(`<!----></dt> `);
          if (field2 || entry.definition) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<dd class="svelte-18zyimi">`);
            text($$renderer3, {
              value: entry.definition ?? "",
              label: "Definition",
              placeholder: "What it means here",
              multiline: true,
              set: (value) => entry.definition = value
            });
            $$renderer3.push(`<!----></dd>`);
          } else $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]--></dl>`);
      } else $$renderer3.push("<!--[-1-->");
      $$renderer3.push(`<!--]--> `);
      addItem?.($$renderer3, {
        ...ghostFace(doc.ubiquitousLanguage.length, "+ term", "+ term \u2014 which words mean something precise here?"),
        focusField: "Term",
        add: () => doc.ubiquitousLanguage.push({
          id: newId2(),
          term: ""
        })
      });
      $$renderer3.push(`<!----></div></section>`);
    }
    function decisionsSection($$renderer3) {
      $$renderer3.push(`<section class="panel panel--decisions svelte-18zyimi"><h2 class="panel__label svelte-18zyimi">Business decisions</h2> <div class="panel__body svelte-18zyimi">`);
      if (doc.businessDecisions.length > 0) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<ul class="stack stack--policy svelte-18zyimi"><!--[-->`);
        const each_array_3 = ensure_array_like(doc.businessDecisions);
        for (let index = 0, $$length = each_array_3.length; index < $$length; index++) {
          let decision = each_array_3[index];
          $$renderer3.push(`<li class="svelte-18zyimi"><b class="svelte-18zyimi">`);
          text($$renderer3, {
            value: decision.name,
            label: "Decision",
            placeholder: "Rule",
            set: (value) => decision.name = value
          });
          $$renderer3.push(`<!----></b> `);
          if (field2 || decision.description) {
            $$renderer3.push("<!--[0-->");
            $$renderer3.push(`<span class="stack__detail svelte-18zyimi">`);
            text($$renderer3, {
              value: decision.description ?? "",
              label: "Decision description",
              placeholder: "detail",
              multiline: true,
              set: (value) => decision.description = value
            });
            $$renderer3.push(`<!----></span>`);
          } else $$renderer3.push("<!--[-1-->");
          $$renderer3.push(`<!--]--> `);
          removeItem?.($$renderer3, {
            label: `Remove decision ${decision.name}`.trim(),
            type: "Decision",
            remove: () => doc.businessDecisions.splice(index, 1)
          });
          $$renderer3.push(`<!----></li>`);
        }
        $$renderer3.push(`<!--]--></ul>`);
      } else $$renderer3.push("<!--[-1-->");
      $$renderer3.push(`<!--]--> `);
      addItem?.($$renderer3, {
        ...ghostFace(doc.businessDecisions.length, "+ decision", "+ decision \u2014 which rules does this context enforce?"),
        focusField: "Decision",
        add: () => doc.businessDecisions.push({
          id: newId2(),
          name: ""
        })
      });
      $$renderer3.push(`<!----></div></section>`);
    }
    function stickies($$renderer3, label, itemLabel, terse, question, items, area, hotspot) {
      $$renderer3.push(`<section${attr_class(`panel ${stringify(area)}`, "svelte-18zyimi", { "panel--hotspot": hotspot })}><h2 class="panel__label svelte-18zyimi">${escape_html(label)}</h2> <div class="panel__body svelte-18zyimi">`);
      if (items.length > 0) {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<ul${attr_class("stack svelte-18zyimi", void 0, { "stack--hotspot": hotspot })}><!--[-->`);
        const each_array_4 = ensure_array_like(items);
        for (let index = 0, $$length = each_array_4.length; index < $$length; index++) {
          let item = each_array_4[index];
          $$renderer3.push(`<li class="svelte-18zyimi">`);
          text($$renderer3, {
            value: item,
            label: itemLabel,
            placeholder: "\u2026",
            set: (value) => items[index] = value
          });
          $$renderer3.push(`<!----> `);
          removeItem?.($$renderer3, {
            label: `Remove ${itemLabel.toLowerCase()}`,
            type: itemLabel,
            remove: () => items.splice(index, 1)
          });
          $$renderer3.push(`<!----></li>`);
        }
        $$renderer3.push(`<!--]--></ul>`);
      } else $$renderer3.push("<!--[-1-->");
      $$renderer3.push(`<!--]--> `);
      addItem?.($$renderer3, {
        ...ghostFace(items.length, terse, question),
        focusField: itemLabel,
        add: () => items.push("")
      });
      $$renderer3.push(`<!----></div></section>`);
    }
    $$renderer2.push(`<article class="quiet-sheet svelte-18zyimi"><header class="tb svelte-18zyimi"><div class="tb__id svelte-18zyimi"><p class="tb__eyebrow svelte-18zyimi">Bounded Context Canvas\xA0\xB7\xA0V5</p> <h1 class="tb__name svelte-18zyimi">`);
    text($$renderer2, {
      value: doc.name,
      label: "Name",
      placeholder: "Name this context",
      tone: "ink",
      set: (value) => doc.name = value
    });
    $$renderer2.push(`<!----></h1></div></header> <div class="grid svelte-18zyimi"><section class="panel area-purpose svelte-18zyimi"><h2 class="panel__label svelte-18zyimi">Purpose</h2> <div class="panel__body svelte-18zyimi">`);
    if (field2 || doc.purpose) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="prose svelte-18zyimi">`);
      text($$renderer2, {
        value: doc.purpose,
        label: "Purpose",
        placeholder: "What does this context exist to do? A few sentences in business language.",
        multiline: true,
        set: (value) => doc.purpose = value
      });
      $$renderer2.push(`<!----></p>`);
    } else $$renderer2.push("<!--[-1-->");
    $$renderer2.push(`<!--]--></div></section> <section class="panel area-classification svelte-18zyimi"><h2 class="panel__label svelte-18zyimi">Strategic classification</h2> <div class="panel__body svelte-18zyimi"><dl class="axes svelte-18zyimi"><!--[-->`);
    const each_array_5 = ensure_array_like(axes());
    for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
      let axis = each_array_5[$$index_5];
      $$renderer2.push(`<div class="svelte-18zyimi"><dt class="svelte-18zyimi">${escape_html(axis.label)}</dt> <dd class="svelte-18zyimi">`);
      if (pickValue) {
        $$renderer2.push("<!--[0-->");
        pickValue($$renderer2, {
          kind: axis.kind,
          key: axis.kind,
          label: axis.label,
          value: axis.value,
          set: (value) => doc.strategicClassification[axis.kind] = value
        });
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`${escape_html(axis.value ?? "\u2014")}`);
      }
      $$renderer2.push(`<!--]--></dd></div>`);
    }
    $$renderer2.push(`<!--]--></dl></div></section> <section class="panel area-roles svelte-18zyimi"><h2 class="panel__label svelte-18zyimi">Domain roles</h2> <div class="panel__body svelte-18zyimi">`);
    if (doc.domainRoles.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<ul class="roles svelte-18zyimi"><!--[-->`);
      const each_array_6 = ensure_array_like(doc.domainRoles);
      for (let index = 0, $$length = each_array_6.length; index < $$length; index++) {
        let role = each_array_6[index];
        $$renderer2.push(`<li${attr_class("role svelte-18zyimi", void 0, { "role--caution": CAUTION_TRAITS.has(role.name) })}>${escape_html(role.name)}`);
        if (CAUTION_TRAITS.has(role.name)) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="role__caution svelte-18zyimi" aria-hidden="true">\u26A0</span><span class="sr-only svelte-18zyimi">\u2014 likely anti-pattern</span>`);
        } else $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<!--]-->`);
        removeItem?.($$renderer2, {
          label: `Remove trait ${role.name}`.trim(),
          type: "Trait",
          remove: () => doc.domainRoles.splice(index, 1)
        });
        $$renderer2.push(`<!----></li>`);
      }
      $$renderer2.push(`<!--]--></ul>`);
    } else $$renderer2.push("<!--[-1-->");
    $$renderer2.push(`<!--]--> `);
    addTrait?.($$renderer2, {
      ...ghostFace(doc.domainRoles.length, "+ trait", "+ trait \u2014 how does this context behave?"),
      selected: doc.domainRoles.map((role) => role.name),
      toggle: (name) => {
        const index = doc.domainRoles.findIndex((role) => role.name === name);
        if (index >= 0) doc.domainRoles.splice(index, 1);
        else doc.domainRoles.push({
          id: newId2(),
          name
        });
      }
    });
    $$renderer2.push(`<!----></div></section> `);
    communication($$renderer2, "Inbound communication", doc.inboundCommunication, "area-inbound", "+ collaborator \u2014 who sends this context commands, queries or events?");
    $$renderer2.push(`<!----> <div class="centre area-centre svelte-18zyimi">`);
    languageSection($$renderer2);
    $$renderer2.push(`<!----> `);
    decisionsSection($$renderer2);
    $$renderer2.push(`<!----></div> `);
    communication($$renderer2, "Outbound communication", doc.outboundCommunication, "area-outbound", "+ collaborator \u2014 who consumes what this context emits?");
    $$renderer2.push(`<!----> `);
    stickies($$renderer2, "Assumptions", "Assumption", "+ assumption", "+ assumption \u2014 what are you taking to be true?", doc.assumptions, "area-assumptions", false);
    $$renderer2.push(`<!----> `);
    stickies($$renderer2, "Verification metrics", "Verification metric", "+ metric", "+ metric \u2014 what would verify this design?", doc.verificationMetrics, "area-metrics", false);
    $$renderer2.push(`<!----> `);
    stickies($$renderer2, "Open questions", "Open question", "+ question", "+ question \u2014 what's still unresolved?", doc.openQuestions, "area-questions", true);
    $$renderer2.push(`<!----></div> <footer class="foot svelte-18zyimi"><ul class="key svelte-18zyimi" data-legend=""><!--[-->`);
    const each_array_7 = ensure_array_like(LEGEND);
    for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
      let entry = each_array_7[$$index_7];
      $$renderer2.push(`<li class="svelte-18zyimi"><span class="key__swatch svelte-18zyimi"${attr("data-meaning", entry.meaning)} aria-hidden="true"></span>${escape_html(entry.label)}</li>`);
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array_8 = ensure_array_like(Object.keys(KIND_META));
    for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
      let kind = each_array_8[$$index_8];
      $$renderer2.push(`<li class="svelte-18zyimi"><span class="key__icon svelte-18zyimi">`);
      kindIcon($$renderer2, kind, "key");
      $$renderer2.push(`<!----></span>${escape_html(KIND_META[kind].label.toLowerCase())}</li>`);
    }
    $$renderer2.push(`<!--]--> <li class="svelte-18zyimi"><span class="sr-only svelte-18zyimi">relationship: </span><span class="key__theirs svelte-18zyimi">theirs</span><span class="key__arrow svelte-18zyimi" aria-hidden="true">\u2192</span><span class="key__ours svelte-18zyimi">ours</span></li></ul> <p class="note svelte-18zyimi">Based on the <a${attr("href", REPO_URL)} class="svelte-18zyimi">Bounded Context Canvas by the ddd-crew</a> \xB7 <a${attr("href", LICENSE_URL)} class="svelte-18zyimi">CC BY 4.0</a></p></footer></article>`);
  });
}
function windowTitle(name) {
  const trimmed = name.trim();
  return `${trimmed === "" ? "Untitled" : trimmed} \u2014 BC Canvas`;
}
var SHEET_WIDTH = 1440;
var SCOPE_CLASS = "bcc-canvas";
function styleText(head) {
  const stripped = head.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, "");
  if (stripped.trim()) throw new Error(`CanvasSheet emitted non-style head content: ${stripped.trim()}`);
  const parts = [];
  for (const match of head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) parts.push(match[1]);
  if (!parts.length) throw new Error('CanvasSheet emitted no scoped CSS \u2014 was it compiled with css: "injected"?');
  return parts.join("\n").trim();
}
var RESET_CSS = `.${SCOPE_CLASS},
.${SCOPE_CLASS} *,
.${SCOPE_CLASS} *::before,
.${SCOPE_CLASS} *::after {
	box-sizing: border-box;
}
.${SCOPE_CLASS} :where(h1, h2, h3, h4, p, figure, blockquote, dl, dd, pre) {
	margin: 0;
}
.${SCOPE_CLASS} :where(ul, ol) {
	margin: 0;
	padding: 0;
	list-style: none;
}`;
function renderSheetParts(doc) {
  const { body: body2, head } = render(CanvasSheet, { props: { doc } });
  return {
    markup: `<div class="${SCOPE_CLASS}">${body2}</div>`,
    css: `.${SCOPE_CLASS} {
/* Quiet-sheet tokens (SPEC \xA75). AA-verified by src/lib/sheet/contrast.test.ts;
	   if a pair fails there, the token shifts here \u2014 everywhere at once. */
	--color-paper: #eae7de;
	--color-sheet: #fdfdfb;
	--color-line: #d8d4c8;
	--color-ink: #1a1e20;
	/* Secondary text \u2014 passes AA on sheet and paper. */
	--color-ink-soft: #50564f;
	/* Decorative only (hairline rules, neutral list markers) \u2014 fails AA as text. */
	--color-ink-faint: #8e948c;

	/* The seven palette meanings: EventStorming fill + same-hue ink border. */
	--color-command: #85bce5;
	--color-command-ink: #33688f;
	--color-query: #93cb91;
	--color-query-ink: #40733e;
	--color-event: #f3a54e;
	--color-event-ink: #a96517;
	--color-policy: #c2abdd;
	--color-policy-ink: #6f519b;
	--color-collaborator: #f1a5cb;
	--color-collaborator-ink: #a94879;
	--color-hotspot: #f76ba3;
	--color-hotspot-ink: #b92367;
	--color-term: #efe08b;
	--color-term-ink: #8a7a12;

	--font-sans: 'Archivo', ui-sans-serif, system-ui, sans-serif;
	--font-serif: 'Source Serif 4', ui-serif, Georgia, serif;
	--font-mono: 'IBM Plex Mono', ui-monospace, monospace;
	background-color: var(--color-paper);
	/* Faint 32px drafting grid on the cream paper */
	background-image:
		linear-gradient(to right, rgb(26 30 32 / 0.035) 1px, transparent 1px),
		linear-gradient(to bottom, rgb(26 30 32 / 0.035) 1px, transparent 1px);
	background-size: 32px 32px;
	color: var(--color-ink);
	font-family: var(--font-sans);
}
${RESET_CSS}
${styleText(head)}`
  };
}
function fontFaceCss() {
  return "@font-face {\n	font-family: 'Archivo';\n	font-style: normal;\n	font-weight: 500;\n	font-display: swap;\n	src: url(data:font/woff2;base64,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) format('woff2');\n}\n@font-face {\n	font-family: 'Archivo';\n	font-style: normal;\n	font-weight: 600;\n	font-display: swap;\n	src: url(data:font/woff2;base64,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) format('woff2');\n}\n@font-face {\n	font-family: 'Archivo';\n	font-style: normal;\n	font-weight: 700;\n	font-display: swap;\n	src: url(data:font/woff2;base64,d09GMgABAAAAADisABAAAAAAoHQAADhJAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGmQbuWIcij4GYD9TVEFUWgCFLhEICoHRPIGhTwuEXgABNgIkA4k4BCAFhRQHjH0MBxsMhQXc8bBxAJjf5PZRlG3WQkYhsHEQSDDvyf4/JidyK1dtDg5IBoGTbk+PGpNKX5jKYFJp2Mkw3cNTIhIdm+mRiWWRV2gJVJ9x4D64qbkWBn6Rofu8qmjFD+JGk2fZGTjOa9TM/Xl+m3/OfQ94pIhgImI0ZUSgaK91ilX4HS7SVfurV+miyznnsliUW0tUjYH17IUUgYxQBB4IFKOLMaTCirB8VFRUFKEij/83BHPrlFELYoMVrIKxKMaqiCVjwIYDRo4qiYFiFQgqIZgfRgTGl2DVRxn4bdRHCf//cc/r2uf+ACXjIY1EvNPWCgY1qfYdv5+7q+/ViUhLA2YeEq19naklSP/Y0wTPASBc3DgOu3gk9gXw/+d+mnScN3C7qhFQupsq5RfIT7jOWSRVAA7ImczUdrKJDFjfwa3UPXvW+L1r/84sfJi7KaD9QlWonrp6Cry3KTBkbWIfYBEV88A8H3LcQgdwaSD+3tS03Y93uANIBaxSJBV5jheKJgxNOcXOVYilq8V/u9zFfu4tuAtYh90LDAoAqYDAs3CXl1gsQA6UYgYv8k45UXLKsfe4VWW3SpXsSnblpnTpogq5Ute7LN0UHtU28V8n8kLGz4L5lmCcU3m56fhhudJCoG4taRdxk+iwaSiBd9b26taGYZ2x7X19BAkCYh72RCQnYRHJiX2GMVdR2U2ra9xyEuCmJFEhICl/BFW4OQue5Ggjak3BP/IBC4gQAQAASEQwkB7KNAGaaArinnvQAw9g2ChGxSEqKqp4ECIA5AAECBI2WgGIKk8Ip955BMDjIxeZ+20oBNGBH+YmEKEBQF8f6j9Q1v7fLU3g9s+3gfxgfd8ApACIZBgulw9AD96aNSIeNjE84wPEZ5+hFQSkftNulinGG6lFgyqlBitUKFu6RNFC6fhB+a0N+qtZoE3tFYiHT2yV8P8qi9vf5gB0IH4rr25l1Na4ryxYx3h9XVL+RISvFkuzZYwsTk1JAfurI+/9X8lL8sL/nDwjTyf0hNwjN/zXycV+L+gt60GAl5MT2ytCNBTXUyBgz24Koa8pYuCgwrcViGrWKoDDoo6O0ObQWkMqiF/Lj4mb2AdKD9WHKkOlofxQNjamhiaGoutiQqEsOkh/1z6GZb+BPKV/pB/SX9P36Bv0JP0xyLh2Apd1iN5Db6O30KP0OrqPXpYSWcD6bkgbpJFUa2WkW1I4sAfiglghZogWIoeIH1JcCBNCjvPxkDhIFM3Q7EgoSH1t6TU0peNe3tPaMqj7d/O6jX3xTh8pl4CWnO4u3s47Bu2AJ7vIBwNtupFbc6tuyc3D4oLXevVXeSXnc1ouE87LlGY1nvpkJzwO/XSdGFPDsEwhD06xOSMgf/buQvccm/68u7uudRm6JecXdvKe7vA17PxrD27YqR3Zvu3Ye6+4bdjQ+rdii4w2F8vuWPNqVzH/nVn+3LODpI+un3LS8cfmqFj+9eVDL2ZQZgDGTu4zL5uf+QXQ2uEbh++S+WhAongaAGgml0HObwAgZ57k5wPWTpCAhKkzQA1qn9pwFDVWm0kA2DGZANOgGzRMR7hvB+3YAuO+SzUACVqmpXUQkGJtU+uA5QVA0WFq16C2xn2XaoBYAqlOSaqNzloIDBrmfzL4gwr8LR0gypbrkwPxNBQgDuKsTkA8sp12DPAWxn2XagDKfNFVWmkAmM1KN1ACpdZ9QAz28PMD3L7KGoACSyAksP5kTYR6NherFAEE9PP166jBAHhkzzkPwA9uUmnNBUAZRlmbAXHDUlSE36xWQAyg8R3v9HvzA9yk0voNAJNgJBsFaId20IOeGSsCIxjBCEZmApisCU/OUgOQUAu18IY9o113HkI/+MENVl9lDQin2gRr9gIw/dSF8WzCpF1UGxmAJQD+8+jIH+Qn/xwy7bVrg0YDMJMmUuMvI0Vq/xlYUwfwFTZBIvwPi+04MPcgyheFAD38CcvIYnEm+cWM/7nip05G/AEeMlSFBuIJUZv48wMAAAAL8oqNe7Gx4+Gz3nvYz33UJvq7HK/sC8sCy8nnifWJW9NrkKdch6kH+pqXSteX0/56nvvh3g9Inh+k9hHDguK1hC9yVHym9mPLvbWvqRacVl5MeY3Zevpy3D77boF+v16j1ifdIhRdh/beN/zri1t3dOBgbVhhZmfL/Rct0y/bhd2JO4Qbv6/fUZEY02ys4gHdyuLb5X2pLawTtUu+2rXHpbGhWGpZC9LlVO0o+aHUR5gHd4vns8H3I/f4t6G1q6y4hWKi80r8DXbovmtb0ZUsClqGYf11aMsGl/bPcyRNULt7O/qrodc+VIz5GBUasM5bgrKTYm76+g/vvMYD4EDF45pEqlq3jFn77PYXKeq9Pex+LvR6MRJosQehlWYGO+slzj/6+7zQDxtS2U6+cHENWhqL6keOO+6sFGcfvfNegNVJOsvdVtY16XZj1kXklutHxwR6940iw+7UAmJ/U6N20/sfsxeD0fEDD1ZmxPF+D2JPXO9m+ROJ9/NG7kl2my0nPAawONL0nhd2+LPEnn9kMccNXlhneQ/4UsN9bz70lMP+8V7V32Is195zL0fSLvJXp+CMKG7YBp0q+3Eizh36Sl9xU0rrOv/Y0HvG55RG7ENLb+6KQ/wWk3zR8qE3Kyl+0hWWAXDhOqkvcAccB3Jmefc3pPKHN6iE9n/9gXtCAskAOFOQcRPJTowYOilSBciQK0iRIpGM6kRp0CiFiUmaVmOkm6BNjuna5dlnvyHOOK/YRZcYXXVVuWtuqEDEQ1w0PgFCRoaQk3PgxhehokJoaAhoaYnpBGMLEUooTBhv4SLwRYpkI0YMIlYKllSpGGlyoFy5RPLksZYvH6NIMcZQpTiMaqBatTjq1GHUq4caNOBo1MhKkyYMExOJZmaUVsNxjTCCj5FG8jXKaFxjjCE11niUCSZAbaYQmWoamemmszXDDG5mmsnLLLN4mm02hTnmcDbXXB7mmcfOfPPJtWvnaqtt7G23g5OddrK3z36ODjhA5rTT7JxxHk+3bi6uukqpRw8X11yjdN0N7t57j6MP+kCGCIEYBBcXjYfHEZ8Aw4oNmpSUExkZPmfO7CgoiPnyRfPjT0ZNzbpFIBmXAl/gTrOS0px6lCEjkglgMfveIg6R6iO+Rs2UWnWtABsmagKT6g9s4qeMjqi8ztP8gNvYqw0+4A0uoAAv8PQ7U22ZXE/G6V3NAw4lafVnjAagbL4n/jFy7hmPfdS6xEMeyCPfrnAP1+Od69zJ28M3LrHX3S/bbfMgJURQo8SdGNJ+SBlsa4Wx7+7JVaSBSZvp5tnrkMM6XXbFzdiQSutrpFuFXoZMBlmy5TAqU65CpSrVatRrNKE7yT5CIlbErEnYkLJlx54DR053Z7XEJUrkyo8/9RLez4pYhQLAATvwhP0vBIXGwsbB4FZaPyydXoZMBlmy5ezz+mZDu0WJ0jL2w8qUq1CpSrWa1JbVp8E11ph+y4S8n75TtvaztpGdWx7sSxEUGgsbB4P7S97/IYSkiKHQWNg4GNwK790ial63OD2QvGpy/AiAjBt3Hjx58ebDl4pWiFDhIsTIrdbea7hRRldbt5hoksmmDOJ4MifhHxgbCug4NuIKqZvdgmUPqePkTpJDjrb2STvUu3X2u+VxNuAnCRxuR/iJiwe2PWEcoii8ml3u/7hil4Dvv9CQHL7L82Kgz0Lc7mNNdy3N0rSfrgA8h1Mxujkt+DoWPeerUAkVC/olhNmw0pDZgtfmd/moJ+6tX4WJhvCEeAT4sMZwGsMen7U6A5sXU2jgTgh6Crf/bGyG3/bXeUeTqRHad7UYy2HagdpqI7QdMJU3wOgJmKFphppDrY0tUHZEZoaiY8NbmqD/Cc/KBSobZ2AHUhACB7jAAI/Y5lKsiFkHQUS3mWz2zbynGvppJVerP7rb7rZUVm7p8SMHp3aHbYXF/aedQSAEKmQKDxmp7ibuecBqhlsW+nXLWbwo2JMQmIIoNhlRoA2RaxJK7WITQV0BhHLOx0VL8AIpdu9F4Lg/+gvASCxjM3zxXngoSAJp0MyGnP/bEgoncr8EJPxSHQT7biyJvYyOc4gqRgfSoEiLhk85wPbrgR3Y1BYHW9wSUQLtI2ZLRBTingcQrF4M9wvAZ/N3U4ASY0KSIYq7sqAQETEsPEq0scYZD7FUBxtpojjo5VlQIJ2OztofLVoge6pCdJRmXOVXlwgTeaA1POU6l4BEgSbCESLC5UXI4XnIAP+02ChAh0j0tceeZHHX8SWUGCFipMhRokaLHiNmrNglxWFVJvFQukCblQAQI6QuQQaAsHSMqHSvw/H6FMY6TGD+jIqQK+8QZz737NeQKjSElhTBUtDzAIMZ5g4EBMyG2gtOa5DPj6j9AVkdxYwr0dEFAJ5tjYKz6NMlqhZIH48YytyAuOARO5uHfBSg6MSxf1UbjC7FxrFA6LFVAOZ8nTa+E+iz9QdwG6gGUAeAAQA5y7L1sIDw/+eaHg2gl7bhE/AsACBDSQcAJQpCDAqAFAVAhZz+Za7BGQAjdteYEQA+IJW2HJNbS1cpNuwkTgCA7h0Ah5DdTFpq7FQAACAgV4ZfPF1/fWAmisdCCGlFGK8PCQaUs/FdWs+uH1I0xaXcPyPJH2Q8mUimkplkCVlJNitbFDfKWsrPVAk1/t30E4CQkk6kBelHuDcGqlHMxu9kLDnxBYnJio/ATgADAEAf9rmD74s4qShBAQC+/XTl9u4A4PZlvzh3e6Gm25EPbtyqulV58+rNTrwHAcQDKHIfAOBl663xQqM/cM4V+P/Xm3a57qAHen12wzHHHfDUNmdsdch2O7zywkt7fIJ4+ISsSMnYsiPnTMGFkhs/KmoaWjohQoUJF+mUw05750IkYqVKo5cpV558BQYrUmyoEka16jVoZNKs1XAjjDTGiVBw0hu37HbPI/c9Dg1fY+2bqbq9ddb32AXgtfU2BOW9L/YFa51prtpsky32YiNoDBYOLgEbYtYknNhz4EjElRd3Hnx4svAWLECgIBH8NUkUJ16yBElSpMthkCXbIP30N0CGUpXKlKtW4bkqZj9oMcwodUbzVRM4ipCNVtDlios6XXYJwt7HCgDgRABAtgIyBrieA+B35kZFNwtBvWn0lpD9I/JlETgtFMQnOS1Q0swNMf6IUUeZ+ITAmRtBgvNNKyYlO5DuXJ36wrxFVKE0gKWKygCpEqGFSsIv9x9AJFcml9e90+3HXnLu781K1mtFCnkr04hP7r6cBIUXPjbwLbMU0yskXMgpE/BFtZaqTmzM3Gq5ggUKC4WqSRo4B3lcT1BAfqxzA++dpL1CwimB8IdDviunhoucpJb2VHFMsUSBakYZWWbi4fAOKVrZlUVFiQn8RLWWfHeznEbdrqOGvbDKVSZFUStAdW5XNCWpcHzKg4jGrFSqQqGEXMiFOOOQ54Yhp1EWWZX4vXTek1e+oHhe+MDWalQDeDymMWnbZAIMQYfBZ0ZsHNrJvtJvS1DROvTmF0pJ29/5ZowIPr2KDms+0LewHruhxgCgzJgWxCqz7USGQ3UME816eG4gdDuC96HVgxYK8vJ5jUouX3uIUsQqzH/2HP5K3JI8sT+iRBNxQDJGU0FyyDnA/5xJpbWDOyDNaUqlyz+j3wUy+DeSkdXO7s31GlfhMA6KrbSD7RGZjEwGnCCJUerJnq/U0B9CPu5JjC4+punflCOEPLFiqIL1K6VGg7AtnLmw2CurUWz1GTcLpAmF8Syd41oGiVoFev7pzXtLkzW3AVQ1wmNFYh287WwKObyYKqOAlCDc8TLp5ElQqrQJdNfUawK+3WWQlROLFGBzWxBhqXO62PhtO+MuwTgAMypNjJJ4q0mIQi207YfCuE+RyKQl5lNIV65igxBxWLj/rUO4zEbli8W2HSmF6YtoT0oiOSvacyAX5WKqSG0dHjvUiM6Q2CjOlXQ2HIBta4JYqZZWtjMeC3XQSdwWF9HrzjVOYRZWmdhHK4cSmcpRSF5lUS22bFsV8BuLFj2pSArUsiissUUzKHSQDpwjCzmNsR979kqtSVX7BbWHfF6JMVtU+zKuXXMoLB3uTx+QeiQUVDLcBCp35r1dnZWiAbEqZ+2+3k0mAYitZBvHSGeSOsh2hSm0uGYzA/aBhiBAJniCh2zyZCUx0gPAvKwufnkM+C7jwrxY1u1mF/nroCzit5nM3/57COVIS+c7DkoQYkfwCRy1HYhU72BYzK5sD2doi30Kv0Lq5INydAAI3j/O8J82eWz8R4pV3yXebyW5s/I4ZKTPEKz7QpQSM0EpvJikyAQ5t2xrwQWj2AoKxkrds/BKbuCCgDbn8tU2tLs4K0Wf5OUeWxCsoUV0nMuOLVL3pGWgQy2gBV/DwKFVK21a5fvudhx47Ml+xB48J++veDHtUdRVQ0E/z9X8IcuzlfReblIGAd5lOJZXHQPd7UzMi8lGWTo3zILETw1IemBSemloA3U+yWXbDZU8KrmWnGYXOa5l2VXHaXf1UAVENbnrIo9mvigpQOVb0qWrC3VJ85xPpY9/FqDRe2y2Oeuiavq86y1qVv2qdR5MLtVazhZly/wHSqNhGhMSy+9kziJaRM5+xs6VG9kwV6q8itnKlVfaa0tDNQrM2jmraAxYUNEY7nQC3ZtwSVlACUYhVp5VQxeycYDvs6919ejm0uwe2LbV6MplqSP9if4CaQqySHfUhxc4zN+LPSDTfLLOk5XUxj2hgvJyPXJhKLVD+7cspb9hGhBIsh2dty/TlVt43faCuYuaXL7lCI/XRv2pZkQtU0jKepeh8vwsOpPCaVBai50oXOfqyX7qPN+nZpJXIRey7QzaYgoVaw45MFFN01DahfibyLhuPWNCqPeobA1SM+kJHHRbbBg6DJ4GdGiLX830cBViOjyRsN+BavfQ+ZR9Y87uec09EgVr0TjIuKJXEluLBCj+ilweXcthHCiySPbstcOuaNqzo1V2861U73nRX5Z8gUjMgyohT5zPt+feWWQY//wuiWQ5dlyWgXnSpT4Pi9ShqJPTLVKAPBEa35e0O2FaOkQwq0kDigv8UD8rTe20L1sTmJHUQEYlgQIgIUq/9SkxAjdqfXWMJISaUJKehTqVbaB/tIrXXtyw7DUIu74zieU7FCb2v5gLw4FAkikPVRKXaBTZdH1scrBcYB60R20+FrujWwS2MrcribvcAezFl4NtMMNnX4mxOFQ744wMhWmIzcqlVyHia8COGqokUDmFBuvT1FBgg3UQUT8WXgsJt8e0J6M1Wescwe6O0f3hif5h2fF5v7Ay9PzjbR+5N3KU/jK6XuExv+sVqUSTF6KjoMwvqAKikptnZNph0ewZeQWKFFGSqHcHIqjbfMyj66O8nwq4ISpxiTFuwpxTJRAFmOctEm2TSWW9w+DXw5MDxsthRkXerMScChGF59eIDjroUAcCLgquFaE8U97conOfFjhCpXWjLMd04EQ7Pq2ITug2mMEOOyWzJmk1aObjlZb+6LxyKlyIdhdupWSu3Non+7jiH2vtGiZrV6enPL73UCMDSXYGgqBUG3kg4GcTzZrEekWV7htpzpOi+hZ5tY48P/ypMYGCqoxmRgmzzitW9LHIiaiV7e7mPfPiO/eEbJFAnSMKkwEgehO7qnHzHonSOuZNkjpqt8xRaVrmr8v5GXi4Zie/uuZkK2/sZc9DtZNXZumO3NxygQss/EoZLPzwv7Qjq/mu+9b9dDABpX7IIfTiGuh+ci+tmaWjSdQA1jnTzUXaabcU/hXTiItg9TGThWQPBu6tkLSXxzodPLpcCbhPZuVqDbPqQMDLGh8Wmi+xDiQL/T+TqmwdIlgTEuTWD03fgfdhN0zDZfVYrKc/WzkKADwkUP+yuxGs36sSuR9297jNyv0eVoSeVPdb3zFJYlm8OMgrD9fp+OEm8E3vG+V8inxTOCcUbmrfFOEHS62lLOdxxtgusLuAvqeooon61hG2twkmPC7ieU+du+xQG2vnh043q6L+TtDJoFYM8ZRj2+VqtDSG5dGGZzlu3tulqDSIhpNTEyAAUkHb8tZorUKkLzSFbqsWkDZOrGJ0kIRsDcaBwGyWH/D6nCanmVUVGUUJN+auXDbxMRd1ZIHpXFhNOp22rm9oLLQzOtea9U4Y21roWpKAuIhHlWy1W8sl+NyY4VpLw1du3GoTp9tto4b8UBhCWj2jUWA0w1XW1EX94tpT/NQU+tZIKFltrRnqY7o9bYUfeEWECvzLOPnVV7u7C3C0Ozo7MibEzIKkAG2fQWoRVVxQacEzq+6ldOLFNT986NLX85bumT2AWurDQGVO8sq8OLmaddAG+7bDRsuUCRBhbLuX6y2DNKYiONk7ZzFj7TYd2rrNTwg65782b7zVpMy6seExo7tmPGs3PRrIGXP+ez/SWBCdM2vGpR0uoXpVxgoWemAm4Uvs7nETwwRllCZrgZJ0gPYapkU8nwSkYhqk9HJWBhtKmZgClKNiilA01x1vKgtjV85w0IOLpKzSlsoGpogYgt2OFTmuFZ/pNLIjzWqOpB7N9bPfvYt30uJdvJt27Nyd0rfD5H7/VguGRUdMTtD1gFJ3wunrX4bTXLHKvEdb6pYpB1nqgKzrZxvSML645wdqw1dlBDh92xm/h6p7S80OhmxhLI+2QuHoasVppkXLHKz6VTZopoNqZXBoSeyQpOFn9MS+iRZvmQfwjmBoGiTmEAoKJ9Swzj4seXjK/2XjqP6dBypGuq53ADFDvFvBDhnDRONaIf+dDopkRmateVBuILJVx+IH72wgpOO9tT/hsxGKgE1UKlbU9uDdBaJJqD4WSQIYzocp2z9yq5Q78Otb6K6OWmVyQ5Z2l5We8z3ilp5QOIfe0CbLbXBWuOMdu+GYnVfm/vwOBR1kjdSSWrJdUUVe4LpHCZjzaX2p8etD3PlA+2HK58i22JSSk1pYPcx3+LerdgA/sfTRVM2gexcr2o5AiBurjys3Yh+olqkVTlooNipvUl+tovq1/86hjSx0YlAxjiIkm0Ql2+3trooipW5uNI+vlPh4G6M2nVq6Y52wiolxh1fvYSteqGtezFIL6Wq97tjH3+7+UJS7+92x2yRo6/z/d8p1bVAIwjhrt6+1ULgs+Zu54N199S7lgePbnGHG1++y4RdxtNK9ZAjVuQD9w1moUGSwEaQ83J8kHJ6EicwlEdLZ2MmFyqYly+ksDnoDC/IrsDKare0d7bPMNcZZP0fZ2rEgZIi6mYT8SS53ki/Yj/pr3DIUcnkcannlyyh8zOtMStVtWuKr29hoAS2DXHWHljDjY/toChVAUvY3dfexR6Vdcck7CHMGqcv56uXN7741TJf+yZz40HifqiAe2DtWyDxJIpsk6UHS3xDvXqpZoJXnFCUp33R9wfiFi09pI91qu5RgpmJYO2lXwTx+3Xqrc3P3sUMH3s/vVbk6C0aETEM6VaB3i5gl6aRMVolLqBdbKCyDcE2Bs7NXif9LwYKDCdtyJMVx+dHwL9jkqBJ3afPBzTjcmtJLwN6BrRu2uEY62l3rhy11i7oX8dJwdzB2CVGCsd9Jw/MWAWZ9dz2PQfI52zvo3f1jJV0lO4fm+M7X8zhnyVBIx4KYz33ycdOSFY1Lgp5As7cCmnHydWtne/5374RkXnnc0rkgZFjf7/4ZHdij69LFgsXwQce+E105m7bam03tBJ9GXKhfTzo4fasldeCZuGwZ0ZZc7OUbZG7yM1749ZbS2WVwy7dmRg4S2DuGY4QxwweGyUKyjx3YpXofu5cMv0qcav9XDnkVI/Gnr9skBtSptnerhgEHy2rkK4sySetIfK5EJNJrPh75OEfR2JhCsBw5LfVUKBo6svGCoLH8WiQh8M0//yJ5qtTvPvqxJCJmy/Hq0qIHBwbTeMBHTNAIx19jDFW13YvqunJ/vpYXAcWMGU5KGrB3rES1eLB/MkNjKYjW1QdW4ro3Z2eGRjsj5sAN5EtO5hNePeJQN8t7h46fccc+SoQEvdCw2ZGzubMrZ9Nme0PTJrtHuzqng25yNHaJLAkYnEtKSsFlo9uoSLgfFY3NTiFJsS5MaRIZMW1s5TpLkni3i9qaojQ5xFuWNF9pUpvdbUKnNO8ZnI30KVi1lYgJJ7qIUvWIKp5+HlgMDWOOrM2dXVmbxuwNuuqEeh69e2CstKt05/AcDq+uOlGW7VAAe0fAWiYTl5nN0opAqvXqi5qTAoaQUrCTchJkdYzUX7QU1paUm9KqyWxnFv+3XMAUkQo3X8tOgFrY1FnyMrxug9O9ueN4Lq6egq05jLFhy4tS/2s5aK9IEZXoTKrKVb3I7cG/L/zTfJOHFhB9w6SbwMNX12HcUr5LGQojvxAorUw2xfMIl7ilO6MTKBM2VFacjXiWZhJKOBaHIIBWy8vRNhHHJoWvZRJ+H2ZxDj6Px/Iv2WKz4m2EcZqBn2UrXpwMfhd925PV850ItPH9y1QZQd/ekZ1Wh9NicTqtO0f2+jKCy1Tw2Nbncs01ekrs8+aLHhVzbrFap99hKL+90y1GFeTz1s4FqCEA+dDcY4PHlVs2J4cp+1arB09s/GstOPe3f0v5KNudRwzFJ1szwgpHj/hHk7L9Q2SxerFlowPH9u+p2M6ryCFACGnl3PLtILK3+nvzidVfhvZ1731g1u+vE9v+Z334DVBxkWNrd6NCd9l8GD4mBdoqIZkHEvXlb2zd3HBv+ev6OcDBz2qj6+0q+Ihsv4PBPfszVxq2YQBTmVEhlgSs/428jlgl439JdKkPjRxJY5VZ9bVEcrPjecElkiL/kWZGG37JIqagB1yB4fdqofxUQUY+e060jYV5ZKJQBiKiBdPpSI4m1RigmS1lDKlF/gKpR1AKhjYQCRe/zwuHWMXHQqoTD30biSXIvVE0MhJHyOcPTNQr9+I1MzsX5Fel/VXz4p6mxbO9FYuHTUWmZg0QplznAyXD3zeLXzV2LJi5ZpEhf8Id5fKGUVbwuCsm4laiAnGoR0zcigK27PpHc7TJ1HRVO2nmbbt4F2jgNxgpHfZ9vSBVlFbAXhDtZGEezWbQLmBLeGzdalqGZlbClX/z8LKsGrmsw0+vIszXcjAFJ+9iVoiplocebIq5gv4276INia8kvEBEOiaoihBl5DiOnfHkc+I3G9UYesQ6CPAlueyxcGhq693eaXbvgy1UbaFCEiwuFnf5lfUtHBBvEGPE8UbAIQ7t+IqGFGBMKMCE5bYold1FxcpgqypH5sH9TnbKeulFE1Q2CpMmxUiwaWIOdWI+dYmEnPWDNwG7Qo3xeQ//DTP4lZKu4mJpsFChoR64+UfYdG+rFZoePlbADm9hhWBMAiTt8okhAicm3kj3fZ0NMUAO83Yq1cGivJTOSq0lfj1Gcu/HkPeFGWXh0SqYZMOwLmtsFJ7hDeuPqCN1ZxRpgh1KTx2vBWuSYCRYUwuPX4ozSeKlOHMp4MO87UpVl79YFWxT5rka5KkdfnoTYcDJxdadfGO3QkyzvMzHHrR9T/xtox3DZH9AfAlm/+RePIDsXJAqpfmpafG8/yxeNjxOGhf90TE9Tmac/an7/TEcgPzFtjqbMjnR+HtKdMjDxYVibBVGWlpX+iEYDtG+9bK49P/qLyeyFqSns9O5Crmjlm0hMNLTtkUv9NyOZA2fo8tTnGVJaS5scwzCiP3G6HTphCKLN0lxofA0cvwPK/zf2AvY3zCYp60tIi6HwxUJuZwE71Ggv9Q7zaFfLKRJHQxOtrGk14o7UomLJxGOUiVA5wv2Blf5onpFQL8z+rMlJtdBfWlvnU2L5zV+ZagpYsT8pXhAIVivCTtCsus75QzGfZ9HTNlF0dDbCsSYIJbfq2DjDZeA+mx4+frO3vdPfv3h0evjuq3B72yWoaoOehfoRbOhGeGRDxZTxZks1SX0/i7tsmlJLn2g1477QPpVbOK5xVSJt/ZlZMJ1Cf9IcYw3zFN0j/iqnPkUzyNawsvH2GgyMoPs0eyriWCeTqWmu6hYE/S1PPkdyrWKizTd+d46fikuTYKVbLcu4/PKVrtsKXYM/5zN3iba7YLnTeJtynj7/83nbSqz8/kZ9vY9+e3qi3W5g7cgtuSvZiF3OKpV+TFdPxcgRAU8vk2pDqmDbQvRFdNmvimial314r5BLWIgm4OFqSovvViZzk8NCSnJ5tVxDbg0CVp6yjJxk93YNBnWnZ4tevC10L87GNgPgO7wxVZYeviGApbE6FeIu0qKJF2FSi11y4M/wp6aMJsVjKIBWCiMSRhL+3Ln0D1m6u+NCnu84RBNQcivwQM3uSZ/zNsrhkMYPDFJjxVgzHFg6Odp2B/fb6VqCpXSrqISSZdfYZDksleGw1JbL/6NIQ7tnKTFCjGmEFZaXowRYSv+KyA7fOzzJ2XsibJ5yaSHb6Zo4SAOlurFfA1jQiJwGoEQ5qYwATv5Ewpb88KCMcWVojlJ6p9ykSJ+FvIYmhoOx6kMMn81IS50zkV47Kf/TyicSBNpg1hINxhY3lhgQTU7Jy2lACOReTHvKEZuqioHQN6kV+i1cn+lxOyrt5C/X0Mkrf1fmdFqwufX4NlSKZV9gQoF38LEd8cZSYa6dNxw/UhJXQkSm48TFR79Ixj8AnMVectKei34I4Fe90V/jCLujWqNzAhnM94eiHF8Et89xm7X+oS7e6L40ho57p4gVuUT2Y8BMPkJYtDwnSuckB9a+V+E2/5d36cIsPMesS5hhmn1bEy4ZNUynHZ67QnQBEf5YYSly3X6kGWLEQMRv4rPryaHRZo/mK/6FUTuFR/6b3n55tCKzZsP/7srdlvLkdCWI6A3xICW+jW4jnsV1xGDg167Hv9hDtUM79ymsb7pO/L2GdOuTCeDKTMG+aB43KkQGp4B93ZjVKDqdd0ZxYxqeD1gnTWXU1KM4qgV0vxaLEe9Mokfin58lO7ye8pNvcm4I56/4yj8z+jRfZe11AK9yk/E7wzPgeU0ptfpbPgb/LBuFw7KrYsg7LnT4h6GsOcyzD4IrSWLCumKi3Bq+Zhc9eEHH+Lq1xWil4nUG0rPnYHwRfi+L7gquNIXtUqEfi/94O6qu6DvGkNSsukPux1QATFqaXF8fO8aKHTgDCilcaYY+D/PoG1D/MZBK9w74nCBdkgcNsKAhiDRcTGz/kIjPtCDTy0yG4uZrdMxXTamLNXK9HAcsmwrS2bmPxUgxJFcbqQoiv8/SIJpi+haN3F5eQVxmTaniKbVFdBAgGhF+VJIKQXp5ddxv48tztRaYksecLkvYv2W30fXnoOK5m3D23NnerBeOl2rG2sGEjqPZOkxpSr6M1U8MycudQ+d8Vcfhb4MEouwGItaeRZjPr0QnU4RUBwKU5b2RtPqK3NNc0AyLLdFoihQxy5Hcd+Xyw5LWX9TiJoadeKnuymkFZ8QCFPridFLHeTK3Dp+RkZtsjJXybr61zNIsTnXBFN7m4TA/VtKU4NppXIM5R44yKwRVYl9vLRXH+1YZ9ciTHpvflP+CODAnK0yTSB9JW2HmkZFnPJjbYNS8CUnN8+NTpi7aQ4bumG5yElT+0WpZXaLuqZRDmQwXQnN5KAsKKqhDOg9xQydvSJVWKJfThOOkQUgpggY/+y9R88okQvKjRnaynqZvY7xroNKb3/HoEe102kdCDBsZG40DeQu+CR37v/upIxSfb2kjdCtTQFJMG+zROZTKGWuzv84dqE8xVMjslmrRakeuZDr+G15ikupkPmaJXm1KdsFomPSlGMiwfYUCW8+n1/CF7j4/GJAhtkrUkWl+hU00ShZ8DLGDwwzez9lZBSnCgP6TE2gQZahK6UaHVTqBythaqoZUZU0eiCKQZ9u99NufweSYbrCcz96IU2nLaRpckgjk5Zr3IV0jS/GFxOYjqEz+x0oAb/pyLwJmbV+kXmlYhVhlYT7+JWidv6fo1tFBdMClRjqtI7yVNGwFSTamLmR0aZcCASwbXV0sPZzBuMdV0k2DTP63g03vAAuzPMMrLZVPLWymhTpKlIJ/3dCINBPBjkJvLckt8lMcr3l8Z+EqNk0eRTjCc9MdsrIqU4y2ZFKlmUBTabvjDeF8ttrHBvvzgQSHPHcvZY/NYnRmbhY37EYpCskMZyR9QVbkN2CxSc9LOROrt291QJOgSldJY5wQ+O242O7j8bE3umMohgpiNSjUVGLwqMQAw8jIvOiiIhRL9b6/10S73dDLvPJ0VE7YMK6VT/Ob4nOL9r69OENj6b+xW1d8iaumWsFZ0Bv0crdMRNzY7DnCYlnsMiemsxIxIE7mRttw/h4CucJW5VhBGdAYCCTHUYLOc9AFxgfiLPRtXgGM+pGO4ZdP0iTOwxaA/4CGj+Ox59NwJwHlSEJfrEXs8sSJ76tzmMXScOREeAE8L+5SErcM96Uhybd2MBOWnWDhPbMG7+SSLp1lW/AnURjTuBwOzDondiNmEpUfCUG3RGP6gDHwKjRi7Lju3EMRtSNdiyr8EOK0mHQCvXV4fTfqp/hryZgzuPxN7C4cXCSnoE9UOc4+4g4x2kautLof4Go6L16KcdpAtqEdM8DBc4WQZuS7pH6JHub5OQW8Zb8CgY5MmBohQE/af1DPkuAFfbUpaX9/ckJUtLdryyOu461Odb39Nf4LdPtxq1PH573aOof3NZxz14z8b6gzqn0XjySkW2V7PlrB4B1hXIx8dZKRpxxoSbJZmYB//g1Y808OOd7rtlEgUGhvCrZdevAOVPHfYPVHqc82UR90jLZ198HMhZcFQ+8/QYpq/tXgxdXBfQy5jx+AAsr4LhI1MXO0uhwIXsmiwKnORbdy0KJOJlR/WNm0bib+m4vGE4gLL2a/u3B28vJjF491kJLXr3x463L8MT5Qlo5o19QjofVJenJlEFtKyJSSM9kIyPpjkV3s+IaeUkGK7brW90HvrnOvsNjJ/Hu2q26q0lia+6AD6+gi6qsLHOLrCWVZa60QhfmQBeG1m1NbZUNugi+oR22VZQmLMoKVHAmavasY6+4JsI8lVtRwzhMSjAfUsR3ZgaBCH5XXGwWSBa+5BcDRGz7knZAY64r75fN7sL8n+bMwapuX36hZoiyxWGnvFdvXQQW/kMf50d3QX69eqgdlK3q4XqQ85/IAS08yb2O3r0B7UWvOhN/jXeiwREptKNGv4wIP4ZsNZT9VxOo85jJP+KA9HvhbUn9ouP37In3xm84jb7GnSiaBL4Kfypr7JXNiAeBBQu+m1VzvcYH/vwebM+63f1/9779m8DbAHM/f39vcoUVAuNyeWs0SDSv6u1Rs20GZii+O3TO9ZGkaWDbB6AHj8faDZGXTXsA4xj57KjURMWxKEBAVCEWuFsE8YLBtTnrLq+bqOqc6Lzc/uOrTIJW4brjfaiqczLUPjipVgIH2XRgZGDwxODTQnJ+QS8dXDGYuLTjazcJSyMLBkhptCI6IZjbolJ02YW5Fi6Vf0LJWqfhJI2loCsJ1C2VULLuDx0oGjrdGoe1JyVhs7orqctP2nBsth03stzUsQrj5LAxjn7v9MWdDlxWsFGvDJK4aVy2NVnJdJ6bnC6oMBXQAP8U/IghBq0JV+soqGqIXo121m8ulyk8JiLSikm6ftL/qvV51DVEDXlieT0zIkHoJp6FTuX+ERYbEWkd9odrCno1jyRMiGTWrb8MOM3GA+5ad61BnF/Oy0wr46bkGWJWofBmEx7vlmDbR2rXI/aHNIMfhz7J/kT/iWu0fsXa5S8XFJ2e9+yUHJJ5+vt63+mR+T9f2lg47Lqov5h9cQj8JsSuOcBP76k9d73m+vna89eA83TNkxqwe8hqHekmWSzrT8r6eM1G168ftlqGR4DzVO2TWt5Ec0dz+ypIAGfobVunPockyDd3DGzz2598Ng8kPfl0nqvtweUC2C8nztWeu1xz+Xzt+cuMIaJrq56YfeH9EzSigV1KJO+4c2P2gSM76ITs90FHHoFrp3b1N/wdDyo1W+fNHmZvroFXwYHu7JUbFOvEkRGfkrahuGyeQUT3wkS8+A7w2dT+8if7+dkpVhrTYTQynVZqisxCdepxlq/dyh7ixhL2TOKZ25Njudsgu7B4K5WhMoBlYQ2D2l0J1baDKzev9onkhz+NH9Llq0VXwYub+Dexold0pfhKn0hx6FPw5diSi57KU2uClu2Lqnbxi4vf43T4jP0BM6FCYP7KgCRy2HNZoa/75jHjVd/c5wi3Opm10XoG6tAjEkl3EhbVAolk+/7nJSuMOdQkk/BbTCmKWEkrzK71LdqsqWnf4yzY0r1rx66DiZkRZkSmuzMdnhEWG5HYvOkMPkbogD50if3yO+Djz1ooTPNq0izZWyFx+jS12pTbw83LmcM35cpxy2KIYZ+oKQ52HIbwZQjBVuMkLYhg0hINaKFEj31AnnhaE/AZNaU9KWDG0sUlpUJVSZpNW1LPNSZbtdAiqA0KmMf5rtjPGLQwOM6ko7aYwuNJJZZojOhsRkI6eVzDIc0O9vzRw+Uo9axcpJCfFXufrMEsFmKz6c+V5iuC+xwrd84bikRnQj+SCC0x4LXQeSjCv6VGPFgIjoXSYr90ocORstDvh4hjCn6Q5tsGdG4uqygzwwQfMp3CyqBaZB7KLzSShKc3IPmKvRRSHpTo5lOtmcmq3LxFdttSTx5UWWTLy1tisy7N89DeXGwvYq/YlcnajL5Nn9ZvdbOcnQxyV/otG7wbHxXiphPvKb4Q3McNzZ9FCfVR5g7lUSGFlKwiBoTpBekzHdWOlelgoj/JxGKZkjgskwtKvVpO0k2zEfcQSbuJxN0kwl5ACYm9uABpOves+YNJ26HRwChl9O8J9FTg+coAQ0Z9kqieu6BMShoH/ttZ8ZnFd/9NzxYbngyN/brlBpkcmk19zCv1ginnGKmWhahk1miAu9hs/mGvxAsCu7sqdMrhyEkojCVW8Y58fBseW8HzolBVKgMefBqcHyy19wJbsuz5vCfQnBVI5I5yufdYOW7bJdRY3MBQe5d0Yclm3a67gwFU9dPh201889c6cfD6Z6fera0dC2YOQVNTW92Lh1+HHDLUBxgT+/nxn2dpU38rkHhF8WKBP4QqHIvTUXd7JB7wxiP1kMfcxHB2MMDlqnVcgb2XpU/9dRuXv1dqu/8Q0V3JYqHa1N8paGGGHAvgl1nJpD2KVfKKDW+4yP4b9HlqiuXy6rWvvUR6s37XIQAi8RNz8G+JlfpfBEU9BgDX/rsBAFyfrYudlj66V88LA7ERAAAIHhiqPCoE/m/cI5jlRT1xvQx1D5vrMprl+bqLKfZ31OCnGF4ykNsMXOMSGlVQvWYIzwWfe+Rd5scN4Vr3SbL4agbEi9Vw1IEBR1prN/jTcoRIvo7s9Gd8IYd6Kt2MfoKgHcatg/5dibnkR6oemH+QzFwRaKNjVYn40vAiJa9pK3Vl8rqKpBFWCasaLD4wx0UH+7pa7sRZfc/C9N1CrCLlaJsDNB3xQgV4BdpnWIeIhFfmmq83l3d108dDXLNEY0E0dFMgFY0bZDwpB+yqmR7Lb9dC2MZihcpZZuZRZiV55dBVrnJHglKqyuO8JSoSQDQR/zjlWx6BJCUkiKg0D09CSTDRpnwzmz9IDAkiWuJDAjRfQzSepcjyHJZ3r+sUY+q1kcirz0yWksSQdt0kePSoT6+AqGuXEofSnFaQ9ZSVzy5c4AaEBUQO8Ei9WFfvl5V86kPiV7WxUxx8rLfgDn6WZBAAjpeUnzEMu3bpRdYHJCBy5IBMivFt1cOAuxQgG0cDACDr6Ji6tQkvByzesXJwTenSLZTjyksCGehPJjEkrru6isRf1XorllXaL9T1n8iqdtqOzgYBBYVUtaSsEWQFt3hgXd8Y4lPZFxUoPXA+gPsI4LYAnA7izuNMA/D8b4orQeaRJ+QJ2e2/QqaTBS3/6EO1+SKDACeqxio7ukgHCg7gTlkRbdgUKUPclGBiuyklVvc0ml/epiyOftmUzUfDJiLBwqdDAAEVNkXgcWNMaREb2BEgjn5exOn5tgLkM2lk1ETPzKhBrXLZTFo0xjMOUKuCWQ3qK9WqZmYnaH2zSNrMYcq1qDURc+A1htkNNAXectW0cqQySNCiXI1aw5kUqNSoViKTBhXUL939VWp5+XqZNFEKpKGjE/DcvxLDlfOnf7mJkiNLNr2o0yVf3FmRJOzQbJQWTbBSpnMJpcINqey1QCJXi8+tU6mcWWKtMTOZ6YSnKfkwVhv2ZFerRSZalSErby7K0O+3Rk1qlWk1jFqhUZpV0pam+SrkE4e+Bqq2Tya+ZzycCIFjyqxVrkM7T14qeHvCR6XjTjrFlx9/Kqedcda5h0Tf+ABVAp13QbVLfrTOekGeC358ND4i+YbW6BIhUpRoz8QkBGlkQfLjoj9V6zRptECKVCZpnkrXrMUwP9DLkMngCrPhRiQMWmUlHLLlyJVnpHyjjDHWaAuNs0GBFwr1099MAww0XpuJJhhksCGKWOxUnAjkPjB96UIUwX4H/Os/Ng/FFh8o/aPaiTzRKC42ZKjiig8dJuxD4/+FLTluvPgJ7PbOe72sWXGmsBptMTeLHDKdEJtEXISJ8AkMVSpWPHHENtok0WFHbLbFVtustMpe+7DwUAlKWkoyU+zBSZipfoucyEuvbKfkysXPjJZIiAKTyFTccc0wzWyzzDE56jRKPE5suvQZMmbKXFrpZZSZxTxJ5up2w1U9biYjW/YcOcvKVXbucsotL0/e8puVr4IKK8qvSZihrDXQEYicxa9vKq/PyDNEzSotb28L+MfJ6nbZbZE1P0vPddvC2xtrhGJJamQXHnQ1T48f21VRE5iqB7m8sm/TcVIhlcWVoc4srkmN+vCKLWW1VYY1NQZio61zikWYRaapGu4hAftmTce6VWbXBNErA+2i8QXaNRtrdmaRx6JleagRwgEVhUGFYpHCDgq3oUJQ4gglbkSFiKKlgFBwQEFEUAh2EISCHQkUgiDYwac8RWhU9P3imCTBKoNW7pACH6llMuQ2hUEF6OXibnGDOfQJqXcMa6bJnXelp6WnQ1yf4rIpYlHKaQQzVmlra1Nne3MkNc7QEmZioiXMyYP4IZhGE+tLhHJY2JULx+OKMqSRVa2lHZl2Q1nkJ4HDddtq6iukrXwS6Yg5UkR1U1OdK2hUJ7yiqc0MBE5IB8UbL485c68zExSBVI+6ELEnXo2MfEmOPUdIpDODtC/yClE64i+gBYOeRxzhOZC+0fWSbG7/LSzUSNMX4gZ4ZiQOa2g6YfEczh9JxDmrxrz5RfONboPJlpbLF4mESFMbDrJPzZhe+g1ZDQAA) format('woff2');\n}\n@font-face {\n	font-family: 'Archivo';\n	font-style: italic;\n	font-weight: 700;\n	font-display: swap;\n	src: url(data:font/woff2;base64,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) format('woff2');\n}\n@font-face {\n	font-family: 'Source Serif 4';\n	font-style: normal;\n	font-weight: 400;\n	font-display: swap;\n	src: url(data:font/woff2;base64,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) format('woff2');\n}\n@font-face {\n	font-family: 'Source Serif 4';\n	font-style: italic;\n	font-weight: 400;\n	font-display: swap;\n	src: url(data:font/woff2;base64,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) format('woff2');\n}\n@font-face {\n	font-family: 'IBM Plex Mono';\n	font-style: normal;\n	font-weight: 400;\n	font-display: swap;\n	src: url(data:font/woff2;base64,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) format('woff2');\n}\n@font-face {\n	font-family: 'IBM Plex Mono';\n	font-style: normal;\n	font-weight: 500;\n	font-display: swap;\n	src: url(data:font/woff2;base64,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) format('woff2');\n}";
}
var FRAME_CSS = `body { margin: 0; }
main { max-width: ${SHEET_WIDTH}px; margin: 0 auto; padding: 40px; }`;
var CREDIT_COMMENT = "<!-- Based on the Bounded Context Canvas by the ddd-crew (https://github.com/ddd-crew/bounded-context-canvas), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). -->";
function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function sheetDocument(doc) {
  const { markup, css } = renderSheetParts(doc);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(windowTitle(doc.name))}</title>
<style>${fontFaceCss()}</style>
<style>
${FRAME_CSS}
${css}
</style>
</head>
<body>
<main>${markup}</main>
</body>
</html>
`;
}
function sheetSvg(doc, size) {
  const { markup, css } = renderSheetParts(doc);
  return `${CREDIT_COMMENT}
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
<foreignObject x="0" y="0" width="${size.width}" height="${size.height}">
<div xmlns="http://www.w3.org/1999/xhtml" class="${SCOPE_CLASS}">
<style>${fontFaceCss()}</style>
<style>
${FRAME_CSS}
${css}
.${SCOPE_CLASS} .${SCOPE_CLASS} { background: none; }
</style>
<main>${markup}</main>
</div>
</foreignObject>
</svg>
`;
}

// ../src/lib/render/index.ts
var SCOPE_CLASS2 = SCOPE_CLASS;
var CREDIT_COMMENT2 = CREDIT_COMMENT;
var renderSheetParts2 = renderSheetParts;
var fontFaceCss2 = fontFaceCss;
var sheetDocument2 = sheetDocument;
var sheetSvg2 = sheetSvg;

// ../src/lib/render/metrics.ts
var SHEET_WIDTH2 = 1440;
var SHEET_MARGIN = 40;

// src/image.ts
function outputPath(canvasPath, kind) {
  const stem = /\.bcc\.(json|html)$/.test(canvasPath) ? canvasPath.slice(0, -".bcc.json".length) : canvasPath.slice(0, canvasPath.length - extname(canvasPath).length);
  return `${stem}.bcc.${kind}`;
}
function declaredHeight(svg) {
  const root = svg.match(/<svg\b[^>]*>/);
  const height = root?.[0].match(/\bheight="(\d+)"/);
  return height ? Number(height[1]) : null;
}
function reproduce(doc, height) {
  return sheetSvg2(doc, { width: SHEET_WIDTH2, height });
}

// src/check.ts
function check(root, paths) {
  const report = { canvases: 0, images: 0, problems: [] };
  const compared = /* @__PURE__ */ new Set();
  for (const input of paths) {
    const result = readCanvas(root, input);
    if (!result.ok) {
      report.problems.push(readProblem(result));
      continue;
    }
    report.canvases++;
    const imagePath = outputPath(result.path, "svg");
    if (compared.has(imagePath)) continue;
    let committed;
    try {
      committed = readFileSync2(root.resolve(imagePath), "utf8");
    } catch {
      continue;
    }
    compared.add(imagePath);
    const height = declaredHeight(committed);
    if (height === null) {
      report.problems.push(
        `${imagePath}: no height on its <svg> element, so it cannot be redrawn and compared. Write it again with bcc render --svg ${result.path}.`
      );
      continue;
    }
    if (reproduce(stampIds(result.file), height) === committed) {
      report.images++;
      continue;
    }
    report.problems.push(
      `${imagePath}: does not match ${result.path} as it stands. Redraw it with bcc render --svg ${result.path}.`
    );
  }
  return report;
}

// ../src/lib/fs/write.ts
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
var sequence = 0;
function writeAtomic(path, text) {
  const temporary = join2(dirname2(path), `.${process.pid}-${sequence++}.bcc-tmp`);
  try {
    writeFileSync(temporary, text, "utf8");
    renameSync(temporary, path);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}

// ../src/lib/model/serialize.ts
function present(value) {
  return value !== void 0 && value !== "";
}
function fileMessage(message2) {
  return {
    type: message2.type,
    name: message2.name,
    ...present(message2.description) && { description: message2.description }
  };
}
function fileCollaborator(collaborator) {
  return {
    name: collaborator.name,
    ...collaborator.kind !== void 0 && { kind: collaborator.kind }
  };
}
function fileRelationship(relationship) {
  if (relationship === void 0) return {};
  const kept = {
    ...present(relationship.theirs) && { theirs: relationship.theirs },
    ...present(relationship.ours) && { ours: relationship.ours }
  };
  return Object.keys(kept).length === 0 ? {} : { relationship: kept };
}
function fileLane(lane) {
  return {
    collaborator: fileCollaborator(lane.collaborator),
    ...fileRelationship(lane.relationship),
    messages: lane.messages.map(fileMessage)
  };
}
function fileClassification(sc) {
  return {
    ...present(sc.domain) && { domain: sc.domain },
    ...present(sc.businessModel) && { businessModel: sc.businessModel },
    ...present(sc.evolution) && { evolution: sc.evolution }
  };
}
function toCanvasFile(doc) {
  return {
    version: doc.version,
    name: doc.name,
    purpose: doc.purpose,
    strategicClassification: fileClassification(doc.strategicClassification),
    domainRoles: doc.domainRoles.map((role) => ({ name: role.name })),
    inboundCommunication: doc.inboundCommunication.map(fileLane),
    ubiquitousLanguage: doc.ubiquitousLanguage.map(
      (row) => ({
        term: row.term,
        ...present(row.definition) && { definition: row.definition }
      })
    ),
    businessDecisions: doc.businessDecisions.map(
      (row) => ({
        name: row.name,
        ...present(row.description) && { description: row.description }
      })
    ),
    outboundCommunication: doc.outboundCommunication.map(fileLane),
    assumptions: [...doc.assumptions],
    verificationMetrics: [...doc.verificationMetrics],
    openQuestions: [...doc.openQuestions]
  };
}
function serializeCanvasFile(file) {
  return JSON.stringify(toCanvasFile(file), null, 2).replaceAll("<", "\\u003c");
}
function serializeCanvas(doc) {
  return serializeCanvasFile(doc);
}
function canvasBytes(file) {
  return `${serializeCanvasFile(file)}
`;
}

// ../src/lib/fs/discover.ts
import { readdirSync } from "node:fs";
import { join as join3 } from "node:path";
var SKIPPED = /* @__PURE__ */ new Set(["node_modules", "dist", "build"]);
function skipped(name) {
  return name.startsWith(".") || SKIPPED.has(name);
}
var EXTENSIONS = [".bcc.json", ".bcc.html"];
function isCanvasPath(path) {
  return EXTENSIONS.some((extension) => path.endsWith(extension));
}
function findCanvases(root) {
  const paths = [];
  const unreadable = [];
  function walk(directory) {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      unreadable.push(root.relative(directory) || ".");
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const path = join3(directory, entry.name);
      if (entry.isDirectory()) {
        if (!skipped(entry.name)) walk(path);
      } else if (entry.isFile() && isCanvasPath(entry.name)) {
        paths.push(root.relative(path));
      }
    }
  }
  walk(root.path);
  return { paths: paths.sort(), unreadable: unreadable.sort() };
}

// src/targets.ts
function targets(root, operands) {
  if (operands.length > 0) return { paths: operands, unreadable: [], walked: false };
  const found = findCanvases(root);
  return { paths: found.paths, unreadable: found.unreadable, walked: true };
}
function canvasFiles(paths) {
  return paths.filter((path) => path.endsWith(".bcc.json"));
}
function isArtifact(path) {
  return isCanvasPath(path) && !path.endsWith(".bcc.json");
}

// src/fmt.ts
function fmt(root, paths, options) {
  const report = { unchanged: 0, changed: [], problems: [] };
  for (const input of paths) {
    if (isArtifact(input)) {
      if (options.walked) continue;
      report.problems.push(
        `${input}: an HTML artifact carries a canvas rather than being one, and fmt writes Canvas files. Name the .bcc.json it was exported from.`
      );
      continue;
    }
    const result = readCanvas(root, input);
    if (!result.ok) {
      report.problems.push(readProblem(result));
      continue;
    }
    const canonical = canvasBytes(result.file);
    if (canonical === result.text) {
      report.unchanged++;
      continue;
    }
    report.changed.push(result.path);
    if (!options.dryRun) writeAtomic(root.resolve(result.path), canonical);
  }
  return report;
}

// ../src/lib/model/sections.ts
function nonEmpty(value) {
  return value !== void 0 && value.trim() !== "";
}
var SECTIONS = [
  {
    key: "name",
    label: "Name",
    placeholder: "Name this context",
    filled: (file) => nonEmpty(file.name)
  },
  {
    key: "purpose",
    label: "Purpose",
    placeholder: "What does this context exist to do? A few sentences in business language.",
    filled: (file) => nonEmpty(file.purpose)
  },
  {
    key: "strategicClassification",
    label: "Strategic classification",
    // No placeholder in SPEC §10: the axes render an em dash until picked,
    // and their teaching lives in the picker — the vocabularies themselves.
    filled: (file) => nonEmpty(file.strategicClassification.domain) || nonEmpty(file.strategicClassification.businessModel) || nonEmpty(file.strategicClassification.evolution)
  },
  {
    key: "domainRoles",
    label: "Domain roles",
    placeholder: "+ trait \u2014 how does this context behave?",
    filled: (file) => file.domainRoles.length > 0
  },
  {
    key: "inboundCommunication",
    label: "Inbound communication",
    placeholder: "+ collaborator \u2014 who sends this context commands, queries or events?",
    filled: (file) => file.inboundCommunication.length > 0
  },
  {
    key: "ubiquitousLanguage",
    label: "Ubiquitous language",
    placeholder: "+ term \u2014 which words mean something precise here?",
    filled: (file) => file.ubiquitousLanguage.length > 0
  },
  {
    key: "businessDecisions",
    label: "Business decisions",
    placeholder: "+ decision \u2014 which rules does this context enforce?",
    filled: (file) => file.businessDecisions.length > 0
  },
  {
    key: "outboundCommunication",
    label: "Outbound communication",
    placeholder: "+ collaborator \u2014 who consumes what this context emits?",
    filled: (file) => file.outboundCommunication.length > 0
  },
  {
    key: "assumptions",
    label: "Assumptions",
    placeholder: "+ assumption \u2014 what are you taking to be true?",
    filled: (file) => file.assumptions.length > 0
  },
  {
    key: "verificationMetrics",
    label: "Verification metrics",
    placeholder: "+ metric \u2014 what would verify this design?",
    filled: (file) => file.verificationMetrics.length > 0
  },
  {
    key: "openQuestions",
    label: "Open questions",
    placeholder: "+ question \u2014 what's still unresolved?",
    filled: (file) => file.openQuestions.length > 0
  }
];
function emptySections(file) {
  return SECTIONS.filter((section) => !section.filled(file)).map((section) => section.label);
}
function filledCount(file) {
  return SECTIONS.filter((section) => section.filled(file)).length;
}

// src/ls.ts
function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}
function ls(root, out2) {
  const found = findCanvases(root);
  const rows = [];
  const problems = [];
  for (const path of found.paths) {
    const result = readCanvas(root, path);
    if (result.ok) {
      rows.push({
        path,
        name: result.file.name === "" ? "Untitled" : result.file.name,
        purpose: result.file.purpose,
        filled: filledCount(result.file),
        empty: emptySections(result.file)
      });
    } else {
      problems.push(readProblem(result));
    }
  }
  if (rows.length === 0 && problems.length === 0) {
    out2(`No canvases under ${root.path}.`);
    out2(
      "bcc looks for .bcc.json and .bcc.html files, skipping hidden directories, node_modules, dist and build."
    );
  }
  const width = Math.max(0, ...rows.map((row) => row.path.length));
  const total = SECTIONS.length;
  for (const row of rows) {
    const filled = `${row.filled}/${total}`.padStart(`${total}/${total}`.length);
    const indent = `${" ".repeat(width)}  ${" ".repeat(filled.length)}  `;
    out2(`${row.path.padEnd(width)}  ${filled}  ${row.name}`);
    if (row.purpose !== "") out2(`${indent}${row.purpose}`);
    if (row.empty.length > 0) out2(`${indent}empty: ${row.empty.join(", ")}`);
  }
  if (problems.length > 0) {
    out2("");
    out2(
      problems.length === 1 ? "1 file is named like a canvas and did not read as one:" : `${problems.length} files are named like canvases and did not read as one:`
    );
    for (const problem2 of problems) out2(`  ${problem2}`);
  }
  if (found.unreadable.length > 0) {
    out2("");
    out2(
      `${plural(found.unreadable.length, "directory", "directories")} could not be opened, so nothing under ${found.unreadable.length === 1 ? "it is" : "them is"} listed: ` + found.unreadable.join(", ")
    );
  }
  return 0;
}

// src/measure.ts
var NoBrowser = class extends Error {
};
async function chromium() {
  let module;
  try {
    module = await import("playwright-core");
  } catch {
    throw new NoBrowser(
      "measuring a sheet needs playwright-core, which is not installed here. Install it beside a desktop Chrome (npm install playwright-core), or pass --height <pixels> and skip the measurement."
    );
  }
  return module.chromium;
}
function firstLine(error) {
  return error instanceof Error ? error.message.split("\n")[0] : String(error);
}
async function openMeasurer() {
  const engine = await chromium();
  let browser;
  try {
    browser = await engine.launch({ channel: "chrome" });
  } catch (error) {
    throw new NoBrowser(
      `no Chrome to measure with (${firstLine(error)}). bcc drives the Chrome already installed on this machine rather than downloading one; pass --height <pixels> to skip the measurement.`
    );
  }
  const page = await browser.newPage({ viewport: { width: SHEET_WIDTH2, height: 900 } });
  return {
    async height(doc) {
      await page.setContent(sheetDocument2(doc), { waitUntil: "load" });
      await page.evaluate("document.fonts.ready");
      const measured = await page.evaluate("document.documentElement.scrollHeight");
      return Math.ceil(Number(measured));
    },
    async close() {
      await browser.close();
    }
  };
}

// ../src/lib/editor/views.ts
var VIEWS = [
  { key: "sheet", label: "Sheet" },
  { key: "json", label: "JSON" },
  { key: "markdown", label: "Markdown" }
];

// ../src/lib/model/digest.ts
function classification(file) {
  const { domain, businessModel, evolution } = file.strategicClassification;
  const picked = [
    ["Domain", domain],
    ["Business model", businessModel],
    ["Evolution", evolution]
  ].filter(([, value]) => value !== void 0 && value !== "");
  if (picked.length === 0) return [];
  return [picked.map(([label, value]) => `${label}: ${value}`).join(" \xB7 ")];
}
function message(row) {
  const detail = row.description === void 0 || row.description === "" ? "" : ` \u2014 ${row.description}`;
  return `${row.type} ${row.name}${detail}`;
}
function relationshipLine(lane) {
  const present2 = (end) => end !== void 0 && end !== "";
  const theirs = lane.relationship?.theirs;
  const ours = lane.relationship?.ours;
  if (present2(theirs) && present2(ours)) return `Collaborator: ${theirs} \u2192 this context: ${ours}`;
  if (present2(theirs)) return `Collaborator: ${theirs} \u2192`;
  if (present2(ours)) return `\u2192 this context: ${ours}`;
  return void 0;
}
function lanes(rows) {
  return rows.flatMap((lane, index) => {
    const kind = lane.collaborator.kind;
    const head = `### ${lane.collaborator.name}${kind === void 0 ? "" : ` \u2014 ${kind}`}`;
    const relationship = relationshipLine(lane);
    const block = relationship === void 0 ? [head] : [head, "", relationship];
    const messages = lane.messages.length === 0 ? [] : ["", ...lane.messages.map(message)];
    return index === 0 ? [...block, ...messages] : ["", ...block, ...messages];
  });
}
function pair(head, detail) {
  return detail === void 0 || detail === "" ? head : `${head} \u2014 ${detail}`;
}
function body(section, file) {
  switch (section.key) {
    case "name":
      return [];
    case "strategicClassification":
      return classification(file);
    case "purpose":
      return [file.purpose];
    case "domainRoles":
      return [file.domainRoles.map((role) => role.name).join(", ")];
    case "inboundCommunication":
      return lanes(file.inboundCommunication);
    case "outboundCommunication":
      return lanes(file.outboundCommunication);
    case "ubiquitousLanguage":
      return file.ubiquitousLanguage.map((row) => pair(row.term, row.definition));
    case "businessDecisions":
      return file.businessDecisions.map((row) => pair(row.name, row.description));
    case "assumptions":
      return file.assumptions;
    case "verificationMetrics":
      return file.verificationMetrics;
    case "openQuestions":
      return file.openQuestions;
  }
}
function canvasDigest(file) {
  const lines = [`# ${file.name.trim() === "" ? "Untitled" : file.name}`];
  const missing = [];
  for (const section of SECTIONS) {
    if (!section.filled(file)) {
      missing.push(section.label);
      continue;
    }
    if (section.key === "name") continue;
    lines.push("", `## ${section.label}`, "", ...body(section, file));
  }
  if (missing.length > 0) lines.push("", `Nothing yet under: ${missing.join(", ")}.`);
  return `${lines.join("\n")}
`;
}

// ../src/lib/model/title.ts
function windowTitle2(name) {
  const trimmed = name.trim();
  return `${trimmed === "" ? "Untitled" : trimmed} \u2014 BC Canvas`;
}

// ../src/lib/artifact/html.ts
var STACK_BREAKPOINT = 760;
var ARTIFACT_CSS = `
/* The sheet at the editor's fixed desktop metrics, centered on the paper ground. */
body { margin: 0; }
main { max-width: ${SHEET_WIDTH2}px; margin: 0 auto; padding: ${SHEET_MARGIN}px; }

/* The renderer's wrapper paints the paper ground so that a fence carries its
   own; in a document the body already paints it, and a second painting would
   restart the 32px drafting grid at the wrapper's origin \u2014 a visible seam
   around the Sheet panel. */
.views__panel .${SCOPE_CLASS2} { background: none; }

/* One-column stack in reading order below the single breakpoint (SPEC \xA79.1).
   The centre box is one stacked cell holding its two sections in order. */
@media (max-width: ${STACK_BREAKPOINT}px) {
	main { padding: 16px; }
	article.quiet-sheet .grid {
		grid-template-columns: 1fr;
		grid-template-areas:
			'purpose' 'classification' 'roles' 'inbound' 'centre'
			'outbound' 'assumptions' 'metrics' 'questions';
	}
}

/* --- The three Views (SPEC \xA79.1) ---------------------------------------
   All three panels are in the document and visible; the script at the end of
   the body hides two of them and turns the strip into a tablist. Every rule
   here is written so that *doing nothing* leaves a readable file: the strip
   ships hidden, the panels ship shown, and each panel keeps a heading until
   the tab strip is live to carry that word instead. */
/* The strip is its own box with no wrapper, and it carries its own bottom gap:
   a bar around it would keep that gap when the strip inside went hidden and
   stand as an empty band above the sheet (the prototype's, exactly). Nothing
   to leak if there is nothing to leak from. The inline-flex is what the
   absent wrapper was for \u2014 the strip is as wide as its three tabs, not the
   page. */
/* Filled sheet at rest, which is where the artifact parts company with the
   editor (SPEC \xA75). The editor's strip rests *unfilled* to soften its
   resemblance to the chrome band above it; an artifact has no chrome band, so
   that softening buys nothing here and costs something real \u2014 on bare paper
   the 32px drafting grid runs straight through the control and its lines
   compete with the segment dividers. Filled, the strip is one object, the
   grid stops at its edge, and the ink segment reads as one of three peers. */
.views__strip[hidden] { display: none; }
.views__strip {
	display: inline-flex;
	margin-bottom: 14px;
	overflow: hidden;
	border: 1px solid var(--color-line);
	border-radius: 4px;
	background: var(--color-sheet);
}
.views__tab {
	padding: 0.35rem 0.95rem;
	border: 0;
	border-left: 1px solid var(--color-line);
	background: none;
	color: var(--color-ink-soft);
	font-family: var(--font-sans);
	font-size: 0.8rem;
	font-weight: 500;
	cursor: pointer;
}
.views__tab:first-child { border-left: 0; }
/* Resting on sheet, hover darkens to paper \u2014 the chrome button's own
   direction, which is only available here because there is no chrome. */
.views__tab:hover { background: var(--color-paper); color: var(--color-ink); }
.views__tab[aria-selected='true'] {
	background: var(--color-ink);
	color: var(--color-sheet);
	font-weight: 600;
}
/* Inset, and inverted on the filled segment: roving tabindex means the
   selected tab is the only one that can hold focus, so an ink ring on ink
   would be the only ring anyone ever saw (SPEC \xA75). */
.views__tab:focus-visible { outline: 2px solid var(--color-ink); outline-offset: -2px; }
.views__tab[aria-selected='true']:focus-visible { outline-color: var(--color-sheet); }

/* The script-less wayfinder: which of the three stacked panels this is. A
   paragraph and not a heading \u2014 \xA78.6 promises canvas name h1 / sections h2 /
   collaborators h3, and a real heading above the Sheet's own h1 would invert
   that. The stacked panels are regions instead, so they are still navigable. */
.views__heading {
	margin: 1.8rem 0 0.6rem;
	color: var(--color-ink-soft);
	font-family: var(--font-sans);
	font-size: 0.72rem;
	font-weight: 600;
	letter-spacing: 0.11em;
	text-transform: uppercase;
}
.views__panel:first-of-type .views__heading { margin-top: 0; }
/* The inactive panels are hidden by a class the artifact owns, and pointedly
   not by the hidden attribute. The app stylesheet inlined above is Tailwind's,
   whose preflight hides [hidden] with an !important inside @layer base \u2014 and
   cascade layers reverse for important declarations, so an unlayered
   !important of ours would lose to it however specific. The print pass has to
   raise the Sheet panel back up whichever tab is live; against a plain class
   it simply outranks it by specificity, and nothing in the file needs
   !important at all. Found by printing from the JSON tab, which produced a
   blank page \u2014 wayfinder/tickets/048-views-checkpoint.md. */
.views__panel--off { display: none; }
.views--enhanced .views__heading { display: none; }

/* The two text Views: the same sheet panel the canvas is drawn on, grown to
   hold text. No height cap \u2014 the editor capped its panes so Copy and Apply
   stayed reachable, and an artifact has no buttons to keep in reach. Wrapped
   rather than scrolled, including the JSON: nothing here is edited, so a long
   line is something to read, and a pane that scrolls sideways at 200% zoom is
   the horizontal scroll \xA78.6 rules out. */
.views__source {
	margin: 0;
	padding: 1.35rem 1.5rem;
	border: 1px solid var(--color-line);
	border-radius: 5px;
	background: var(--color-sheet);
	box-shadow: 0 1px 2px rgb(26 30 32 / 0.04);
	color: var(--color-ink);
	font-family: var(--font-mono);
	font-size: 0.8rem;
	line-height: 1.65;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

/* Minimal print pass: clean section breaks \u2014 printing is the PDF answer.
   Sections keep together whether they sit in the grid or inside the centre
   box; the box itself prefers to keep its pair on one page. */
@media print {
	main { max-width: none; padding: 0; }
	/* Print is the Sheet, whichever View the viewer happens to be looking at \u2014
	   a printed JSON dump is nobody's PDF (SPEC \xA79.1). The id outranks the
	   off-class the script writes, which is the whole reason that class exists
	   rather than the hidden attribute: see .views__panel--off above. */
	.views__strip, .views__heading { display: none; }
	#view-panel-sheet { display: block; }
	#view-panel-json, #view-panel-markdown { display: none; }
	article.quiet-sheet .grid { display: block; }
	article.quiet-sheet .grid section,
	article.quiet-sheet .centre { break-inside: avoid; }
	article.quiet-sheet .grid > * + * { margin-top: 18px; }
	/* The centre plate is a background wash (SPEC \xA75); ask print engines to
	   keep it, since browsers drop backgrounds by default. */
	article.quiet-sheet .centre { display: block; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
	article.quiet-sheet .centre > section + section { margin-top: 18px; }
	article.quiet-sheet .tb,
	article.quiet-sheet .foot { break-inside: avoid; }
}
`;
var VIEWS_SCRIPT = `<script>
(function () {
	var root = document.querySelector('[data-canvas-views]');
	if (!root) return;
	var strip = root.querySelector('[role="tablist"]');
	var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
	var panels = [].slice.call(root.querySelectorAll('.views__panel'));
	if (!strip || !tabs.length || tabs.length !== panels.length) return;

	for (var i = 0; i < panels.length; i++) {
		// Tab semantics are the script's to add: a tabpanel with no live
		// tablist above it would be a promise the script-less file can't keep.
		panels[i].setAttribute('role', 'tabpanel');
		panels[i].setAttribute('aria-labelledby', tabs[i].id);
		panels[i].removeAttribute('aria-label');
		panels[i].tabIndex = 0;
	}

	function select(index) {
		for (var i = 0; i < tabs.length; i++) {
			tabs[i].setAttribute('aria-selected', i === index ? 'true' : 'false');
			tabs[i].tabIndex = i === index ? 0 : -1;
			// A class, not the hidden attribute \u2014 the print pass has to raise
			// the Sheet back up from here, and preflight's layered important
			// [hidden] rule cannot be outranked from an unlayered sheet.
			if (i === index) panels[i].classList.remove('views__panel--off');
			else panels[i].classList.add('views__panel--off');
		}
	}

	function move(index) {
		select(index);
		tabs[index].focus();
	}

	for (var t = 0; t < tabs.length; t++) {
		(function (index) {
			tabs[index].addEventListener('click', function () { select(index); });
			tabs[index].addEventListener('keydown', function (event) {
				var next = -1;
				if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
				if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
				if (event.key === 'Home') next = 0;
				if (event.key === 'End') next = tabs.length - 1;
				if (next < 0) return;
				event.preventDefault();
				move(next);
			});
		})(t);
	}

	root.className += ' views--enhanced';
	select(0);
	// Last, not first: the strip is only allowed to look live once it is. If
	// anything above threw, the file is still the honest stack.
	strip.removeAttribute('hidden');
})();
</script>`;
function viewPanels(sheet, json, markdown) {
  const tabs = VIEWS.map(
    (view, index) => `<button type="button" class="views__tab" role="tab" id="view-tab-${view.key}" aria-controls="view-panel-${view.key}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${view.label}</button>`
  ).join("");
  const [sheetLabel, jsonLabel, markdownLabel] = VIEWS.map((view) => view.label);
  const panel = (key, label, body2) => `<section class="views__panel" id="view-panel-${key}" aria-label="${label}">
<p class="views__heading">${label}</p>
${body2}
</section>`;
  return `<div class="views__strip" role="tablist" aria-label="Views" hidden>${tabs}</div>
${panel("sheet", sheetLabel, sheet)}
${panel("json", jsonLabel, `<pre class="views__source">${escapeHtml2(json)}</pre>`)}
${panel("markdown", markdownLabel, `<pre class="views__source">${escapeHtml2(markdown)}</pre>`)}`;
}
function escapeHtml2(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function artifactDocument(doc) {
  const json = serializeCanvas(doc);
  const { markup, css } = renderSheetParts2(doc);
  const title = windowTitle2(doc.name);
  const markdown = canvasDigest(toCanvasFile(doc));
  return `<!doctype html>
${CREDIT_COMMENT2}
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml2(title)}</title>
<style>${fontFaceCss2()}</style>
<style>
${css}
</style>
<style>${ARTIFACT_CSS}</style>
</head>
<body class="${SCOPE_CLASS2}">
<main data-canvas-views>
${viewPanels(markup, json, markdown)}
</main>
${embeddedCanvasBlock(json)}
${VIEWS_SCRIPT}
</body>
</html>
`;
}

// src/render.ts
async function render2(root, paths, options) {
  const report = { written: [], problems: [] };
  let measurer = null;
  try {
    for (const input of paths) {
      const result = readCanvas(root, input);
      if (!result.ok) {
        report.problems.push(readProblem(result));
        continue;
      }
      const target = options.out ?? outputPath(result.path, options.kind);
      const absolute = root.resolve(target);
      if (absolute === root.resolve(result.path)) {
        report.problems.push(
          `${result.path}: rendering it as ${options.kind.toUpperCase()} would overwrite the file it was read from. Name --out <file>, or render the .bcc.json it was exported from.`
        );
        continue;
      }
      const doc = stampIds(result.file);
      let text;
      if (options.kind === "svg") {
        let height = options.height;
        if (height === void 0) {
          measurer ??= await openMeasurer();
          height = await measurer.height(doc);
        }
        text = reproduce(doc, height);
      } else {
        text = artifactDocument(doc);
      }
      writeAtomic(absolute, text);
      report.written.push(root.relative(absolute));
    }
  } finally {
    await measurer?.close();
  }
  return report;
}

// src/main.ts
var USAGE = `bcc \u2014 the Bounded Context Canvas files in a project.

usage: bcc <command> [options] [<canvas>...]

  render   draw a canvas as an HTML artifact, or as an SVG image
  check    read every canvas through the parser the editor imports with
  fmt      rewrite canvases in their canonical bytes
  ls       list the canvases under the root

Every command takes --root <directory>: where bcc looks, and the furthest it
goes. It defaults to the working directory.

bcc <command> --help says what one command takes.`;
var COMMAND_USAGE = {
  render: `usage: bcc render [--svg] [--height <pixels>] [--out <file>] [<canvas>...]

Writes <canvas>.bcc.html beside each canvas, or <canvas>.bcc.svg with --svg.
With no canvas named, every .bcc.json under the root.

  --svg               an SVG image instead of the HTML artifact
  --height <pixels>   the SVG's height, rather than measuring it in Chrome
  --out <file>        write here instead of beside the canvas; one canvas only
  --root <directory>  where canvases live (default: the working directory)`,
  check: `usage: bcc check [--root <directory>] [<canvas>...]

Reads each canvas through the parser the editor's Import\u2026 uses, so a canvas
that passes here opens there. Any .bcc.svg beside a canvas is redrawn at the
height it declares and compared byte for byte; a canvas with no image beside it
is not a finding. With no canvas named, everything under the root.

Exits 1 if anything does not check out.`,
  fmt: `usage: bcc fmt [--check] [--root <directory>] [<canvas>...]

Rewrites each .bcc.json in the bytes an export would have written \u2014 the same
key order, the same indent, the same trailing newline. With no canvas named,
every one under the root.

  --check   name what would change, write nothing, and exit 1`,
  ls: `usage: bcc ls [--root <directory>]

Every canvas under the root, with how many of its eleven sections say something
and which ones do not.`
};
function out(line) {
  process.stdout.write(`${line}
`);
}
function problem(line) {
  process.stderr.write(`${line}
`);
}
function unusable(message2, usage2) {
  problem(message2);
  problem("");
  problem(usage2);
  process.exit(2);
}
function plural2(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}
function openRequestedRoot(requested, usage2) {
  let root;
  try {
    root = openRoot(requested);
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    unusable(`--root ${requested}: ${why}`, usage2);
  }
  const unservable = whyUnservable(root.path);
  if (unservable !== null) unusable(unservable, usage2);
  return root;
}
function positiveInteger(value, option) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new UsageError(`${option} takes a whole number of pixels, not ${value}.`);
  }
  return parsed;
}
async function run(command2, argv, usage2) {
  const spec = {
    render: { booleans: ["svg", "help"], values: ["height", "out", "root"] },
    check: { booleans: ["help"], values: ["root"] },
    fmt: { booleans: ["check", "help"], values: ["root"] },
    ls: { booleans: ["help"], values: ["root"] }
  }[command2];
  if (spec === void 0) {
    unusable(`no such command: ${command2}. bcc takes render, check, fmt and ls.`, USAGE);
  }
  const options = parseOptions(argv, spec);
  if (options.booleans.has("help")) {
    out(usage2);
    return 0;
  }
  const root = openRequestedRoot(options.values.get("root") ?? process.cwd(), usage2);
  if (command2 === "ls") {
    if (options.operands.length > 0) {
      throw new UsageError("ls takes no canvas \u2014 it lists them all. Did you mean bcc check?");
    }
    return ls(root, out);
  }
  const found = targets(root, options.operands);
  for (const directory of found.unreadable) {
    problem(`${directory}: could not be opened, so nothing under it was looked at.`);
  }
  if (command2 === "check") {
    if (found.paths.length === 0) return nothingFound(root, found, 0);
    const report2 = check(root, found.paths);
    for (const line of report2.problems) problem(line);
    if (report2.canvases > 0) out(`${plural2(report2.canvases, "canvas", "canvases")} check out.`);
    if (report2.images > 0) {
      const beside = report2.images === 1 ? "it" : "them";
      out(`${plural2(report2.images, "image matches", "images match")} the canvas beside ${beside}.`);
    }
    return report2.problems.length === 0 ? 0 : 1;
  }
  if (command2 === "fmt") {
    const paths2 = found.walked ? canvasFiles(found.paths) : found.paths;
    if (paths2.length === 0) return nothingFound(root, found, found.paths.length);
    const dryRun = options.booleans.has("check");
    const report2 = fmt(root, paths2, { dryRun, walked: found.walked });
    for (const line of report2.problems) problem(line);
    for (const path of report2.changed) {
      if (dryRun) problem(`${path}: not the bytes an export would write.`);
      else out(path);
    }
    if (report2.changed.length === 0 && report2.problems.length === 0) {
      out(`${plural2(report2.unchanged, "canvas is", "canvases are")} in canonical form.`);
    } else if (dryRun && report2.changed.length > 0) {
      problem(`Rewrite ${report2.changed.length === 1 ? "it" : "them"} with bcc fmt.`);
    }
    return report2.problems.length > 0 || dryRun && report2.changed.length > 0 ? 1 : 0;
  }
  const kind = options.booleans.has("svg") ? "svg" : "html";
  const height = options.values.has("height") ? positiveInteger(options.values.get("height"), "--height") : void 0;
  if (height !== void 0 && kind === "html") {
    throw new UsageError("--height sizes an SVG viewport, and the HTML artifact has none.");
  }
  const paths = found.walked ? canvasFiles(found.paths) : found.paths;
  if (paths.length === 0) return nothingFound(root, found, found.paths.length);
  if (paths.length > 1 && options.values.has("out")) {
    throw new UsageError(`--out names one file, and ${paths.length} canvases are in reach.`);
  }
  if (paths.length > 1 && height !== void 0) {
    throw new UsageError(
      `--height is one canvas's height, and ${paths.length} canvases are in reach. Render them one at a time, or leave it out and let Chrome measure each.`
    );
  }
  const report = await render2(root, paths, { kind, height, out: options.values.get("out") });
  for (const line of report.problems) problem(line);
  for (const path of report.written) out(path);
  return report.problems.length === 0 ? 0 : 1;
}
function nothingFound(root, found, artifacts) {
  if (!found.walked) return 0;
  if (artifacts > 0) {
    out(`No .bcc.json canvases under ${root.path}.`);
    out(
      artifacts === 1 ? "The one file here named like a canvas is an HTML artifact, which carries a canvas rather than being one." : `The ${artifacts} files here named like canvases are HTML artifacts, which carry a canvas rather than being one.`
    );
    return 0;
  }
  out(`No canvases under ${root.path}.`);
  out(
    "bcc looks for .bcc.json and .bcc.html files, skipping hidden directories, node_modules, dist and build."
  );
  return 0;
}
var [command = "", ...rest] = process.argv.slice(2);
if (command === "" || command === "--help" || command === "help") {
  out(USAGE);
  process.exit(0);
}
var usage = COMMAND_USAGE[command] ?? USAGE;
try {
  process.exitCode = await run(command, rest, usage);
} catch (error) {
  if (error instanceof UsageError) unusable(error.message, usage);
  if (error instanceof NoBrowser) {
    problem(error.message);
    process.exit(1);
  }
  throw error;
}
