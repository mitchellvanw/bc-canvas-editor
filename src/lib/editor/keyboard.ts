/**
 * The sheet-wide structural keyboard grammar (SPEC §8.2): Delete removes the
 * focused item container — never inside text editing — by pressing the item's
 * own × so removal and its announcement stay one code path; Alt+←/→ moves a
 * chip within its lane and Alt+↑/↓ a lane within its section, each press a
 * stateless one-commit move that keeps focus (and the caret) on the moved
 * item. Popovers, dialogs and inputs keep their keyboard to themselves.
 */

import { tick } from 'svelte';
import { announce } from '$lib/a11y/announce';
import { moveItem } from '$lib/model/canvas';
import { canvas } from './document.svelte';

/** Every removable item container, nearest-first under closest(). */
const ITEM_CONTAINERS = '.msg, .role, .stack li, .terms__row, .lane';

/** Surfaces whose keyboard never means the sheet grammar. */
const FOREIGN_SURFACES = 'dialog, input, textarea, .picker, .typepop';

/**
 * The one reorder commit, shared by drag drops and Alt+arrow moves: one
 * structural action, one commit, one announcement — SPEC §10 wording, where
 * earlier in its list is up and later is down, chips too.
 */
export function commitMove(list: unknown[], from: number, to: number): void {
	canvas.commit(() => moveItem(list, from, to));
	announce(to < from ? 'Moved up' : 'Moved down');
}

/**
 * Map a `.lanes`/`.msgs` list element back to its model list — render order
 * is model order, so element indexes are model indexes. Shared by the drag
 * wrapper's drop handler and the Alt+arrow moves.
 */
export function modelList(listEl: HTMLElement): unknown[] | null {
	const lanes = listEl.closest('.area-inbound')
		? canvas.doc.inboundCommunication
		: listEl.closest('.area-outbound')
			? canvas.doc.outboundCommunication
			: null;
	if (!lanes) return null;
	if (listEl.classList.contains('lanes')) return lanes;
	const laneEl = listEl.closest('.lane');
	if (!laneEl?.parentElement) return null;
	const laneIndex = [...laneEl.parentElement.children].indexOf(laneEl);
	return lanes[laneIndex]?.messages ?? null;
}

/** One keydown from the sheet; true when the grammar consumed it. */
export function handleStructuralKey(event: KeyboardEvent): boolean {
	const target = event.target instanceof Element ? event.target : null;
	if (!target || target.closest(FOREIGN_SURFACES)) return false;

	if (event.key === 'Delete' || event.key === 'Backspace') {
		// Text editing keeps its deletions; add affordances remove nothing —
		// Delete on a lane's message ghost must not take the lane with it.
		if (target.closest('[contenteditable], .ghost, .addmsg')) return false;
		const container = target.closest<HTMLElement>(ITEM_CONTAINERS);
		const x = container?.querySelector<HTMLElement>('.x');
		if (!container || !x || x.closest(ITEM_CONTAINERS) !== container) return false;
		event.preventDefault();
		x.click();
		return true;
	}

	if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return false;
	const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
	const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
	if (!horizontal && !vertical) return false;

	// Alt+←/→ acts on the chip, Alt+↑/↓ on the lane — from anywhere inside,
	// text editing included: a chip's name field is the chip for keyboard
	// purposes. Outside a chip/lane the keys stay native (word movement).
	const item = target.closest<HTMLElement>(horizontal ? '.msg' : '.lane');
	const listEl = item?.parentElement;
	if (!item || !listEl) return false;
	event.preventDefault();

	const list = modelList(listEl);
	const from = [...listEl.children].indexOf(item);
	const to = from + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1);
	if (!list || from < 0 || to < 0 || to >= list.length) return true;

	void moveWithFocus(list, from, to);
	return true;
}

/** Commit the move, then put focus (and any caret) back on the moved item. */
async function moveWithFocus(list: unknown[], from: number, to: number): Promise<void> {
	const active = document.activeElement;
	const selection = window.getSelection?.();
	const caret =
		selection?.rangeCount && active?.contains(selection.anchorNode)
			? { node: selection.anchorNode as Node, offset: selection.anchorOffset }
			: null;

	commitMove(list, from, to);

	// The keyed re-render moves the item's DOM node, which drops focus.
	await tick();
	if (!(active instanceof HTMLElement) || !active.isConnected) return;
	active.focus();
	if (caret && caret.node.isConnected && selection) {
		const max =
			caret.node.nodeType === Node.TEXT_NODE
				? (caret.node.textContent?.length ?? 0)
				: caret.node.childNodes.length;
		const range = document.createRange();
		range.setStart(caret.node, Math.min(caret.offset, max));
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
	}
}
