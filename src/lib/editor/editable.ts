/**
 * The commit grammar for every free-text field on the sheet (SPEC §6): the
 * field is contenteditable plaintext in place; blur commits, Enter commits
 * single-line fields, Esc reverts to the last committed value. One field blur
 * is one commit — unchanged text commits nothing.
 */

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

	const onBlur = () => commit();

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !current.multiline) {
			event.preventDefault();
			commit();
			node.blur();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			node.textContent = committed;
			node.blur();
		}
	};

	node.addEventListener('blur', onBlur);
	node.addEventListener('keydown', onKeydown);

	return {
		update(next: EditableTextOptions) {
			current = next;
			if (next.value !== committed) {
				committed = next.value;
				if (document.activeElement !== node) node.textContent = committed;
			}
		},
		destroy() {
			node.removeEventListener('blur', onBlur);
			node.removeEventListener('keydown', onKeydown);
		}
	};
}
