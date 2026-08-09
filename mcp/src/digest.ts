/**
 * The digest: what the sheet says, in words.
 *
 * A model reading a canvas to understand it should not pay for JSON's braces
 * and repeated keys, and it should not be handed the sheet's glyphs either.
 * `▶ ◆ ?` mean something to an eye scanning colour; the app already decided
 * what its non-visual channel says instead — accessible names lead with the
 * type ("Command, Place Order", SPEC §8.5) and the footer legend spells the
 * three out in words. This is that channel, written down: the digest is the
 * model's screen-reader view of the sheet.
 *
 * Headings mirror the HTML artifact's hierarchy (SPEC §8.6): the canvas name
 * is the h1, sections are h2s, collaborators h3s. Sections the canvas says
 * nothing in are named once at the end rather than printed as empty headings —
 * a mostly-blank canvas is common while drafting, and eleven empty headings
 * would cost more than the one line that carries the same fact.
 */

import type { CanvasFile, Lane, Message } from '$lib/model/canvas';
import { SECTIONS, type Section } from './sections';

/** The classification line: only the axes that have been picked. */
function classification(file: CanvasFile): string[] {
	const { domain, businessModel, evolution } = file.strategicClassification;
	const picked = [
		['Domain', domain],
		['Business model', businessModel],
		['Evolution', evolution]
	].filter(([, value]) => value !== undefined && value !== '');
	if (picked.length === 0) return [];
	return [picked.map(([label, value]) => `${label}: ${value}`).join(' · ')];
}

/** `command Place Order — Requests fulfillment of a paid order.` */
function message(row: Message): string {
	const detail =
		row.description === undefined || row.description === '' ? '' : ` — ${row.description}`;
	return `${row.type} ${row.name}${detail}`;
}

function lanes(rows: Lane[]): string[] {
	return rows.flatMap((lane, index) => {
		const relationship =
			lane.relationship === undefined || lane.relationship === '' ? '' : ` (${lane.relationship})`;
		const head = `### ${lane.collaborator}${relationship}`;
		const messages = lane.messages.length === 0 ? [] : ['', ...lane.messages.map(message)];
		return index === 0 ? [head, ...messages] : ['', head, ...messages];
	});
}

/** A `term — definition` pair, or just the term where none was written. */
function pair(head: string, detail: string | undefined): string {
	return detail === undefined || detail === '' ? head : `${head} — ${detail}`;
}

function body(section: Section, file: CanvasFile): string[] {
	switch (section.key) {
		case 'name':
		case 'strategicClassification':
			// Both live in the title block, above the sections; see `canvasDigest`.
			return [];
		case 'description':
			return [file.description];
		case 'domainRoles':
			return [file.domainRoles.map((role) => role.name).join(', ')];
		case 'inboundCommunication':
			return lanes(file.inboundCommunication);
		case 'outboundCommunication':
			return lanes(file.outboundCommunication);
		case 'ubiquitousLanguage':
			return file.ubiquitousLanguage.map((row) => pair(row.term, row.definition));
		case 'businessDecisions':
			return file.businessDecisions.map((row) => pair(row.name, row.description));
		case 'assumptions':
			return file.assumptions;
		case 'verificationMetrics':
			return file.verificationMetrics;
		case 'openQuestions':
			return file.openQuestions;
	}
}

/**
 * The whole canvas as prose. Unnamed canvases read `Untitled`, matching the
 * title bar (SPEC §10) rather than opening with a blank heading.
 */
export function canvasDigest(file: CanvasFile): string {
	const lines: string[] = [`# ${file.name.trim() === '' ? 'Untitled' : file.name}`];

	const axes = classification(file);
	if (axes.length > 0) lines.push('', ...axes);

	const missing: string[] = [];
	for (const section of SECTIONS) {
		if (!section.filled(file)) {
			missing.push(section.label);
			continue;
		}
		// The title block is already printed; it has no heading of its own.
		if (section.key === 'name' || section.key === 'strategicClassification') continue;
		lines.push('', `## ${section.label}`, '', ...body(section, file));
	}

	if (missing.length > 0) lines.push('', `Nothing yet under: ${missing.join(', ')}.`);

	return `${lines.join('\n')}\n`;
}
