/**
 * Canvas-file parser/validator (SPEC §3.3): integer version check, ordered
 * raw-JSON migrations, then strict shape validation. Files from a newer format
 * version are refused before anything else looks at them; anything that can't
 * be read as the eleven-section shape is refused as not a Canvas file. The
 * validated result is rebuilt key by key, so unknown extras never ride along.
 *
 * One validator, two levels of disclosure. The app keys its single sentence
 * (SPEC §10) off `reason` alone and ignores everything else; a non-human
 * caller — an MCP tool handing an error back to a model that has to fix the
 * file — reads `detail`, which names the offending field and what was expected
 * there. Both come from the same walk, so they cannot describe different
 * schemas.
 */

import { extractEmbeddedCanvas } from '$lib/model/embed';
import {
	CANVAS_VERSION,
	type BusinessDecision,
	type CanvasFile,
	type Collaborator,
	type CollaboratorKind,
	type DomainRole,
	type Lane,
	type Message,
	type MessageType,
	type Relationship,
	type StrategicClassification,
	type UbiquitousTerm
} from '$lib/model/canvas';

export type ParseResult =
	| { ok: true; file: CanvasFile }
	| { ok: false; reason: 'newer-version'; version: number }
	| { ok: false; reason: 'not-canvas'; detail?: string };

/**
 * The single place a `detail` gets its full stop. Every caller writes a clause
 * — "expected an array, got nothing" — and the readers put that clause into
 * sentences of their own: the MCP server joins it with the two lines that name
 * the format and point at `bcc_explain`. Without a terminator the clause runs
 * straight into whatever follows it.
 */
function notCanvas(detail: string): ParseResult {
	return { ok: false, reason: 'not-canvas', detail: /[.!?]$/.test(detail) ? detail : `${detail}.` };
}

/**
 * Recognized so `parseCanvasImport` can tell "not JSON" from "not a Canvas".
 *
 * Written in the same `expected …` idiom as every field clause below, and
 * naming neither "the file" nor "this text": the JSON View shows this line to
 * someone looking at a textarea (SPEC §3.3, §10), while an MCP caller reading
 * the same clause is genuinely holding a file. The idiom is the one wording
 * true for both.
 */
const NOT_JSON = 'expected valid JSON';

/**
 * A v1 lane carried `collaborator` and `relationship` as plain strings; v2
 * makes both objects. The v1 `relationship` string lands on `ours`, uniformly
 * and with no interpretation — deliberately not because that is what anyone
 * meant. The nine teaching one-liners in the relationship vocabulary are
 * written from mixed perspectives (`conformist` speaks for this context,
 * `big-ball-of-mud` for the other side, `partnership` for both at once), so no
 * single side ever was meant. What carries the rule is that both ends are
 * optional and free-text: a wrong guess renders visibly on the lane and is one
 * pick to correct, with nothing lost. A migration that guesses uniformly and
 * cheaply beats one that guesses cleverly and invisibly.
 *
 * Anything that is not the v1 shape passes through untouched, for the v2
 * validation walk to refuse by name.
 */
function migrateLaneV1(item: unknown): unknown {
	if (!isRecord(item)) return item;
	const { collaborator, relationship, ...rest } = item;
	return {
		...rest,
		...(collaborator !== undefined && {
			collaborator: typeof collaborator === 'string' ? { name: collaborator } : collaborator
		}),
		...(relationship !== undefined && {
			relationship: typeof relationship === 'string' ? { ours: relationship } : relationship
		})
	};
}

function migrateLanesV1(raw: Record<string, unknown>, key: string): Record<string, unknown> {
	const lanes = raw[key];
	return Array.isArray(lanes) ? { [key]: lanes.map(migrateLaneV1) } : {};
}

/**
 * Ordered raw-JSON migrations: MIGRATIONS[v] rewrites a version-v structure to
 * version v+1.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
	// v1 → v2 (ticket canvas-file-v2): `description` becomes `purpose` —
	// upstream's own v4→v5 rename, adopted with the version bump — and the two
	// lane fields take their v2 shapes (see migrateLaneV1). Free text is never
	// rewritten: a domain role that stopped matching the picker vocabulary
	// survives exactly as typed.
	1: (raw) => {
		const { description, ...rest } = raw;
		return {
			...rest,
			version: 2,
			...(description !== undefined && { purpose: description }),
			...migrateLanesV1(raw, 'inboundCommunication'),
			...migrateLanesV1(raw, 'outboundCommunication')
		};
	}
};

const MESSAGE_TYPES: readonly MessageType[] = ['command', 'query', 'event'];

const COLLABORATOR_KINDS: readonly CollaboratorKind[] = [
	'bounded-context',
	'external-system',
	'frontend',
	'user'
];

/**
 * A refusal at a named field. `path` is written the way a developer would type
 * it to reach the value — `inboundCommunication[1].messages[0].type` — and is
 * empty for a failure about the document as a whole; `expectation` reads
 * "expected …, got …". The two joined are the `detail` line.
 */
class Refusal extends Error {
	constructor(
		readonly path: string,
		readonly expectation: string
	) {
		super(path === '' ? expectation : `${path}: ${expectation}`);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What was there instead, in words: "an array", "nothing", "null". */
function typeName(value: unknown): string {
	if (value === undefined) return 'nothing';
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'an array';
	switch (typeof value) {
		case 'string':
			return 'a string';
		case 'number':
			return 'a number';
		case 'boolean':
			return 'a boolean';
		case 'object':
			return 'an object';
		default:
			return typeof value;
	}
}

function field(path: string, key: string): string {
	return path === '' ? key : `${path}.${key}`;
}

function asString(value: unknown, path: string): string {
	if (typeof value !== 'string') {
		throw new Refusal(path, `expected a string, got ${typeName(value)}`);
	}
	return value;
}

/** Optional fields are either absent or a string — never null (SPEC §3.2). */
function optionalString(
	row: Record<string, unknown>,
	key: string,
	path: string
): { [k: string]: string } {
	const value = row[key];
	if (value === undefined) return {};
	if (typeof value !== 'string') {
		throw new Refusal(
			field(path, key),
			`expected a string or no key at all, got ${typeName(value)}`
		);
	}
	return { [key]: value };
}

function asRows<T>(
	value: unknown,
	path: string,
	row: (item: Record<string, unknown>, path: string) => T
): T[] {
	if (!Array.isArray(value)) throw new Refusal(path, `expected an array, got ${typeName(value)}`);
	return value.map((item, i) => {
		const at = `${path}[${i}]`;
		if (!isRecord(item)) throw new Refusal(at, `expected an object, got ${typeName(item)}`);
		return row(item, at);
	});
}

function asStrings(value: unknown, path: string): string[] {
	if (!Array.isArray(value)) throw new Refusal(path, `expected an array, got ${typeName(value)}`);
	return value.map((item, i) => asString(item, `${path}[${i}]`));
}

function asClassification(value: unknown, path: string): StrategicClassification {
	if (!isRecord(value)) throw new Refusal(path, `expected an object, got ${typeName(value)}`);
	return {
		...optionalString(value, 'domain', path),
		...optionalString(value, 'businessModel', path),
		...optionalString(value, 'evolution', path)
	};
}

function isMessageType(value: string): value is MessageType {
	return (MESSAGE_TYPES as readonly string[]).includes(value);
}

function asMessage(row: Record<string, unknown>, path: string): Message {
	const typePath = field(path, 'type');
	const type = asString(row.type, typePath);
	if (!isMessageType(type)) {
		const allowed = MESSAGE_TYPES.map((t) => JSON.stringify(t)).join(', ');
		throw new Refusal(typePath, `expected one of ${allowed}, got ${JSON.stringify(type)}`);
	}
	return {
		type,
		name: asString(row.name, field(path, 'name')),
		...optionalString(row, 'description', path)
	};
}

function isCollaboratorKind(value: string): value is CollaboratorKind {
	return (COLLABORATOR_KINDS as readonly string[]).includes(value);
}

/**
 * `kind` is closed like message `type` — the value picks an icon — but unlike
 * `type` it is optional, so the refusal offers "no key at all" as a way out.
 */
function asCollaborator(value: unknown, path: string): Collaborator {
	if (!isRecord(value)) throw new Refusal(path, `expected an object, got ${typeName(value)}`);
	const kindPath = field(path, 'kind');
	const kind = value.kind;
	if (kind !== undefined && typeof kind !== 'string') {
		throw new Refusal(kindPath, `expected a string or no key at all, got ${typeName(kind)}`);
	}
	if (typeof kind === 'string' && !isCollaboratorKind(kind)) {
		const allowed = COLLABORATOR_KINDS.map((k) => JSON.stringify(k)).join(', ');
		throw new Refusal(
			kindPath,
			`expected one of ${allowed} or no key at all, got ${JSON.stringify(kind)}`
		);
	}
	return {
		name: asString(value.name, field(path, 'name')),
		...(kind !== undefined && { kind })
	};
}

/** Both ends optional, both lax about vocabulary — like the classification axes. */
function asRelationship(value: unknown, path: string): { relationship?: Relationship } {
	if (value === undefined) return {};
	if (!isRecord(value)) {
		throw new Refusal(path, `expected an object or no key at all, got ${typeName(value)}`);
	}
	return {
		relationship: {
			...optionalString(value, 'theirs', path),
			...optionalString(value, 'ours', path)
		}
	};
}

function asLane(row: Record<string, unknown>, path: string): Lane {
	return {
		collaborator: asCollaborator(row.collaborator, field(path, 'collaborator')),
		...asRelationship(row.relationship, field(path, 'relationship')),
		messages: asRows(row.messages, field(path, 'messages'), asMessage)
	};
}

function asCanvasFile(raw: Record<string, unknown>): CanvasFile {
	return {
		version: CANVAS_VERSION,
		name: asString(raw.name, 'name'),
		purpose: asString(raw.purpose, 'purpose'),
		strategicClassification: asClassification(
			raw.strategicClassification,
			'strategicClassification'
		),
		domainRoles: asRows(raw.domainRoles, 'domainRoles', (row, path): DomainRole => ({
			name: asString(row.name, field(path, 'name'))
		})),
		inboundCommunication: asRows(raw.inboundCommunication, 'inboundCommunication', asLane),
		ubiquitousLanguage: asRows(
			raw.ubiquitousLanguage,
			'ubiquitousLanguage',
			(row, path): UbiquitousTerm => ({
				term: asString(row.term, field(path, 'term')),
				...optionalString(row, 'definition', path)
			})
		),
		businessDecisions: asRows(
			raw.businessDecisions,
			'businessDecisions',
			(row, path): BusinessDecision => ({
				name: asString(row.name, field(path, 'name')),
				...optionalString(row, 'description', path)
			})
		),
		outboundCommunication: asRows(raw.outboundCommunication, 'outboundCommunication', asLane),
		assumptions: asStrings(raw.assumptions, 'assumptions'),
		verificationMetrics: asStrings(raw.verificationMetrics, 'verificationMetrics'),
		openQuestions: asStrings(raw.openQuestions, 'openQuestions')
	};
}

export function parseCanvasFile(text: string): ParseResult {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch (error) {
		return notCanvas(`${NOT_JSON} (${error instanceof Error ? error.message : String(error)})`);
	}
	if (!isRecord(raw)) {
		return notCanvas(`expected a JSON object at the top level, got ${typeName(raw)}`);
	}

	const version = raw.version;
	if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
		const got = typeof version === 'number' ? String(version) : typeName(version);
		return notCanvas(`version: expected an integer of 1 or more, got ${got}`);
	}
	if (version > CANVAS_VERSION) return { ok: false, reason: 'newer-version', version };

	let migrated = raw;
	for (let v = version; v < CANVAS_VERSION; v++) {
		const migrate = MIGRATIONS[v];
		// A gap here is a programming error (CANVAS_VERSION bumped without its
		// migration), not a property of the file — fail loud, don't refuse.
		if (!migrate) throw new Error(`No migration from Canvas file version ${v} to ${v + 1}`);
		migrated = migrate(migrated);
	}

	try {
		return { ok: true, file: asCanvasFile(migrated) };
	} catch (error) {
		if (error instanceof Refusal) return notCanvas(error.message);
		throw error;
	}
}

const NEITHER_FORM =
	'expected a Canvas file (JSON) or an HTML artifact carrying an embedded Canvas file; this text is neither';

/**
 * The one import path for both importable forms (SPEC §9.1): the text is
 * tried as a Canvas file first — so a foreign-serialized `.bcc.json` whose
 * prose happens to contain the embed marker still imports as itself (§3.2:
 * unknown values round-trip) — and only a text that isn't one yields its
 * embedded block, a `.bcc.html` artifact's case. The same version check,
 * migrations and refusals apply on either route; an HTML file without a
 * readable block stays refused as not a Canvas file.
 */
export function parseCanvasImport(text: string): ParseResult {
	const direct = parseCanvasFile(text);
	if (direct.ok || direct.reason === 'newer-version') return direct;
	const embedded = extractEmbeddedCanvas(text);
	if (embedded !== null) return parseCanvasFile(embedded);
	// A text that is not JSON at all has now failed both doors, and saying only
	// "expected valid JSON" misdiagnoses the HTML file it most often is.
	return direct.detail?.startsWith(NOT_JSON) ? notCanvas(NEITHER_FORM) : direct;
}
