// @vitest-environment jsdom
/**
 * Pointer drag-reorder (SPEC §6): chips within their lane, lanes by grip.
 * insertionSlot is the pure geometry (jsdom has no layout, so rects are
 * stubbed); dragReorder is the delegated wiring — a drag begins on a grip or
 * on a chip's non-editable surface, activates past a small threshold, and a
 * drop reports exactly one reorder. Escape abandons the drag.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dragReorder, insertionSlot, type Rect } from '$lib/editor/drag';

function rect(partial: Partial<Rect>): Rect {
	return { top: 0, bottom: 0, left: 0, width: 0, height: 0, ...partial };
}

describe('insertionSlot', () => {
	// A vertical list (lanes): three items stacked at y 0–100, 110–210, 220–320.
	const lanes = [
		rect({ top: 0, bottom: 100, height: 100 }),
		rect({ top: 110, bottom: 210, height: 100 }),
		rect({ top: 220, bottom: 320, height: 100 })
	];

	it('slots before the first item whose vertical midpoint the pointer is above', () => {
		expect(insertionSlot(lanes, 10, 20, 'y')).toBe(0);
		expect(insertionSlot(lanes, 10, 90, 'y')).toBe(1);
		expect(insertionSlot(lanes, 10, 200, 'y')).toBe(2);
	});

	it('slots at the end when the pointer is below every midpoint', () => {
		expect(insertionSlot(lanes, 10, 300, 'y')).toBe(3);
	});

	// A wrapped chip row: two chips on the first row, one on the second.
	const chips = [
		rect({ top: 0, bottom: 20, height: 20, left: 0, width: 100 }),
		rect({ top: 0, bottom: 20, height: 20, left: 110, width: 100 }),
		rect({ top: 30, bottom: 50, height: 20, left: 0, width: 100 })
	];

	it('slots by horizontal midpoint within a row', () => {
		expect(insertionSlot(chips, 40, 10, 'x')).toBe(0);
		expect(insertionSlot(chips, 60, 10, 'x')).toBe(1);
		expect(insertionSlot(chips, 140, 10, 'x')).toBe(1);
		expect(insertionSlot(chips, 200, 10, 'x')).toBe(2);
	});

	it('slots at a row end when the pointer is past the row, and on later rows by their band', () => {
		expect(insertionSlot(chips, 300, 10, 'x')).toBe(2);
		expect(insertionSlot(chips, 40, 40, 'x')).toBe(2);
		expect(insertionSlot(chips, 80, 40, 'x')).toBe(3);
		expect(insertionSlot(chips, 40, 100, 'x')).toBe(3);
	});

	it('returns 0 for an empty list', () => {
		expect(insertionSlot([], 10, 10, 'x')).toBe(0);
	});
});

/** A minimal sheet skeleton: one section, two lanes, three chips in lane one. */
function mountSheet() {
	document.body.innerHTML = `
		<div id="wrap">
			<section class="panel area-inbound">
				<ul class="lanes">
					<li class="lane">
						<div class="lane__head"><button data-grip>⠿</button><h3>Checkout</h3></div>
						<ul class="msgs">
							<li class="msg"><span contenteditable="plaintext-only">Place Order</span></li>
							<li class="msg"><button aria-label="Remove">×</button>Confirm</li>
							<li class="msg">Cancel Order</li>
						</ul>
					</li>
					<li class="lane">
						<div class="lane__head"><button data-grip>⠿</button><h3>Billing</h3></div>
					</li>
				</ul>
			</section>
		</div>`;
	const wrap = document.getElementById('wrap') as HTMLElement;

	// jsdom computes no layout: chips sit side by side at y 0–20, 110px apart;
	// lanes stack at y 0–100 and 110–210.
	const chipRects = [
		rect({ top: 0, bottom: 20, height: 20, left: 0, width: 100 }),
		rect({ top: 0, bottom: 20, height: 20, left: 110, width: 100 }),
		rect({ top: 0, bottom: 20, height: 20, left: 220, width: 100 })
	];
	const laneRects = [
		rect({ top: 0, bottom: 100, height: 100 }),
		rect({ top: 110, bottom: 210, height: 100 })
	];
	const chips = [...wrap.querySelectorAll<HTMLElement>('.msg')];
	const lanes = [...wrap.querySelectorAll<HTMLElement>('.lane')];
	chips.forEach((chip, i) => (chip.getBoundingClientRect = () => chipRects[i] as DOMRect));
	lanes.forEach((lane, i) => (lane.getBoundingClientRect = () => laneRects[i] as DOMRect));

	const onReorder = vi.fn();
	const action = dragReorder(wrap, { onReorder });
	return { wrap, chips, lanes, onReorder, action };
}

function pointer(type: string, target: EventTarget, x: number, y: number) {
	target.dispatchEvent(
		new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })
	);
}

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('dragReorder', () => {
	it('drags a chip to a new slot in its lane and reports one reorder', () => {
		const { chips, onReorder } = mountSheet();
		pointer('pointerdown', chips[0], 10, 10);
		pointer('pointermove', window, 150, 10);
		pointer('pointermove', window, 300, 10);
		pointer('pointerup', window, 300, 10);
		expect(onReorder).toHaveBeenCalledExactlyOnceWith(chips[0].parentElement, 0, 2);
	});

	it('drags a lane by its grip and reports the lane list', () => {
		const { wrap, lanes, onReorder } = mountSheet();
		const grip = lanes[0].querySelector('[data-grip]') as HTMLElement;
		pointer('pointerdown', grip, 10, 10);
		pointer('pointermove', window, 10, 180);
		pointer('pointerup', window, 10, 180);
		expect(onReorder).toHaveBeenCalledExactlyOnceWith(wrap.querySelector('.lanes'), 0, 1);
	});

	it('marks the drag source and drop slot while dragging, and cleans up on drop', () => {
		const { chips } = mountSheet();
		pointer('pointerdown', chips[0], 10, 10);
		pointer('pointermove', window, 150, 10);
		expect(chips[0].classList.contains('drag-src')).toBe(true);
		expect(chips[1].classList.contains('drop-before')).toBe(true);
		pointer('pointerup', window, 150, 10);
		expect(document.querySelector('.drag-src, .drop-before, .drop-after')).toBeNull();
	});

	it('reports nothing when the drop lands back on the same position', () => {
		const { chips, onReorder } = mountSheet();
		pointer('pointerdown', chips[1], 120, 10);
		pointer('pointermove', window, 130, 10);
		pointer('pointerup', window, 130, 10);
		expect(onReorder).not.toHaveBeenCalled();
	});

	it('never activates below the movement threshold', () => {
		const { chips, onReorder } = mountSheet();
		pointer('pointerdown', chips[0], 10, 10);
		pointer('pointermove', window, 12, 11);
		pointer('pointerup', window, 12, 11);
		expect(onReorder).not.toHaveBeenCalled();
		expect(chips[0].classList.contains('drag-src')).toBe(false);
	});

	it('leaves pointerdowns on editable text and buttons alone', () => {
		const { chips, onReorder } = mountSheet();
		pointer('pointerdown', chips[0].querySelector('[contenteditable]')!, 10, 10);
		pointer('pointermove', window, 300, 10);
		pointer('pointerup', window, 300, 10);
		pointer('pointerdown', chips[1].querySelector('button')!, 120, 10);
		pointer('pointermove', window, 300, 10);
		pointer('pointerup', window, 300, 10);
		expect(onReorder).not.toHaveBeenCalled();
	});

	it('abandons the drag on Escape', () => {
		const { chips, onReorder } = mountSheet();
		pointer('pointerdown', chips[0], 10, 10);
		pointer('pointermove', window, 300, 10);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(document.querySelector('.drag-src, .drop-before, .drop-after')).toBeNull();
		pointer('pointerup', window, 300, 10);
		expect(onReorder).not.toHaveBeenCalled();
	});

	it('stops listening after destroy', () => {
		const { chips, onReorder, action } = mountSheet();
		action.destroy();
		pointer('pointerdown', chips[0], 10, 10);
		pointer('pointermove', window, 300, 10);
		pointer('pointerup', window, 300, 10);
		expect(onReorder).not.toHaveBeenCalled();
	});
});
