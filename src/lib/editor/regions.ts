/**
 * The sheet's regions for undo/redo reveal (SPEC §6.1): a commit touches
 * exactly one region of the CanvasSheet, so diffing two snapshots names the
 * panel to scroll into view and flash. The title block carries both the name
 * and the strategic classification; every other region is one grid panel.
 */

import type { CanvasDoc } from '$lib/model/canvas';

interface RegionSpec {
	/** Where the region lives in the rendered sheet. */
	selector: string;
	/** The document slice the region renders — what a diff compares. */
	content: (doc: CanvasDoc) => unknown;
}

const REGIONS = {
	title: {
		selector: '.quiet-sheet .tb',
		content: (doc) => [doc.name, doc.strategicClassification]
	},
	description: { selector: '.quiet-sheet .area-description', content: (doc) => doc.description },
	roles: { selector: '.quiet-sheet .area-roles', content: (doc) => doc.domainRoles },
	inbound: { selector: '.quiet-sheet .area-inbound', content: (doc) => doc.inboundCommunication },
	language: { selector: '.quiet-sheet .area-language', content: (doc) => doc.ubiquitousLanguage },
	decisions: { selector: '.quiet-sheet .area-decisions', content: (doc) => doc.businessDecisions },
	outbound: { selector: '.quiet-sheet .area-outbound', content: (doc) => doc.outboundCommunication },
	assumptions: { selector: '.quiet-sheet .area-assumptions', content: (doc) => doc.assumptions },
	metrics: { selector: '.quiet-sheet .area-metrics', content: (doc) => doc.verificationMetrics },
	questions: { selector: '.quiet-sheet .area-questions', content: (doc) => doc.openQuestions }
} satisfies Record<string, RegionSpec>;

export type Region = keyof typeof REGIONS;

export function regionSelector(region: Region): string {
	return REGIONS[region].selector;
}

/** The one region two snapshots differ in — null when they're identical. */
export function changedRegion(before: CanvasDoc, after: CanvasDoc): Region | null {
	for (const region of Object.keys(REGIONS) as Region[]) {
		const { content } = REGIONS[region];
		if (JSON.stringify(content(before)) !== JSON.stringify(content(after))) return region;
	}
	return null;
}
