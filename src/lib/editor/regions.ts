/**
 * The sheet's regions for undo/redo reveal (SPEC §6.1): a commit touches
 * exactly one region of the CanvasSheet, so diffing two snapshots names the
 * panel to scroll into view and flash. The title block carries only the name;
 * every other region is one panel — the two centre-box sections answer to
 * their panel classes, since the box holds the grid area.
 */

import type { CanvasDoc } from '$lib/model/canvas';

interface RegionSpec {
	/** Where the region lives in the rendered sheet. */
	selector: string;
	/** The section name spoken by `Undone:`/`Redone:` announcements (SPEC §10). */
	name: string;
	/** The document slice the region renders — what a diff compares. */
	content: (doc: CanvasDoc) => unknown;
}

const REGIONS = {
	title: {
		selector: '.quiet-sheet .tb',
		name: 'Title block',
		content: (doc) => doc.name
	},
	purpose: {
		selector: '.quiet-sheet .area-purpose',
		name: 'Purpose',
		content: (doc) => doc.purpose
	},
	classification: {
		selector: '.quiet-sheet .area-classification',
		name: 'Strategic classification',
		content: (doc) => doc.strategicClassification
	},
	roles: {
		selector: '.quiet-sheet .area-roles',
		name: 'Domain roles',
		content: (doc) => doc.domainRoles
	},
	inbound: {
		selector: '.quiet-sheet .area-inbound',
		name: 'Inbound communication',
		content: (doc) => doc.inboundCommunication
	},
	language: {
		selector: '.quiet-sheet .panel--lang',
		name: 'Ubiquitous language',
		content: (doc) => doc.ubiquitousLanguage
	},
	decisions: {
		selector: '.quiet-sheet .panel--decisions',
		name: 'Business decisions',
		content: (doc) => doc.businessDecisions
	},
	outbound: {
		selector: '.quiet-sheet .area-outbound',
		name: 'Outbound communication',
		content: (doc) => doc.outboundCommunication
	},
	assumptions: {
		selector: '.quiet-sheet .area-assumptions',
		name: 'Assumptions',
		content: (doc) => doc.assumptions
	},
	metrics: {
		selector: '.quiet-sheet .area-metrics',
		name: 'Verification metrics',
		content: (doc) => doc.verificationMetrics
	},
	questions: {
		selector: '.quiet-sheet .area-questions',
		name: 'Open questions',
		content: (doc) => doc.openQuestions
	}
} satisfies Record<string, RegionSpec>;

export type Region = keyof typeof REGIONS;

export function regionSelector(region: Region): string {
	return REGIONS[region].selector;
}

/** The section name a region answers to in announcements (SPEC §10). */
export function regionName(region: Region): string {
	return REGIONS[region].name;
}

/** The one region two snapshots differ in — null when they're identical. */
export function changedRegion(before: CanvasDoc, after: CanvasDoc): Region | null {
	for (const region of Object.keys(REGIONS) as Region[]) {
		const { content } = REGIONS[region];
		if (JSON.stringify(content(before)) !== JSON.stringify(content(after))) return region;
	}
	return null;
}
