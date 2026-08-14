<script lang="ts">
	/**
	 * App chrome (SPEC §10): Undo/Redo, Import…, the Examples menu, the Export
	 * menu, New canvas, the quiet Unexported-changes indicator, and the
	 * Reference control at the far end. File verbs are Import/Export, never
	 * Open/Save. Visually the band reads left to right as identity, history,
	 * file: the wordmark (the way back to /), Undo/Redo as an icon pair, the
	 * three file verbs fused into one segmented group, and Export alone in
	 * filled ink — the single primary, since it is the only verb that gets
	 * work out of the machine. Undo/Redo and Reference carry their SPEC names
	 * as sr-only text, so the accessible name and the §10 copy stay one
	 * string. Owns the confirmation dialogs, file-refusal notices, and the
	 * Reference dialog with its global ⌘/ shortcut (SPEC §12). Import… takes
	 * both importable forms — `.bcc.json` and `.bcc.html` — through the one
	 * parseCanvasImport path (SPEC §9.1); opening an example is an import
	 * sourced from the app, through the same gate and replacement.
	 */
	import { announce } from '$lib/a11y/announce';
	import { downloadBlob } from '$lib/artifact/download';
	import { EXAMPLES, type ExampleEntry } from '$lib/chrome/examples';
	import { REFERENCE_CLUSTERS, REFERENCE_URL, renderKeys } from '$lib/chrome/reference';
	import { canvas } from '$lib/editor/document.svelte';
	import { PICKER_SURFACES } from '$lib/editor/keyboard';
	import { MULTI_TAB_NOTICE, multiTab } from '$lib/editor/multi-tab.svelte';
	import { performRedo, performUndo } from '$lib/editor/undo';
	import { blankCanvas, stampIds, CANVAS_VERSION, type CanvasFile } from '$lib/model/canvas';
	import { canvasDigest } from '$lib/model/digest';
	import { exportFileName } from '$lib/model/filename';
	import { parseCanvasImport } from '$lib/model/parse';
	import { toCanvasFile } from '$lib/model/serialize';

	type Dialog =
		| { kind: 'confirm-replace'; file: CanvasFile }
		| { kind: 'confirm-new' }
		| { kind: 'confirm-example'; file: CanvasFile }
		| { kind: 'newer-version'; version: number }
		| { kind: 'not-canvas' };

	let dialog = $state<Dialog | null>(null);
	let dialogEl = $state<HTMLDialogElement>();
	let fileInput: HTMLInputElement;
	let examplesButton: HTMLButtonElement;
	let examplesMenuOpen = $state(false);
	let exportButton: HTMLButtonElement;
	let exportMenuOpen = $state(false);
	let referenceOpen = $state(false);
	let referenceEl = $state<HTMLDialogElement>();
	let referenceInvoker: HTMLElement | null = null;

	// Unnamed canvas substitutes "this canvas" for the name (SPEC §10).
	const canvasName = $derived(canvas.doc.name.trim());

	// One string owns the SPEC §10 copy; the banner bolds its lead sentence.
	const noticeLead = MULTI_TAB_NOTICE.slice(0, MULTI_TAB_NOTICE.indexOf('.') + 1);
	const noticeRest = MULTI_TAB_NOTICE.slice(noticeLead.length + 1);

	const chromeButton =
		'rounded-[4px] border border-line bg-sheet px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-paper disabled:opacity-40 disabled:hover:bg-sheet';
	// The band's two segmented groups (history, file verbs): the group div
	// carries the border and sheet fill, members carry hover and the dividers.
	const groupItem =
		'px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-paper disabled:opacity-40 disabled:hover:bg-sheet';
	const iconItem =
		'flex h-8 w-9 items-center justify-center hover:bg-paper disabled:opacity-40 disabled:hover:bg-sheet';
	const menuItem =
		'block w-full px-4 py-1.5 text-left text-sm hover:bg-paper focus:bg-paper focus:outline-none';

	function closeExportMenuOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			exportMenuOpen = false;
			exportButton.focus();
		}
	}

	function closeExamplesMenuOnEscape(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			examplesMenuOpen = false;
			examplesButton.focus();
		}
	}

	function openAsModal(node: HTMLDialogElement) {
		node.showModal();
	}

	// Esc closes natively (dialog cancel); both paths land here, and focus
	// goes back to the invoking control — the chrome button or whatever held
	// focus when ⌘/ was pressed (SPEC §12).
	function openReference(invoker: HTMLElement | null) {
		referenceInvoker = invoker;
		referenceOpen = true;
	}

	function referenceClosed() {
		referenceOpen = false;
		if (referenceInvoker?.isConnected) referenceInvoker.focus();
		referenceInvoker = null;
	}

	/**
	 * The global ⌘/ (Ctrl+/) interception — always available, text editing
	 * included, because the shortcut has no native meaning there. Open
	 * dialogs and pickers keep their keyboard to themselves; shift stays
	 * legal for layouts that reach / through it.
	 */
	function handleReferenceShortcut(event: KeyboardEvent) {
		if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key !== '/') return;
		const target = event.target instanceof Element ? event.target : null;
		if (referenceOpen || target?.closest(`dialog, ${PICKER_SURFACES}`)) return;
		event.preventDefault();
		openReference(document.activeElement instanceof HTMLElement ? document.activeElement : null);
	}

	async function fileChosen() {
		const file = fileInput.files?.[0];
		fileInput.value = '';
		if (!file) return;

		const result = parseCanvasImport(await file.text());
		if (!result.ok) {
			dialog =
				result.reason === 'newer-version'
					? { kind: 'newer-version', version: result.version }
					: { kind: 'not-canvas' };
		} else if (canvas.unexported) {
			dialog = { kind: 'confirm-replace', file: result.file };
		} else {
			canvas.replace(stampIds(result.file));
			announce('Canvas imported');
		}
	}

	function exportCanvasFile() {
		exportMenuOpen = false;
		const blob = new Blob([canvas.exportCanvasFile()], { type: 'application/json' });
		downloadBlob(blob, exportFileName(canvas.doc.name, 'json'));
	}

	// The HTML artifact carries the Canvas file within it, so exporting one
	// clears Unexported changes — only once the build has succeeded (SPEC §9.1).
	async function exportHtml() {
		exportMenuOpen = false;
		try {
			// Loaded on demand. Since wayfinder ticket 050 the artifact is built by
			// the headless renderer, which carries the eight WOFF2 faces and the
			// design tokens as bytes rather than fetching them at export time —
			// ~170 KB an editor session that never exports has no use for.
			const { exportHtmlArtifact } = await import('$lib/artifact/html');
			exportHtmlArtifact(canvas.doc);
			canvas.markExported();
		} catch (error) {
			// SPEC §10 defines no export-failure notice; don't let it vanish silently.
			console.error('HTML export failed', error);
		}
	}

	/**
	 * Markdown is the one-way export (SPEC §1): the Markdown View's own bytes,
	 * from the one renderer, through the same normalization the View uses so the
	 * downloaded file and the pane on screen cannot say different things.
	 * Like PNG it never clears Unexported changes — it can't be imported back,
	 * and a user who exported Markdown and then closed the tab on a clean
	 * indicator would have lost the canvas (SPEC §6.1).
	 */
	function exportMarkdown() {
		exportMenuOpen = false;
		const blob = new Blob([canvasDigest(toCanvasFile(canvas.doc))], { type: 'text/markdown' });
		downloadBlob(blob, exportFileName(canvas.doc.name, 'md'));
	}

	// PNG export is pixels-only: it never clears Unexported changes (SPEC §6.1).
	async function exportPng() {
		exportMenuOpen = false;
		try {
			// Loaded on demand, like the HTML artifact and the SVG: snapdom is
			// ~30 KB of the page chunk an editor session that never exports a
			// PNG has no use for.
			const { exportPngArtifact } = await import('$lib/artifact/png');
			await exportPngArtifact(canvas.doc);
		} catch (error) {
			// SPEC §10 defines no export-failure notice; don't let it vanish silently.
			console.error('PNG export failed', error);
		}
	}

	/**
	 * The `.bcc.svg` a markdown file points an `<img>` at (SPEC §9.3), and the
	 * file `bcc render --svg` writes from a checkout. One-way like PNG: it
	 * carries no Canvas file, so it clears nothing (SPEC §6.1).
	 */
	async function exportSvg() {
		exportMenuOpen = false;
		try {
			// Loaded on demand, like the HTML artifact: an editor session that
			// never exports an image has no use for the renderer's ~200 KB of
			// embedded faces.
			const { exportSvgArtifact } = await import('$lib/artifact/svg');
			await exportSvgArtifact(canvas.doc);
		} catch (error) {
			// SPEC §10 defines no export-failure notice; don't let it vanish silently.
			console.error('SVG export failed', error);
		}
	}

	function newCanvas() {
		if (canvas.unexported) {
			dialog = { kind: 'confirm-new' };
		} else {
			canvas.replace(blankCanvas());
			announce('New canvas');
		}
	}

	// Opening an example runs the import path (SPEC §6.1): same gate over
	// unexported changes, same replacement, history cleared — and it lands
	// clean, because the example's bytes exist as a published re-importable file.
	function openExample(entry: ExampleEntry) {
		examplesMenuOpen = false;
		if (canvas.unexported) {
			dialog = { kind: 'confirm-example', file: entry.file };
		} else {
			loadExample(entry.file);
		}
	}

	function loadExample(file: CanvasFile) {
		canvas.replace(stampIds(file));
		announce('Example opened');
	}

	function proceed() {
		if (dialog?.kind === 'confirm-replace') {
			canvas.replace(stampIds(dialog.file));
			announce('Canvas imported');
		}
		if (dialog?.kind === 'confirm-new') {
			canvas.replace(blankCanvas());
			announce('New canvas');
		}
		if (dialog?.kind === 'confirm-example') {
			loadExample(dialog.file);
		}
		dialogEl?.close();
	}

	function closeExportMenu(event: FocusEvent | MouseEvent) {
		const next = 'relatedTarget' in event && event.relatedTarget ? event.relatedTarget : event.target;
		if (!(next instanceof Node) || !exportButton.parentElement?.contains(next)) {
			exportMenuOpen = false;
		}
	}

	function closeExamplesMenu(event: FocusEvent | MouseEvent) {
		const next = 'relatedTarget' in event && event.relatedTarget ? event.relatedTarget : event.target;
		if (!(next instanceof Node) || !examplesButton.parentElement?.contains(next)) {
			examplesMenuOpen = false;
		}
	}

	function closeMenusOnOutsideClick(event: MouseEvent) {
		if (exportMenuOpen) closeExportMenu(event);
		if (examplesMenuOpen) closeExamplesMenu(event);
	}
</script>

<svelte:window
	onclick={exportMenuOpen || examplesMenuOpen ? closeMenusOnOutsideClick : undefined}
	onkeydown={handleReferenceShortcut}
/>

<header
	class="mx-auto flex max-w-[1440px] flex-wrap items-center justify-end gap-2 px-4 pt-6 sm:px-6 lg:px-10"
>
	<a href="/" class="mr-2 text-lg font-bold tracking-tight whitespace-nowrap hover:opacity-70">
		BC Canvas
	</a>

	<div class="mr-auto flex rounded-[4px] border border-line bg-sheet">
		<button
			type="button"
			class="{iconItem} rounded-l-[3px]"
			title="Undo ({renderKeys('⌘Z')})"
			disabled={!canvas.canUndo}
			onclick={() => performUndo()}
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M9 14 4 9l5-5" />
				<path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
			</svg>
			<span class="sr-only">Undo</span>
		</button>
		<button
			type="button"
			class="{iconItem} rounded-r-[3px] border-l border-line"
			title="Redo ({renderKeys('⇧⌘Z')})"
			disabled={!canvas.canRedo}
			onclick={() => performRedo()}
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="m15 14 5-5-5-5" />
				<path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
			</svg>
			<span class="sr-only">Redo</span>
		</button>
	</div>

	<div class="flex rounded-[4px] border border-line bg-sheet">
		<button type="button" class="{groupItem} rounded-l-[3px]" onclick={() => fileInput.click()}>
			Import…
		</button>
		<div class="relative border-l border-line" onfocusout={closeExamplesMenu}>
			<button
				type="button"
				class="{groupItem} flex items-center gap-1.5"
				aria-haspopup="menu"
				aria-expanded={examplesMenuOpen}
				bind:this={examplesButton}
				onclick={(event) => {
					event.stopPropagation();
					examplesMenuOpen = !examplesMenuOpen;
				}}
				onkeydown={(event) => {
					if (event.key === 'Escape') examplesMenuOpen = false;
				}}
			>
				Examples
				<svg
					class="h-3 w-3 text-ink-faint"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</button>
			{#if examplesMenuOpen}
				<div
					role="menu"
					class="absolute right-0 z-10 mt-2 w-80 rounded-[6px] border border-line bg-sheet py-1 shadow-[2px_3px_0_rgb(26_30_32/0.10)]"
				>
					{#each EXAMPLES as entry (entry.name)}
						<button
							type="button"
							role="menuitem"
							class="block w-full px-4 py-2 text-left hover:bg-paper focus:bg-paper focus:outline-none"
							onclick={() => openExample(entry)}
							onkeydown={closeExamplesMenuOnEscape}
						>
							<span class="block text-sm font-medium">{entry.name}</span>
							<span class="block text-xs leading-snug text-ink-soft">{entry.description}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<button type="button" class="{groupItem} rounded-r-[3px] border-l border-line" onclick={newCanvas}>
			New canvas
		</button>
	</div>

	{#if canvas.unexported}
		<span class="mx-1 flex items-center gap-1.5 text-xs text-ink/55">
			<span class="h-1.5 w-1.5 rounded-full bg-hotspot" aria-hidden="true"></span>
			Unexported changes
		</span>
	{/if}

	<div class="relative" onfocusout={closeExportMenu}>
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-[4px] bg-ink px-3.5 py-[7px] text-sm font-medium whitespace-nowrap text-sheet hover:bg-ink/85"
			aria-haspopup="menu"
			aria-expanded={exportMenuOpen}
			bind:this={exportButton}
			onclick={(event) => {
				event.stopPropagation();
				exportMenuOpen = !exportMenuOpen;
			}}
			onkeydown={(event) => {
				if (event.key === 'Escape') exportMenuOpen = false;
			}}
		>
			Export
			<svg
				class="h-3 w-3 opacity-70"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</button>
		{#if exportMenuOpen}
			<div
				role="menu"
				class="absolute right-0 z-10 mt-1 min-w-max rounded-[6px] border border-line bg-sheet py-1 shadow-[2px_3px_0_rgb(26_30_32/0.10)]"
			>
				<button
					type="button"
					role="menuitem"
					class={menuItem}
					onclick={exportCanvasFile}
					onkeydown={closeExportMenuOnEscape}
				>
					Canvas file (.bcc.json)
				</button>
				<button
					type="button"
					role="menuitem"
					class={menuItem}
					onclick={exportHtml}
					onkeydown={closeExportMenuOnEscape}
				>
					HTML artifact (.bcc.html)
				</button>
				<!-- The two entries above leave in a form Import… takes back; the
				     three below don't, and sit together at the end (SPEC §10). -->
				<button
					type="button"
					role="menuitem"
					class={menuItem}
					onclick={exportPng}
					onkeydown={closeExportMenuOnEscape}
				>
					PNG image (2x)
				</button>
				<button
					type="button"
					role="menuitem"
					class={menuItem}
					onclick={exportSvg}
					onkeydown={closeExportMenuOnEscape}
				>
					SVG image
				</button>
				<button
					type="button"
					role="menuitem"
					class={menuItem}
					onclick={exportMarkdown}
					onkeydown={closeExportMenuOnEscape}
				>
					Markdown (.bcc.md)
				</button>
			</div>
		{/if}
	</div>

	<button
		type="button"
		class="flex h-[34px] w-[34px] items-center justify-center rounded-[4px] border border-line bg-sheet hover:bg-paper"
		title="Reference ({renderKeys('⌘/')})"
		onclick={(event) => openReference(event.currentTarget)}
	>
		<svg
			class="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
			<path d="M12 17h.01" />
		</svg>
		<span class="sr-only">Reference</span>
	</button>

	<input
		type="file"
		accept=".json,.html,application/json,text/html"
		class="hidden"
		bind:this={fileInput}
		onchange={fileChosen}
	/>
</header>

{#if multiTab.detected}
	<!-- Persistent multi-tab notice (SPEC §6.1/§10) — not a toast, never retracts.
	     No live-region role here: the one polite live region announces it (§8.5). -->
	<div role="note" class="mx-auto max-w-[1440px] px-10 pt-4">
		<p class="rounded-[6px] border border-line bg-sheet px-4 py-2.5 text-sm text-ink/75">
			<strong class="font-bold text-ink">{noticeLead}</strong>
			{noticeRest}
		</p>
	</div>
{/if}

{#if referenceOpen}
	<dialog
		bind:this={referenceEl}
		use:openAsModal
		onclose={referenceClosed}
		aria-labelledby="reference-title"
		class="m-auto w-[30rem] rounded-[6px] border border-line bg-sheet p-6 text-ink shadow-lg backdrop:bg-ink/30"
	>
		<h2 id="reference-title" class="font-bold">Reference</h2>

		{#each REFERENCE_CLUSTERS as cluster (cluster.title)}
			<section class="mt-4">
				<h3 class="text-xs font-bold tracking-wide text-ink/55 uppercase">{cluster.title}</h3>
				<table class="mt-1 w-full text-sm">
					<tbody>
						{#each cluster.rows as [keys, action] (keys + action)}
							<tr>
								<td class="w-44 py-0.5 pr-4 font-mono text-[13px] whitespace-nowrap">
									{renderKeys(keys)}
								</td>
								<td class="py-0.5 text-ink/75">{action}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/each}

		<p class="mt-5 border-t border-line pt-4 text-sm">
			Learn the method:
			<a
				class="underline underline-offset-2 hover:text-ink/70"
				href={REFERENCE_URL}
				target="_blank"
				rel="noopener noreferrer"
			>
				the ddd-crew's Bounded Context Canvas
			</a>
		</p>

		<div class="mt-6 flex justify-end">
			<button type="button" class={chromeButton} onclick={() => referenceEl?.close()}>
				Close
			</button>
		</div>
	</dialog>
{/if}

{#if dialog}
	<dialog
		bind:this={dialogEl}
		use:openAsModal
		onclose={() => (dialog = null)}
		class="m-auto w-[26rem] rounded-[6px] border border-line bg-sheet p-6 text-ink shadow-lg backdrop:bg-ink/30"
	>
		{#if dialog.kind === 'confirm-replace'}
			<h2 class="font-bold">
				Replace {canvasName === '' ? 'this canvas' : `"${canvasName}"`}?
			</h2>
			<p class="mt-2 text-sm text-ink/75">
				Its latest changes haven't been exported. Importing replaces the canvas and clears undo
				history.
			</p>
		{:else if dialog.kind === 'confirm-new'}
			<h2 class="font-bold">Start a new canvas?</h2>
			<p class="mt-2 text-sm text-ink/75">
				{canvasName === '' ? 'This canvas' : `"${canvasName}"`} has changes that haven't been
				exported. Starting fresh discards them and clears undo history.
			</p>
		{:else if dialog.kind === 'confirm-example'}
			<h2 class="font-bold">
				Replace {canvasName === '' ? 'this canvas' : `"${canvasName}"`}?
			</h2>
			<p class="mt-2 text-sm text-ink/75">
				Its latest changes haven't been exported. Opening an example replaces the canvas and clears
				undo history.
			</p>
		{:else if dialog.kind === 'newer-version'}
			<h2 class="font-bold">This file is from a newer version of BC Canvas.</h2>
			<p class="mt-2 text-sm text-ink/75">
				It was exported with format version {dialog.version}; this app reads up to version
				{CANVAS_VERSION}. The file hasn't been touched. Reload the page to pick up the latest app,
				then import again.
			</p>
		{:else}
			<h2 class="font-bold">This file couldn't be read as a Canvas file.</h2>
			<p class="mt-2 text-sm text-ink/75">
				It isn't a Canvas file export, or it's been modified. Nothing was imported.
			</p>
		{/if}

		<div class="mt-6 flex justify-end gap-2">
			{#if dialog.kind === 'confirm-replace' || dialog.kind === 'confirm-new' || dialog.kind === 'confirm-example'}
				<button type="button" class={chromeButton} onclick={() => dialogEl?.close()}>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-[4px] bg-ink px-3 py-1.5 text-sm font-medium text-sheet hover:bg-ink/85"
					onclick={proceed}
				>
					{dialog.kind === 'confirm-new' ? 'Start new' : 'Replace'}
				</button>
			{:else}
				<button type="button" class={chromeButton} onclick={() => dialogEl?.close()}>OK</button>
			{/if}
		</div>
	</dialog>
{/if}
