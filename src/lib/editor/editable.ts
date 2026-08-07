/**
 * The commit grammar for every free-text field on the sheet (SPEC §6): the
 * field is contenteditable plaintext in place; blur commits, Enter commits
 * single-line fields, Esc reverts to the last committed value. One field blur
 * is one commit — unchanged text commits nothing. ⌘Z over uncommitted edits
 * is a synonym of Esc (SPEC §6.1), consumed here so it never reaches the
 * global history handler; a pristine field lets it bubble to app undo.
 */

import { lastInputModality } from '$lib/a11y/modality';
import { registerFlushable } from './flush';
import { undoShortcut } from './undo';

/**
 * Marks a contenteditable field whose focus arrived by keyboard, carrying the
 * SPEC §8.4 2px ring; pointer-initiated editing keeps hairline + caret.
 * Class, not state: the ring is per-focus, set on entry, cleared on exit.
 */
export const KEYBOARD_FOCUS_CLASS = 'field-kbd';

export interface EditableTextOptions {
	value: string;
	onCommit: (value: string) => void;
	multiline?: boolean;
}

export interface EditableTextAction {
	update(next: EditableTextOptions): void;
	destroy(): void;
}

export function editableText(node: HTMLElement, options: EditableTextOptions): EditableTextAction {
	let current = options;
	let committed = current.value;

	node.setAttribute('contenteditable', 'plaintext-only');
	node.setAttribute('role', 'textbox');
	if (current.multiline) node.setAttribute('aria-multiline', 'true');
	node.textContent = committed;

	const commit = () => {
		const value = node.textContent ?? '';
		if (value === committed) return;
		committed = value;
		current.onCommit(value);
	};

	const revert = () => {
		node.textContent = committed;
		node.blur();
	};

	const onFocus = () =>
		node.classList.toggle(KEYBOARD_FOCUS_CLASS, lastInputModality() === 'keyboard');

	// Clicking into an already-focused field refires no focus event, but the
	// editing just became pointer-initiated — back to hairline + caret.
	const onPointerdown = () => node.classList.remove(KEYBOARD_FOCUS_CLASS);

	const onBlur = () => {
		node.classList.remove(KEYBOARD_FOCUS_CLASS);
		commit();
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !current.multiline) {
			event.preventDefault();
			commit();
			node.blur();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			revert();
		} else if (undoShortcut(event) === 'undo' && node.textContent !== committed) {
			event.preventDefault();
			event.stopPropagation();
			revert();
		}
	};

	node.addEventListener('focus', onFocus);
	node.addEventListener('pointerdown', onPointerdown);
	node.addEventListener('blur', onBlur);
	node.addEventListener('keydown', onKeydown);
	// The unload flush (flush.ts) commits this field if the tab closes or
	// backgrounds mid-edit — same no-op-when-pristine commit, no blur.
	const unregisterFlush = registerFlushable(commit);

	return {
		update(next: EditableTextOptions) {
			current = next;
			if (next.value !== committed) {
				// A focused pristine field follows the document (undo can change it
				// under a parked caret); uncommitted edits are never clobbered.
				const pristine = node.textContent === committed;
				committed = next.value;
				if (pristine || document.activeElement !== node) node.textContent = committed;
			}
		},
		destroy() {
			node.removeEventListener('focus', onFocus);
			node.removeEventListener('pointerdown', onPointerdown);
			node.removeEventListener('blur', onBlur);
			node.removeEventListener('keydown', onKeydown);
			unregisterFlush();
		}
	};
}
