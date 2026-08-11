/**
 * The eleven sections, once.
 *
 * Every model-facing surface in this server walks the same table: the digest
 * renders it in order, `bcc_list_canvases` reports which entries came out
 * empty, `bcc_write_canvas` names the same emptiness back, and `bcc_explain`
 * takes its topics from the keys. One table means those four can never
 * disagree about what a section is called or when it counts as filled.
 *
 * Labels are the sheet's own headings (`CanvasSheet.svelte`) and questions are
 * the SPEC §10 placeholder strings — the ones already signed off — carried
 * verbatim, so the server and the sheet teach in one voice. The ghost strings
 * lead with the affordance they label ("+ trait — "); `question()` drops that
 * prefix mechanically rather than restating the words.
 */

import type { CanvasFile } from '$lib/model/canvas';

export type SectionKey = keyof Omit<CanvasFile, 'version'>;

export interface Section {
	key: SectionKey;
	/** The sheet's heading for this section. */
	label: string;
	/** The SPEC §10 placeholder, verbatim, where the section has one. */
	placeholder?: string;
	/** Whether the canvas says anything here at all. */
	filled(file: CanvasFile): boolean;
}

function nonEmpty(value: string | undefined): boolean {
	return value !== undefined && value.trim() !== '';
}

export const SECTIONS: readonly Section[] = [
	{
		key: 'name',
		label: 'Name',
		placeholder: 'Name this context',
		filled: (file) => nonEmpty(file.name)
	},
	{
		key: 'purpose',
		label: 'Purpose',
		placeholder: 'What does this context exist to do? A few sentences in business language.',
		filled: (file) => nonEmpty(file.purpose)
	},
	{
		key: 'strategicClassification',
		label: 'Strategic classification',
		// No placeholder in SPEC §10: the axes render an em dash until picked,
		// and their teaching lives in the picker — the vocabularies themselves.
		filled: (file) =>
			nonEmpty(file.strategicClassification.domain) ||
			nonEmpty(file.strategicClassification.businessModel) ||
			nonEmpty(file.strategicClassification.evolution)
	},
	{
		key: 'domainRoles',
		label: 'Domain roles',
		placeholder: '+ trait — how does this context behave?',
		filled: (file) => file.domainRoles.length > 0
	},
	{
		key: 'inboundCommunication',
		label: 'Inbound communication',
		placeholder: '+ collaborator — who sends this context commands, queries or events?',
		filled: (file) => file.inboundCommunication.length > 0
	},
	{
		key: 'ubiquitousLanguage',
		label: 'Ubiquitous language',
		placeholder: '+ term — which words mean something precise here?',
		filled: (file) => file.ubiquitousLanguage.length > 0
	},
	{
		key: 'businessDecisions',
		label: 'Business decisions',
		placeholder: '+ decision — which rules does this context enforce?',
		filled: (file) => file.businessDecisions.length > 0
	},
	{
		key: 'outboundCommunication',
		label: 'Outbound communication',
		placeholder: '+ collaborator — who consumes what this context emits?',
		filled: (file) => file.outboundCommunication.length > 0
	},
	{
		key: 'assumptions',
		label: 'Assumptions',
		placeholder: '+ assumption — what are you taking to be true?',
		filled: (file) => file.assumptions.length > 0
	},
	{
		key: 'verificationMetrics',
		label: 'Verification metrics',
		placeholder: '+ metric — what would verify this design?',
		filled: (file) => file.verificationMetrics.length > 0
	},
	{
		key: 'openQuestions',
		label: 'Open questions',
		placeholder: "+ question — what's still unresolved?",
		filled: (file) => file.openQuestions.length > 0
	}
];

/**
 * The section's question, the way a person would ask it: the §10 placeholder
 * with its ghost-add prefix removed, since "+ trait" names a button rather
 * than anything the model can act on. Undefined where §10 sets no question.
 */
export function question(section: Section): string | undefined {
	const placeholder = section.placeholder;
	if (placeholder === undefined) return undefined;
	const dash = placeholder.indexOf(' — ');
	return placeholder.startsWith('+ ') && dash >= 0 ? placeholder.slice(dash + 3) : placeholder;
}

export function sectionByKey(key: SectionKey): Section {
	const section = SECTIONS.find((candidate) => candidate.key === key);
	// The key type is derived from this same table, so a miss is impossible
	// unless the table itself has been edited into an inconsistent state.
	if (!section) throw new Error(`no such section: ${key}`);
	return section;
}

/** The labels of the sections a canvas says nothing in, in sheet order. */
export function emptySections(file: CanvasFile): string[] {
	return SECTIONS.filter((section) => !section.filled(file)).map((section) => section.label);
}

/** How many of the eleven the canvas fills. */
export function filledCount(file: CanvasFile): number {
	return SECTIONS.filter((section) => section.filled(file)).length;
}
