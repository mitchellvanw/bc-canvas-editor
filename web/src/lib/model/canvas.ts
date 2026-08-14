/**
 * The Canvas file shape (SPEC §3) and the runtime document derived from it
 * (SPEC §6.1): the same eleven sections, with an ephemeral `id` stamped on
 * every row, lane and message for keyed rendering. Ids never reach the file.
 */

export type MessageType = 'command' | 'query' | 'event';

/**
 * Closed like `MessageType`, and for the same reason: the value drives a
 * rendering. `type` picks a chip color, `kind` picks a collaborator icon, and
 * an unrecognised kind has no glyph to draw (SPEC §3.2).
 */
export type CollaboratorKind = 'bounded-context' | 'external-system' | 'frontend' | 'user';

export interface Message {
	type: MessageType;
	name: string;
	description?: string;
}

export interface Collaborator {
	name: string;
	kind?: CollaboratorKind;
}

/**
 * The two ends of the lane's boundary, both optional free text: the
 * collaborator's side and this context's. `theirs` serializes first — the
 * order the sheet draws them, collaborator's side leading (SPEC §3.2).
 */
export interface Relationship {
	theirs?: string;
	ours?: string;
}

export interface Lane {
	collaborator: Collaborator;
	relationship?: Relationship;
	messages: Message[];
}

export interface DomainRole {
	name: string;
}

export interface UbiquitousTerm {
	term: string;
	definition?: string;
}

export interface BusinessDecision {
	name: string;
	description?: string;
}

export interface StrategicClassification {
	domain?: string;
	businessModel?: string;
	evolution?: string;
}

export const CANVAS_VERSION = 2;

export interface CanvasFile {
	version: typeof CANVAS_VERSION;
	name: string;
	purpose: string;
	strategicClassification: StrategicClassification;
	domainRoles: DomainRole[];
	inboundCommunication: Lane[];
	ubiquitousLanguage: UbiquitousTerm[];
	businessDecisions: BusinessDecision[];
	outboundCommunication: Lane[];
	assumptions: string[];
	verificationMetrics: string[];
	openQuestions: string[];
}

type WithId<T> = T & { id: string };

export type MessageRow = WithId<Message>;

export interface LaneRow {
	id: string;
	collaborator: Collaborator;
	relationship?: Relationship;
	messages: MessageRow[];
}

export interface CanvasDoc {
	version: typeof CANVAS_VERSION;
	name: string;
	purpose: string;
	strategicClassification: StrategicClassification;
	domainRoles: WithId<DomainRole>[];
	inboundCommunication: LaneRow[];
	ubiquitousLanguage: WithId<UbiquitousTerm>[];
	businessDecisions: WithId<BusinessDecision>[];
	outboundCommunication: LaneRow[];
	assumptions: string[];
	verificationMetrics: string[];
	openQuestions: string[];
}

export function newId(): string {
	return crypto.randomUUID();
}

/**
 * Reorder in place: the one mutation behind chip/lane drag (SPEC §6) and the
 * Alt+arrow keyboard moves (SPEC §8.2). `to` is the index in the final list.
 */
export function moveItem<T>(list: T[], from: number, to: number): void {
	if (from === to) return;
	const [item] = list.splice(from, 1);
	list.splice(to, 0, item);
}

export function blankCanvas(): CanvasDoc {
	return {
		version: CANVAS_VERSION,
		name: '',
		purpose: '',
		strategicClassification: {},
		domainRoles: [],
		inboundCommunication: [],
		ubiquitousLanguage: [],
		businessDecisions: [],
		outboundCommunication: [],
		assumptions: [],
		verificationMetrics: [],
		openQuestions: []
	};
}

function stampLane(lane: Lane): LaneRow {
	return {
		id: newId(),
		collaborator: { ...lane.collaborator },
		...(lane.relationship !== undefined && { relationship: { ...lane.relationship } }),
		messages: lane.messages.map((message) => ({ ...message, id: newId() }))
	};
}

export function stampIds(file: CanvasFile): CanvasDoc {
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
