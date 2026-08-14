/**
 * The picker seams between the shared read-only sheet and the editor
 * (SPEC §6, ticket 07), the counterpart of TextSlot for the curated
 * vocabularies: CanvasSheet describes each picker-backed location — a
 * classification axis, a lane's relationship, the domain-role trait set — and
 * offers it to optional snippets. Without them the sheet renders the plain
 * value ('—' where unset), the artifact path (SPEC §9); with them the editor
 * renders the value as a button and hangs its popover off it. Like TextSlot's
 * `set`, the mutations here only touch the document — the editor wraps each
 * one in a commit.
 */

import type { StrategicClassification } from '$lib/model/canvas';

/**
 * Which curated vocabulary (SPEC §4) a pick-one location draws from. Both ends
 * of a lane's relationship share `relationship` — one boundary, one vocabulary;
 * `collaboratorKind` is the one closed set (no custom…, SPEC §3.2).
 */
export type PickKind = keyof StrategicClassification | 'relationship' | 'collaboratorKind';

/** A pick-one location: a classification axis, a lane's kind or relationship end. */
export interface PickSlot {
	kind: PickKind;
	/** Keys the popover open-state to this location (axis name, or lane id + side). */
	key: string;
	/** Accessible name of the value button — the location's identity (SPEC §8.5). */
	label: string;
	/** The committed value; undefined is unset and renders '—'. */
	value: string | undefined;
	/** Write a pick; undefined clears the field back to unset (SPEC §4.1). */
	set(value: string | undefined): void;
}

/** The domain-role trait set: one multi-select location per canvas (SPEC §6). */
export interface TraitSlot {
	/** The ghost's visible label; terse once a trait is chosen (SPEC §7). */
	label: string;
	/**
	 * No traits yet, so the label is the teaching question and the ghost stays
	 * visible instead of materializing on approach (SPEC §7).
	 */
	teaching: boolean;
	/** The trait names currently on the canvas, in chip order. */
	selected: string[];
	/** Add the trait if absent, remove it if present — one toggle, one commit. */
	toggle(name: string): void;
}
