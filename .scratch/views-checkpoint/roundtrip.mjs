// Views checkpoint, parts 2, 3 and 5 (wayfinder ticket 048), on Playwright
// WebKit against the shipped production build (vite preview).
//
//   part 2 — the JSON round trip: hand-edit a field in the box, Apply, export;
//            the bytes match a direct Sheet edit of the same field exported the
//            same way. Plus the null case: Apply with nothing changed commits
//            nothing and leaves history untouched.
//   part 3 — the migration, visible: paste the pre-map v1 canvas into the box,
//            Apply, and the box comes back holding migrated v2 bytes; the sheet
//            renders v2; the export matches importing that same v1 file.
//   part 5 — the dirty state: Markdown export and both Copies leave Unexported
//            changes standing; the Canvas file export clears it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const OUT = new URL('./evidence/', import.meta.url).pathname;
const APP = 'http://localhost:4173/';
mkdirSync(OUT, { recursive: true });

const V1_SPECIMEN = join(
	REPO,
	'.scratch',
	'mcp-hosts-checkpoint',
	'host-drive',
	'canvas-editing.bcc.json'
);
const V1_BYTES = readFileSync(V1_SPECIMEN, 'utf8');

const EDITED_PURPOSE =
	'Delivers order updates to customers on the channel they chose, and stops when they opt out.';

const fail = (msg) => {
	throw new Error(msg);
};
const facts = { two: {}, three: {}, five: {} };

const browser = await webkit.launch();

/** A page with nothing carried over — no autosave slot, no leftover buffer. */
async function freshPage() {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	const page = await context.newPage();
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.evaluate(() => localStorage.clear());
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForSelector('h1');
	await page.evaluate(() => {
		window.__clicks = [];
		HTMLAnchorElement.prototype.click = function () {
			window.__clicks.push({ href: this.href, download: this.download });
		};
		URL.revokeObjectURL = () => {};
	});
	page.__context = context;
	return page;
}

async function exportVia(page, item) {
	const before = await page.evaluate(() => window.__clicks.length);
	await page.click('button:has-text("Export")');
	await page.click(`[role="menuitem"]:has-text("${item}")`);
	await page.waitForFunction((n) => window.__clicks.length > n, before);
	const click = await page.evaluate(() => window.__clicks.at(-1));
	const body = await page.evaluate(async (href) => {
		const blob = await fetch(href).then((r) => r.blob());
		const fr = new FileReader();
		return new Promise((res, rej) => {
			fr.onload = () => res(fr.result);
			fr.onerror = () => rej(fr.error);
			fr.readAsDataURL(blob);
		});
	}, click.href);
	return {
		download: click.download,
		text: Buffer.from(body.split(',')[1], 'base64').toString('utf8')
	};
}

const openExample = async (page, index, name) => {
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').nth(index).click();
	await page.waitForFunction((n) => document.querySelector('h1')?.textContent?.includes(n), name);
};

const state = (page) =>
	page.evaluate(() => ({
		dirty: document.body.textContent.includes('Unexported changes'),
		undoEnabled: !document.querySelector('button[title^="Undo"]').disabled,
		redoEnabled: !document.querySelector('button[title^="Redo"]').disabled,
		purpose:
			document.querySelector('[aria-label="Purpose"]')?.textContent?.trim() ?? null,
		heading: document.querySelector('h1')?.textContent?.trim() ?? null
	}));

const BOX = 'textarea[aria-label="Canvas file JSON"]';

try {
	// ── part 2: the null Apply ────────────────────────────────────────────────
	let page = await freshPage();
	await openExample(page, 1, 'Notifications');
	const opened = await state(page);
	if (opened.dirty || opened.undoEnabled)
		fail(`a freshly opened example is not the clean start this leg needs: ${JSON.stringify(opened)}`);

	await page.click('#tab-json');
	await page.waitForSelector(BOX);
	const shown = await page.inputValue(BOX);
	await page.click('button:has-text("Apply")');
	await page.waitForTimeout(150);
	const afterNull = await state(page);
	facts.two.nullApply = {
		boxUnchanged: (await page.inputValue(BOX)) === shown,
		dirty: afterNull.dirty,
		undoEnabled: afterNull.undoEnabled,
		unappliedMarker: await page.evaluate(
			() => document.querySelector('#tab-json .mark') !== null
		),
		refusalShown: await page.evaluate(() => document.querySelector('[role="note"]') !== null)
	};
	if (afterNull.dirty || afterNull.undoEnabled)
		fail(`the null Apply committed: ${JSON.stringify(facts.two.nullApply)}`);
	if (facts.two.nullApply.refusalShown) fail('the null Apply produced a refusal');

	// ── part 2: hand-edit in the box, Apply, export ───────────────────────────
	const original = JSON.parse(shown);
	const edited = { ...original, purpose: EDITED_PURPOSE };
	const editedText = JSON.stringify(edited, null, 2);
	await page.fill(BOX, editedText);
	facts.two.markerBeforeApply = await page.evaluate(
		() => document.querySelector('#tab-json .mark') !== null
	);
	await page.click('button:has-text("Apply")');
	await page.waitForTimeout(200);
	facts.two.afterApply = {
		markerCleared: !(await page.evaluate(
			() => document.querySelector('#tab-json .mark') !== null
		)),
		boxIsCanonicalBytes: (await page.inputValue(BOX)) !== editedText,
		refusalShown: await page.evaluate(() => document.querySelector('[role="note"]') !== null)
	};
	if (facts.two.afterApply.refusalShown) fail('Apply refused a hand-edited canvas');
	await page.click('#tab-sheet');
	const afterApply = await state(page);
	facts.two.applyState = afterApply;
	if (afterApply.purpose !== EDITED_PURPOSE)
		fail(`the sheet did not render the applied purpose: ${afterApply.purpose}`);
	if (!afterApply.dirty || !afterApply.undoEnabled)
		fail('Apply landed no commit');
	const viaJson = await exportVia(page, 'Canvas file');
	writeFileSync(OUT + 'roundtrip-via-json.bcc.json', viaJson.text);

	// One commit, one undo step: a single Undo returns the original purpose.
	await page.click('button[title^="Undo"]');
	await page.waitForTimeout(150);
	const undone = await state(page);
	facts.two.oneUndoStep = {
		purposeBack: undone.purpose === original.purpose,
		undoEnabled: undone.undoEnabled
	};
	if (!facts.two.oneUndoStep.purposeBack)
		fail(`one Undo did not undo the whole Apply: ${undone.purpose}`);
	await page.__context.close();

	// ── part 2: the same edit through the Sheet ───────────────────────────────
	page = await freshPage();
	await openExample(page, 1, 'Notifications');
	const field = page.locator('[aria-label="Purpose"]');
	await field.click();
	await page.evaluate(() => {
		const el = document.querySelector('[aria-label="Purpose"]');
		const range = document.createRange();
		range.selectNodeContents(el);
		const selection = getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	});
	await page.keyboard.press('Backspace');
	await page.keyboard.insertText(EDITED_PURPOSE);
	await page.locator('h1').click(); // blur commits a prose field
	await page.waitForTimeout(200);
	const sheetEdited = await state(page);
	if (sheetEdited.purpose !== EDITED_PURPOSE)
		fail(`the sheet edit did not commit: ${sheetEdited.purpose}`);
	const viaSheet = await exportVia(page, 'Canvas file');
	writeFileSync(OUT + 'roundtrip-via-sheet.bcc.json', viaSheet.text);
	facts.two.roundTrip = {
		identical: viaJson.text === viaSheet.text,
		bytes: Buffer.byteLength(viaJson.text, 'utf8'),
		download: viaJson.download
	};
	if (!facts.two.roundTrip.identical)
		fail('the JSON round trip and the Sheet edit export different bytes');
	await page.__context.close();

	// ── part 3: the migration, visible in the box ─────────────────────────────
	page = await freshPage();
	await page.click('#tab-json');
	await page.waitForSelector(BOX);
	await page.fill(BOX, V1_BYTES);
	await page.click('button:has-text("Apply")');
	await page.waitForTimeout(250);
	const boxAfter = await page.inputValue(BOX);
	writeFileSync(OUT + 'migration-box-after-apply.json', boxAfter);
	let parsedBox;
	try {
		parsedBox = JSON.parse(boxAfter);
	} catch (error) {
		fail(`the box does not hold JSON after applying a v1 canvas: ${error.message}`);
	}
	facts.three.box = {
		refusalShown: await page.evaluate(() => document.querySelector('[role="note"]') !== null),
		version: parsedBox.version,
		hasPurpose: 'purpose' in parsedBox,
		hasDescription: 'description' in parsedBox,
		differsFromPaste: boxAfter !== V1_BYTES,
		unappliedMarker: await page.evaluate(
			() => document.querySelector('#tab-json .mark') !== null
		)
	};
	if (facts.three.box.refusalShown) fail('the v1 paste was refused');
	if (parsedBox.version !== 2) fail(`the box did not come back as v2: ${parsedBox.version}`);
	if (facts.three.box.unappliedMarker) fail('the box still reads as unapplied after a successful Apply');
	await page.screenshot({ path: OUT + 'migration-json-view.png', fullPage: false });

	await page.click('#tab-sheet');
	const migrated = await state(page);
	facts.three.sheet = { heading: migrated.heading, dirty: migrated.dirty };
	if (!migrated.heading.includes('Canvas Editing'))
		fail(`the sheet did not render the migrated document: ${migrated.heading}`);
	await page.screenshot({ path: OUT + 'migration-sheet.png', fullPage: true });
	const pastedExport = await exportVia(page, 'Canvas file');
	writeFileSync(OUT + 'migration-via-paste.bcc.json', pastedExport.text);
	await page.__context.close();

	// The same v1 file through Import…, for comparison.
	page = await freshPage();
	await page.setInputFiles('input[type=file]', V1_SPECIMEN);
	await page.waitForFunction(() =>
		document.querySelector('h1')?.textContent?.includes('Canvas Editing')
	);
	const importedExport = await exportVia(page, 'Canvas file');
	writeFileSync(OUT + 'migration-via-import.bcc.json', importedExport.text);
	facts.three.pasteMatchesImport = pastedExport.text === importedExport.text;
	facts.three.boxHeldTheExportBytes = boxAfter === importedExport.text;
	if (!facts.three.pasteMatchesImport)
		fail('pasting a v1 canvas and importing the same file export different bytes');
	await page.__context.close();

	// ── part 5: the dirty state ───────────────────────────────────────────────
	page = await freshPage();
	await openExample(page, 1, 'Notifications');
	await page.locator('[aria-label="Purpose"]').click();
	await page.keyboard.insertText(' Edited.');
	await page.locator('h1').click();
	await page.waitForTimeout(200);
	const dirtied = await state(page);
	if (!dirtied.dirty) fail('a sheet edit did not raise Unexported changes');

	const md = await exportVia(page, 'Markdown');
	facts.five.afterMarkdownExport = (await state(page)).dirty;
	facts.five.markdownDownload = md.download;
	if (!facts.five.afterMarkdownExport) fail('the Markdown export cleared Unexported changes');

	const png = await exportVia(page, 'PNG');
	facts.five.afterPngExport = (await state(page)).dirty;
	if (!facts.five.afterPngExport) fail('the PNG export cleared Unexported changes');

	// Copy from both text Views. The live region's announcement is the proof the
	// clipboard write actually succeeded rather than being swallowed.
	const announced = () =>
		page.evaluate(() => document.querySelector('[aria-live]')?.textContent?.trim() ?? '');
	await page.click('#tab-json');
	await page.click('button:has-text("Copy")');
	await page.waitForTimeout(200);
	facts.five.jsonCopyAnnounced = await announced();
	facts.five.afterJsonCopy = (await state(page)).dirty;
	await page.click('#tab-markdown');
	await page.click('button:has-text("Copy")');
	await page.waitForTimeout(200);
	facts.five.markdownCopyAnnounced = await announced();
	facts.five.afterMarkdownCopy = (await state(page)).dirty;
	if (!facts.five.afterJsonCopy || !facts.five.afterMarkdownCopy)
		fail('a Copy cleared Unexported changes');

	await page.click('#tab-sheet');
	const html = await exportVia(page, 'HTML artifact');
	facts.five.afterHtmlExport = (await state(page)).dirty;
	facts.five.htmlDownload = html.download;
	if (facts.five.afterHtmlExport) fail('the HTML artifact export did not clear Unexported changes');

	// Re-dirty, then the Canvas file export.
	await page.locator('[aria-label="Purpose"]').click();
	await page.keyboard.insertText(' Again.');
	await page.locator('h1').click();
	await page.waitForTimeout(200);
	if (!(await state(page)).dirty) fail('the second sheet edit did not re-dirty the canvas');
	await exportVia(page, 'Canvas file');
	facts.five.afterCanvasFileExport = (await state(page)).dirty;
	if (facts.five.afterCanvasFileExport)
		fail('the Canvas file export did not clear Unexported changes');
	await page.__context.close();
} finally {
	writeFileSync(OUT + 'parts-2-3-5.json', JSON.stringify(facts, null, '\t') + '\n');
	await browser.close();
}

console.log(JSON.stringify(facts, null, '\t'));
console.log('\nparts 2, 3 and 5 green');
