/**
 * The structural seams between the shared read-only sheet and the editor
 * (SPEC §6), the counterpart of TextSlot for growing and shrinking the canvas:
 * CanvasSheet describes each structural location — a removable item, a ghost
 * add, a lane's message ghost — and offers it to optional snippets. Without
 * them the sheet renders pure content, the artifact path (SPEC §9); with them
 * the editor renders ×s, ghost adds and the type popover in place. Like
 * TextSlot's `set`, the mutations here only touch the document — the editor
 * wraps each one in a commit.
 */

import type { MessageType } from '$lib/model/canvas';

/** A removable item: chip, row, sticky, or a whole lane with its messages. */
export interface RemoveSlot {
	/** Accessible name, type-led (SPEC §8.5): "Remove command Place Order". */
	label: string;
	/**
	 * The item's type name, capitalized — "Collaborator", "Command", "Trait" —
	 * for the type-led live-region announcement "<Type> removed" (SPEC §10).
	 */
	type: string;
	/** Remove the item from the document. */
	remove(): void;
}

/** A section's ghost add (SPEC §6): one click appends a blank item. */
export interface AddSlot {
	/** The ghost's visible label; terse once a section has content (SPEC §7). */
	label: string;
	/**
	 * The section is empty, so the label is its teaching question and the ghost
	 * stays visible instead of materializing on approach (SPEC §7).
	 */
	teaching: boolean;
	/** The aria-label of the new item's first field, for the editor to focus. */
	focusField: string;
	/** Append the blank item to the document. */
	add(): void;
}

/** A lane's message ghost: the type popover picks before the chip exists. */
export interface MessageAddSlot {
	/** Keys the popover open-state to its lane. */
	laneId: string;
	/** Append a blank message of the picked type to the lane. */
	add(type: MessageType): void;
}
