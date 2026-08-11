/**
 * Deterministic Canvas-file serialization (SPEC §3.2): ids stripped, fixed key
 * order, 2-space indent, optional fields omitted entirely when unset or empty.
 * An unchanged canvas serializes byte-identically. `<` is written as its JSON
 * unicode escape — it only ever occurs inside string values — so the HTML
 * artifact can embed these exact bytes in a script block (SPEC §9.1) without
 * `</script>` in user text ever terminating it.
 */

import type {
	BusinessDecision,
	CanvasDoc,
	CanvasFile,
	Collaborator,
	Lane,
	Message,
	DomainRole,
	Relationship,
	StrategicClassification,
	UbiquitousTerm
} from '$lib/model/canvas';

function present(value: string | undefined): value is string {
	return value !== undefined && value !== '';
}

function fileMessage(message: Message): Message {
	return {
		type: message.type,
		name: message.name,
		...(present(message.description) && { description: message.description })
	};
}

function fileCollaborator(collaborator: Collaborator): Collaborator {
	return {
		name: collaborator.name,
		...(collaborator.kind !== undefined && { kind: collaborator.kind })
	};
}

/**
 * `theirs` before `ours` — the fixed key order doubles as teaching: a reader
 * of the raw JSON meets the two ends in the order the sheet draws them,
 * collaborator's side first. A relationship with neither end is omitted whole.
 */
function fileRelationship(relationship: Relationship | undefined): { relationship?: Relationship } {
	if (relationship === undefined) return {};
	const kept = {
		...(present(relationship.theirs) && { theirs: relationship.theirs }),
		...(present(relationship.ours) && { ours: relationship.ours })
	};
	return Object.keys(kept).length === 0 ? {} : { relationship: kept };
}

function fileLane(lane: Lane): Lane {
	return {
		collaborator: fileCollaborator(lane.collaborator),
		...fileRelationship(lane.relationship),
		messages: lane.messages.map(fileMessage)
	};
}

function fileClassification(sc: StrategicClassification): StrategicClassification {
	return {
		...(present(sc.domain) && { domain: sc.domain }),
		...(present(sc.businessModel) && { businessModel: sc.businessModel }),
		...(present(sc.evolution) && { evolution: sc.evolution })
	};
}

/**
 * Rebuild in canonical shape: fixed key order, ids dropped, empty optionals
 * omitted. Takes a `CanvasFile` because a `CanvasDoc` already is one
 * structurally — its rows just carry an extra `id` — so both the editor's
 * runtime document and a file straight off the parser normalize through the
 * same walk, and there is only ever one key order in the codebase.
 */
export function toCanvasFile(doc: CanvasFile): CanvasFile {
	return {
		version: doc.version,
		name: doc.name,
		purpose: doc.purpose,
		strategicClassification: fileClassification(doc.strategicClassification),
		domainRoles: doc.domainRoles.map((role): DomainRole => ({ name: role.name })),
		inboundCommunication: doc.inboundCommunication.map(fileLane),
		ubiquitousLanguage: doc.ubiquitousLanguage.map(
			(row): UbiquitousTerm => ({
				term: row.term,
				...(present(row.definition) && { definition: row.definition })
			})
		),
		businessDecisions: doc.businessDecisions.map(
			(row): BusinessDecision => ({
				name: row.name,
				...(present(row.description) && { description: row.description })
			})
		),
		outboundCommunication: doc.outboundCommunication.map(fileLane),
		assumptions: [...doc.assumptions],
		verificationMetrics: [...doc.verificationMetrics],
		openQuestions: [...doc.openQuestions]
	};
}

/**
 * The bytes, from a Canvas file. The MCP server holds one of these — it writes
 * what `parseCanvasFile` handed back, never a runtime document — so it needs
 * the same canonical output the editor exports, one step further in.
 */
export function serializeCanvasFile(file: CanvasFile): string {
	return JSON.stringify(toCanvasFile(file), null, 2).replaceAll('<', '\\u003c');
}

export function serializeCanvas(doc: CanvasDoc): string {
	return serializeCanvasFile(doc);
}
