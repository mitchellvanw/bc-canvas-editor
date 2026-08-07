/**
 * The Reference dialog's contents and per-platform shortcut rendering
 * (SPEC §12): the SPEC writes shortcuts in their canonical macOS form; on
 * Windows/Linux ⌘ renders as Ctrl (⇧⌘ as Ctrl+Shift), while modifier-free
 * keys — Alt, Enter, arrows — read the same everywhere.
 */

/** One shortcut cluster of the dialog: its heading and its keys→action rows. */
export interface ReferenceCluster {
	title: string;
	rows: [keys: string, action: string][];
}

/**
 * The four clusters, verbatim from SPEC §12 — the keyboard grammar is the
 * dialog's whole coverage besides the link line; no method primer, no
 * glossary, no additions.
 */
export const REFERENCE_CLUSTERS: ReferenceCluster[] = [
	{
		title: 'Editing',
		rows: [
			['Enter', 'Commit a single-line field'],
			['Esc', 'Revert the field being edited'],
			['Tab / click away', 'Commit and move on']
		]
	},
	{
		title: 'Structure',
		rows: [
			['Delete', 'Remove the focused chip or lane'],
			['Alt+← / Alt+→', 'Move a chip within its lane'],
			['Alt+↑ / Alt+↓', 'Move a lane up or down']
		]
	},
	{
		title: 'Pickers',
		rows: [
			['Enter / Space', 'Open the picker on a value'],
			['↑ ↓', 'Move through options — or type to jump'],
			['Space', 'Toggle a trait'],
			['Enter', 'Pick and close'],
			['Esc', 'Close without changing']
		]
	},
	{
		title: 'App',
		rows: [
			['⌘Z / ⇧⌘Z', 'Undo / Redo'],
			['⌘/', 'Open this reference']
		]
	}
];

/** Where the link line points: the method's home, the ddd-crew repo. */
export const REFERENCE_URL = 'https://github.com/ddd-crew/bounded-context-canvas';

/** True on Apple platforms, where ⌘ is the modifier the keyboard carries. */
export function isMacPlatform(): boolean {
	return typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

/** Render a SPEC shortcut string for the running platform. */
export function renderKeys(keys: string, mac: boolean = isMacPlatform()): string {
	if (mac) return keys;
	return keys.replace(/⇧⌘(\S+)/g, 'Ctrl+Shift+$1').replace(/⌘(\S+)/g, 'Ctrl+$1');
}
