// Ticket 13 checkpoint on Playwright WebKit: the Reference dialog in a real
// browser. Facts gathered:
//   1. The Reference control sits at the far end of the chrome with tooltip
//      `Reference (⌘/)` (mac rendering on this platform); clicking opens a
//      native modal dialog titled Reference.
//   2. Contents verbatim: four clusters (Editing / Structure / Pickers / App)
//      with the SPEC §12 rows in mac form, then the link line to the
//      ddd-crew repo.
//   3. Modal semantics: dialog matches :modal, focus is trapped inside
//      (Option+Tab never escapes), Esc closes, focus returns to the invoker.
//   4. ⌘/ opens from the sheet — from a contenteditable field included —
//      and close returns focus to that field; ⌘/ while the dialog is up
//      does not stack a second one.
//   5. Documented keys vs built behavior: Enter commits a field, Esc reverts
//      it, Tab commits and moves on, ⌘Z/⇧⌘Z undo/redo — checked live here;
//      Delete, Alt+arrows and the picker keys were proven end-to-end by the
//      12-checkpoint keyboard-only build on this same WebKit.
import { writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:5173';
const shot = (name) => new URL(`./${name}.png`, import.meta.url).pathname;

const browser = await webkit.launch();
const facts = {};
try {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
	const page = await context.newPage();
	await page.goto(APP);
	await page.evaluate(() => localStorage.clear());
	await page.reload();

	const active = () =>
		page.evaluate(() => {
			const el = document.activeElement;
			if (!el || el === document.body) return null;
			return (
				el.getAttribute('aria-label') ??
				(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
			);
		});

	// ── 1. The chrome control and its tooltip ────────────────────────────
	const reference = page.locator('header button', { hasText: 'Reference' });
	facts.tooltip = await reference.getAttribute('title');
	// The chrome header is the document's first <header>; the sheet's title
	// block is a <header> of its own further down.
	facts.isLastChromeControl = await page.evaluate(() => {
		const chrome = document.querySelector('header');
		const buttons = [...(chrome?.querySelectorAll('button') ?? [])];
		return buttons.at(-1)?.textContent?.trim() === 'Reference';
	});

	await reference.click();
	const dialog = page.locator('dialog[aria-labelledby="reference-title"]');
	facts.openedOnClick = await dialog.evaluate((d) => d.open);
	facts.title = await dialog.locator('h2').textContent();
	facts.isModal = await dialog.evaluate((d) => d.matches(':modal'));
	await page.screenshot({ path: shot('1-reference-dialog') });

	// ── 2. Contents verbatim ─────────────────────────────────────────────
	facts.clusters = await dialog.evaluate((d) =>
		[...d.querySelectorAll('section')].map((section) => ({
			title: section.querySelector('h3')?.textContent,
			rows: [...section.querySelectorAll('tr')].map((row) =>
				[...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim())
			)
		}))
	);
	const link = dialog.locator('a');
	facts.linkLine = (await dialog.locator('p').last().textContent())?.replace(/\s+/g, ' ').trim();
	facts.linkHref = await link.getAttribute('href');

	// ── 3. Focus trap, Esc, focus return ─────────────────────────────────
	// Trapped means focus never lands on a background element — WebKit may
	// park it on body/html between wraps inside a modal, which is not escape.
	let escaped = false;
	for (let i = 0; i < 12; i++) {
		await page.keyboard.press('Alt+Tab'); // WebKit walks all focusables with Option+Tab
		const onBackground = await page.evaluate(() => {
			const el = document.activeElement;
			if (!el || el === document.body || el === document.documentElement) return false;
			return !el.closest('dialog[aria-labelledby="reference-title"]');
		});
		if (onBackground) escaped = true;
	}
	facts.focusTrapped = !escaped;
	await page.keyboard.press('Escape');
	facts.closedOnEsc = await page.evaluate(
		() => !document.querySelector('dialog[aria-labelledby="reference-title"]')
	);
	facts.focusAfterEsc = await active();

	// ── 4. ⌘/ from a contenteditable field ───────────────────────────────
	const name = page.locator('[contenteditable][aria-label="Name"]');
	await name.click();
	await page.keyboard.type('Reference Canvas');
	await page.keyboard.press('Meta+/');
	facts.openedOnShortcutWhileEditing = await dialog.evaluate((d) => d.open).catch(() => false);
	await page.keyboard.press('Meta+/'); // must not stack a second dialog
	facts.dialogCount = await page.evaluate(
		() => document.querySelectorAll('dialog[aria-labelledby="reference-title"]').length
	);
	await page.keyboard.press('Escape');
	facts.focusAfterEscFromField = await active();

	// ── 5. Documented keys vs built behavior (Editing + App clusters) ────
	await page.keyboard.press('Enter'); // commit the name typed above
	facts.enterCommits =
		(await page.evaluate(() => JSON.parse(localStorage.getItem('bcc.autosave') ?? 'null')?.name)) ===
		'Reference Canvas';
	await name.click();
	await page.keyboard.press('Meta+ArrowRight'); // a center click lands mid-text
	await page.keyboard.type(' Scratch');
	await page.keyboard.press('Escape'); // revert the uncommitted edit
	facts.escReverts = (await name.textContent()) === 'Reference Canvas';
	await name.click();
	await page.keyboard.press('Meta+ArrowRight');
	await page.keyboard.type(' Two');
	await page.keyboard.press('Tab'); // commit and move on
	facts.tabCommits =
		(await page.evaluate(() => JSON.parse(localStorage.getItem('bcc.autosave') ?? 'null')?.name)) ===
		'Reference Canvas Two';
	await page.keyboard.press('Meta+z');
	facts.cmdZUndoes = (await name.textContent()) === 'Reference Canvas';
	await page.keyboard.press('Meta+Shift+z');
	facts.shiftCmdZRedoes = (await name.textContent()) === 'Reference Canvas Two';

	writeFileSync(new URL('./facts.json', import.meta.url), JSON.stringify(facts, null, 2));
	console.log(JSON.stringify(facts, null, 2));
} finally {
	await browser.close();
}
