// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { editableText, type EditableTextOptions } from '$lib/editor/editable';
import { flushPendingEdits } from '$lib/editor/flush';

function mount(options: Partial<EditableTextOptions> = {}) {
	const node = document.createElement('h1');
	document.body.append(node);
	const onCommit = vi.fn();
	const action = editableText(node, { value: 'Order Fulfillment', onCommit, ...options });
	return { node, onCommit, action };
}

function type(node: HTMLElement, text: string) {
	node.textContent = text;
}

function blur(node: HTMLElement) {
	node.dispatchEvent(new FocusEvent('blur'));
}

function press(node: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init });
	node.dispatchEvent(event);
	return event;
}

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('editableText', () => {
	it('renders the value as plaintext-editable content', () => {
		const { node } = mount();
		expect(node.textContent).toBe('Order Fulfillment');
		expect(node.getAttribute('contenteditable')).toBe('plaintext-only');
		expect(node.getAttribute('role')).toBe('textbox');
	});

	it('marks multiline fields as aria-multiline', () => {
		const { node } = mount({ multiline: true });
		expect(node.getAttribute('aria-multiline')).toBe('true');
	});

	it('commits the new text on blur', () => {
		const { node, onCommit } = mount();
		type(node, 'Shipping');
		blur(node);
		expect(onCommit).toHaveBeenCalledExactlyOnceWith('Shipping');
	});

	it('does not commit on blur when nothing changed', () => {
		const { node, onCommit } = mount();
		blur(node);
		expect(onCommit).not.toHaveBeenCalled();
	});

	it('commits on Enter for a single-line field, swallowing the newline', () => {
		const { node, onCommit } = mount();
		type(node, 'Shipping');
		const event = press(node, 'Enter');
		expect(event.defaultPrevented).toBe(true);
		expect(onCommit).toHaveBeenCalledExactlyOnceWith('Shipping');
	});

	it('does not double-commit when blur follows Enter', () => {
		const { node, onCommit } = mount();
		type(node, 'Shipping');
		press(node, 'Enter');
		blur(node);
		expect(onCommit).toHaveBeenCalledTimes(1);
	});

	it('lets Enter insert newlines in a multiline field without committing', () => {
		const { node, onCommit } = mount({ multiline: true });
		const event = press(node, 'Enter');
		expect(event.defaultPrevented).toBe(false);
		expect(onCommit).not.toHaveBeenCalled();
	});

	it('reverts to the last committed value on Esc without committing', () => {
		const { node, onCommit } = mount();
		type(node, 'Ship');
		press(node, 'Escape');
		expect(node.textContent).toBe('Order Fulfillment');
		expect(onCommit).not.toHaveBeenCalled();
	});

	it('reverts to the value committed mid-session, not the initial one', () => {
		const { node, onCommit } = mount();
		type(node, 'Shipping');
		blur(node);
		type(node, 'Shipp');
		press(node, 'Escape');
		expect(node.textContent).toBe('Shipping');
		expect(onCommit).toHaveBeenCalledTimes(1);
	});

	it('reflects an external value change (e.g. autosave restore) into the field', () => {
		const { node, onCommit, action } = mount({ value: '' });
		action.update({ value: 'Restored Name', onCommit });
		expect(node.textContent).toBe('Restored Name');
		blur(node);
		expect(onCommit).not.toHaveBeenCalled();
	});

	it('syncs an external change (undo) into a focused field with no uncommitted edits', () => {
		const { node, onCommit, action } = mount();
		node.focus();
		expect(document.activeElement).toBe(node);
		action.update({ value: 'Fulfillment', onCommit });
		expect(node.textContent).toBe('Fulfillment');
		blur(node);
		expect(onCommit).not.toHaveBeenCalled();
	});

	it('never clobbers uncommitted edits in a focused field on external change', () => {
		const { node, onCommit, action } = mount();
		node.focus();
		type(node, 'Shipp');
		action.update({ value: 'Fulfillment', onCommit });
		expect(node.textContent).toBe('Shipp');
	});

	describe('unload flush (SPEC §6.1)', () => {
		it('commits a mid-edit field on flush without blurring it', () => {
			const { node, onCommit } = mount();
			node.focus();
			type(node, 'Shipping');
			flushPendingEdits();
			expect(onCommit).toHaveBeenCalledExactlyOnceWith('Shipping');
			expect(document.activeElement).toBe(node);
		});

		it('commits nothing on flush when every field is pristine', () => {
			const { onCommit } = mount();
			flushPendingEdits();
			expect(onCommit).not.toHaveBeenCalled();
		});

		it('does not double-commit when blur follows a flush', () => {
			const { node, onCommit } = mount();
			type(node, 'Shipping');
			flushPendingEdits();
			blur(node);
			expect(onCommit).toHaveBeenCalledTimes(1);
		});

		it('drops out of the flush when the action is destroyed', () => {
			const { node, onCommit, action } = mount();
			type(node, 'Shipping');
			action.destroy();
			flushPendingEdits();
			expect(onCommit).not.toHaveBeenCalled();
			expect(node).toBeDefined();
		});
	});

	describe('⌘Z inside a field (SPEC §6.1)', () => {
		it('reverts uncommitted edits as a synonym of Esc, consuming the event', () => {
			const { node, onCommit } = mount();
			type(node, 'Ship');
			const reachedWindow = vi.fn();
			window.addEventListener('keydown', reachedWindow);
			const event = press(node, 'z', { metaKey: true });
			window.removeEventListener('keydown', reachedWindow);
			expect(node.textContent).toBe('Order Fulfillment');
			expect(onCommit).not.toHaveBeenCalled();
			expect(event.defaultPrevented).toBe(true);
			expect(reachedWindow).not.toHaveBeenCalled();
		});

		it('lets ⌘Z bubble to the global history handler when the field is pristine', () => {
			const { node } = mount();
			const reachedWindow = vi.fn();
			window.addEventListener('keydown', reachedWindow);
			press(node, 'z', { metaKey: true });
			window.removeEventListener('keydown', reachedWindow);
			expect(reachedWindow).toHaveBeenCalledTimes(1);
		});

		it('lets ⇧⌘Z (redo) bubble even with uncommitted edits', () => {
			const { node } = mount();
			type(node, 'Ship');
			const reachedWindow = vi.fn();
			window.addEventListener('keydown', reachedWindow);
			press(node, 'Z', { metaKey: true, shiftKey: true });
			window.removeEventListener('keydown', reachedWindow);
			expect(node.textContent).toBe('Ship');
			expect(reachedWindow).toHaveBeenCalledTimes(1);
		});
	});
});
