/**
 * Canvas-file parser/validator (SPEC §3.3): integer version check, ordered
 * raw-JSON migrations, then strict shape validation. Files from a newer format
 * version are refused before anything else looks at them; anything that can't
 * be read as the eleven-section shape is refused as not a Canvas file. The
 * validated result is rebuilt key by key, so unknown extras never ride along.
 */

import { extractEmbeddedCanvas } from '$lib/model/embed';
import {
	CANVAS_VERSION,
	type BusinessDecision,
	type CanvasFile,
	type DomainRole,
	type Lane,
	type Message,
	type MessageType,
	type StrategicClassification,
	type UbiquitousTerm
} from '$lib/model/canvas';

export type ParseResult =
	| { ok: true; file: CanvasFile }
	| { ok: false; reason: 'newer-version'; version: number }
	| { ok: false; reason: 'not-canvas' };

const NOT_CANVAS = { ok: false, reason: 'not-canvas' } as const;

/**
 * Ordered raw-JSON migrations: MIGRATIONS[v] rewrites a version-v structure to
 * version v+1. Empty while the format is at version 1.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

const MESSAGE_TYPES: readonly MessageType[] = ['command', 'query', 'event'];

class Refusal extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
	if (typeof value !== 'string') throw new Refusal();
	return value;
}

/** Optional fields are either absent or a string — never null (SPEC §3.2). */
function optionalString(row: Record<string, unknown>, key: string): { [k: string]: string } {
	const value = row[key];
	if (value === undefined) return {};
	return { [key]: asString(value) };
}

function asRows<T>(value: unknown, row: (item: Record<string, unknown>) => T): T[] {
	if (!Array.isArray(value)) throw new Refusal();
	return value.map((item) => {
		if (!isRecord(item)) throw new Refusal();
		return row(item);
	});
}

function asStrings(value: unknown): string[] {
	if (!Array.isArray(value)) throw new Refusal();
	return value.map(asString);
}

function asClassification(value: unknown): StrategicClassification {
	if (!isRecord(value)) throw new Refusal();
	return {
		...optionalString(value, 'domain'),
		...optionalString(value, 'businessModel'),
		...optionalString(value, 'evolution')
	};
}

function isMessageType(value: string): value is MessageType {
	return (MESSAGE_TYPES as readonly string[]).includes(value);
}

function asMessage(row: Record<string, unknown>): Message {
	const type = asString(row.type);
	if (!isMessageType(type)) throw new Refusal();
	return { type, name: asString(row.name), ...optionalString(row, 'description') };
}

function asLane(row: Record<string, unknown>): Lane {
	return {
		collaborator: asString(row.collaborator),
		...optionalString(row, 'relationship'),
		messages: asRows(row.messages, asMessage)
	};
}

function asCanvasFile(raw: Record<string, unknown>): CanvasFile {
	return {
		version: CANVAS_VERSION,
		name: asString(raw.name),
		description: asString(raw.description),
		strategicClassification: asClassification(raw.strategicClassification),
		domainRoles: asRows(raw.domainRoles, (row): DomainRole => ({ name: asString(row.name) })),
		inboundCommunication: asRows(raw.inboundCommunication, asLane),
		ubiquitousLanguage: asRows(
			raw.ubiquitousLanguage,
			(row): UbiquitousTerm => ({ term: asString(row.term), ...optionalString(row, 'definition') })
		),
		businessDecisions: asRows(
			raw.businessDecisions,
			(row): BusinessDecision => ({ name: asString(row.name), ...optionalString(row, 'description') })
		),
		outboundCommunication: asRows(raw.outboundCommunication, asLane),
		assumptions: asStrings(raw.assumptions),
		verificationMetrics: asStrings(raw.verificationMetrics),
		openQuestions: asStrings(raw.openQuestions)
	};
}

export function parseCanvasFile(text: string): ParseResult {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return NOT_CANVAS;
	}
	if (!isRecord(raw)) return NOT_CANVAS;

	const version = raw.version;
	if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
		return NOT_CANVAS;
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
		if (error instanceof Refusal) return NOT_CANVAS;
		throw error;
	}
}

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
	return embedded === null ? direct : parseCanvasFile(embedded);
}
