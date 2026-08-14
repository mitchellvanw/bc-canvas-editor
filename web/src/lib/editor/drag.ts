/**
 * Pointer drag-reorder for the live sheet (SPEC §6): chips drag within their
 * lane, lanes drag by their ⠿ grip. One delegated action on the editor wrapper
 * watches for a drag start on a grip (`[data-grip]`) or a chip's non-editable
 * surface, activates past a small movement threshold so plain clicks stay
 * clicks, paints `drag-src`/`drop-before`/`drop-after` classes for feedback,
 * and reports exactly one reorder per drop — the caller turns it into one
 * commit. Escape abandons the drag.
 *
 * Geometry is the pure `insertionSlot`; the DOM wiring maps drops back to the
 * sheet's `.lanes`/`.msgs` lists by element order (render order is model
 * order).
 */

export interface Rect {
	top: number;
	bottom: number;
	left: number;
	width: number;
	height: number;
}

/** 'y' for a vertical list (lanes); 'x' for a wrapping chip row (messages). */
export type Axis = 'x' | 'y';

const THRESHOLD = 4;

/**
 * The insertion slot (0..n) for a pointer over an ordered list of item rects:
 * vertically by midpoint, horizontally by row band then midpoint.
 */
export function insertionSlot(rects: Rect[], x: number, y: number, axis: Axis): number {
	for (const [i, r] of rects.entries()) {
		if (axis === 'y') {
			if (y < r.top + r.height / 2) return i;
		} else {
			if (y < r.top) return i;
			if (y <= r.bottom && x < r.left + r.width / 2) return i;
		}
	}
	return rects.length;
}

export interface DragReorderOptions {
	/** One drop = one reorder of `listEl`'s model list; `to` is the final index. */
	onReorder(listEl: HTMLElement, from: number, to: number): void;
}

interface DragState {
	item: HTMLElement;
	listEl: HTMLElement;
	items: HTMLElement[];
	axis: Axis;
	from: number;
	startX: number;
	startY: number;
	active: boolean;
	slot: number;
}

export interface DragReorderAction {
	update(next: DragReorderOptions): void;
	destroy(): void;
}

export function dragReorder(node: HTMLElement, options: DragReorderOptions): DragReorderAction {
	let current = options;
	let state: DragState | null = null;

	const clearMarks = () => {
		if (!state) return;
		state.item.classList.remove('drag-src');
		for (const item of state.items) item.classList.remove('drop-before', 'drop-after');
	};

	const paintMarks = () => {
		if (!state) return;
		for (const item of state.items) item.classList.remove('drop-before', 'drop-after');
		if (state.slot < state.items.length) state.items[state.slot].classList.add('drop-before');
		else state.items[state.items.length - 1]?.classList.add('drop-after');
	};

	const settle = () => {
		clearMarks();
		node.classList.remove('dragging');
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
		window.removeEventListener('keydown', onKeydown);
		state = null;
	};

	const onDown = (event: PointerEvent) => {
		if (event.button !== 0 || state !== null) return;
		const target = event.target;
		if (!(target instanceof Element)) return;

		let item: HTMLElement | null;
		let axis: Axis;
		if (target.closest('[data-grip]')) {
			item = target.closest<HTMLElement>('.lane');
			axis = 'y';
			// The grip is drag-only: no text to select, no native drag to start.
			event.preventDefault();
		} else {
			if (target.closest('[contenteditable], button')) return;
			item = target.closest<HTMLElement>('.msg');
			axis = 'x';
		}
		if (!item || !node.contains(item) || !item.parentElement) return;

		const listEl = item.parentElement;
		const items = [...listEl.children].filter((c): c is HTMLElement => c instanceof HTMLElement);
		state = {
			item,
			listEl,
			items,
			axis,
			from: items.indexOf(item),
			startX: event.clientX,
			startY: event.clientY,
			active: false,
			slot: items.indexOf(item)
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('keydown', onKeydown);
	};

	const onMove = (event: PointerEvent) => {
		if (!state) return;
		if (!state.active) {
			const moved = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
			if (moved <= THRESHOLD) return;
			state.active = true;
			state.item.classList.add('drag-src');
			node.classList.add('dragging');
		}
		const rects = state.items.map((item) => item.getBoundingClientRect());
		state.slot = insertionSlot(rects, event.clientX, event.clientY, state.axis);
		paintMarks();
		event.preventDefault();
	};

	const onUp = () => {
		if (!state) return;
		const { listEl, from, slot, active } = state;
		settle();
		if (!active) return;
		const to = slot > from ? slot - 1 : slot;
		if (to !== from) current.onReorder(listEl, from, to);
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') settle();
	};

	node.addEventListener('pointerdown', onDown);

	return {
		update(next: DragReorderOptions) {
			current = next;
		},
		destroy() {
			settle();
			node.removeEventListener('pointerdown', onDown);
		}
	};
}
