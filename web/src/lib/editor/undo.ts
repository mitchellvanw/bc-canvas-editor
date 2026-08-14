/**
 * App-level undo/redo (SPEC §6.1): perform the history swap, then reveal the
 * affected region — scroll it into view with a brief highlight flash, never
 * moving focus. Scroll and flash both go instant under prefers-reduced-motion
 * (SPEC §8.4). The global ⌘Z/⇧⌘Z interception lives here too, so native
 * contenteditable undo is never in play; a field with uncommitted edits
 * consumes ⌘Z before it bubbles this far (editable.ts).
 */

import { tick } from 'svelte';
import { announce } from '$lib/a11y/announce';
import { canvas } from './document.svelte';
import { regionName, regionSelector, type Region } from './regions';

/** How long the affected region stays highlighted. */
const FLASH_MS = 850;

/** The flash class the editor styles; applied to the affected region. */
export const FLASH_CLASS = 'undo-flash';

let flashing: { el: HTMLElement; timer: ReturnType<typeof setTimeout> } | null = null;

export async function performUndo(): Promise<void> {
	const region = canvas.undo();
	// Undo reveals without moving focus (below), so the live region carries
	// the effect to screen readers: "Undone: <section name>" (SPEC §10).
	if (region) announce(`Undone: ${regionName(region)}`);
	await reveal(region);
}

export async function performRedo(): Promise<void> {
	const region = canvas.redo();
	if (region) announce(`Redone: ${regionName(region)}`);
	await reveal(region);
}

/**
 * Classify a keydown against the ⌘Z/⇧⌘Z (or Ctrl) grammar — the single
 * definition of the shortcut, shared by the global handler and the
 * field-level Esc synonym (editable.ts).
 */
export function undoShortcut(event: KeyboardEvent): 'undo' | 'redo' | null {
	if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'z') {
		return null;
	}
	return event.shiftKey ? 'redo' : 'undo';
}

/**
 * The global interception: always consumed, so the browser's own undo never
 * fires on the sheet. Modal dialogs (the import/new confirmations) and the
 * pickers' transient custom inputs keep their keyboard to themselves — a
 * real <input> keeps its native text undo.
 */
export function handleUndoShortcut(event: KeyboardEvent): void {
	const action = undoShortcut(event);
	if (!action) return;
	if (event.target instanceof Element && event.target.closest('dialog, input, textarea')) return;
	event.preventDefault();
	if (action === 'redo') void performRedo();
	else void performUndo();
}

async function reveal(region: Region | null): Promise<void> {
	if (!region) return;
	await tick(); // the swapped-in document must be rendered before measuring
	const el = document.querySelector(regionSelector(region));
	if (!(el instanceof HTMLElement)) return;

	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });

	// Restart cleanly when a repeat lands mid-flash, even on the same region.
	if (flashing) {
		clearTimeout(flashing.timer);
		flashing.el.classList.remove(FLASH_CLASS);
	}
	el.classList.add(FLASH_CLASS);
	flashing = {
		el,
		timer: setTimeout(() => {
			el.classList.remove(FLASH_CLASS);
			flashing = null;
		}, FLASH_MS)
	};
}
