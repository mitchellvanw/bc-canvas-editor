/**
 * Values outside the curated vocabularies — noticed, never refused.
 *
 * SPEC §4 promises the editor accepts any string where it offers a picker: the
 * escape hatch is part of the format, and a canvas that says "strangler-fig" is
 * a canvas, not an error. A server that refused one would be stricter than the
 * editor whose files it writes, and would produce documents the app can open
 * and the server cannot.
 *
 * So off-vocabulary values come back as notes on a successful write. The
 * phrasing matters and is the whole design of this module: it reports what is
 * there and names the alternative, and it never suggests the model got it
 * wrong — because half the time it didn't.
 */

import { PICK_OPTIONS, TRAITS, type PickOption } from '$lib/editor/vocab';
import type { CanvasFile, Lane } from '$lib/model/canvas';

function known(options: readonly PickOption[], value: string): boolean {
	return options.some((option) => option.value === value);
}

function note(value: string, what: string, options: readonly PickOption[]): string {
	const curated = options.map((option) => option.value).join(', ');
	return `"${value}" is a custom ${what}, kept as written. The curated ones are: ${curated}.`;
}

function axisNotes(file: CanvasFile): string[] {
	const { domain, businessModel, evolution } = file.strategicClassification;
	const axes: [string | undefined, string, readonly PickOption[]][] = [
		[domain, 'domain', PICK_OPTIONS.domain],
		[businessModel, 'business model', PICK_OPTIONS.businessModel],
		[evolution, 'evolution stage', PICK_OPTIONS.evolution]
	];
	return axes
		.filter(([value, , options]) => value !== undefined && value !== '' && !known(options, value))
		.map(([value, what, options]) => note(value as string, what, options));
}

function relationshipNotes(lanes: Lane[]): string[] {
	return lanes
		.map((lane) => lane.relationship)
		.filter(
			(value): value is string =>
				value !== undefined && value !== '' && !known(PICK_OPTIONS.relationship, value)
		)
		.map((value) => note(value, 'relationship pattern', PICK_OPTIONS.relationship));
}

/**
 * Every custom value in the canvas, in sheet order, each mentioned once —
 * three lanes sharing one house pattern is one note, not three.
 */
export function customValueNotes(file: CanvasFile): string[] {
	const notes = [
		...axisNotes(file),
		...file.domainRoles
			.filter((role) => role.name !== '' && !known(TRAITS, role.name))
			.map((role) => note(role.name, 'domain-role trait', TRAITS)),
		...relationshipNotes(file.inboundCommunication),
		...relationshipNotes(file.outboundCommunication)
	];
	return [...new Set(notes)];
}
