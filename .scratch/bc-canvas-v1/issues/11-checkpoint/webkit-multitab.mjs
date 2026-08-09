// Ticket 11 checkpoint on Playwright WebKit: the unload flush and the
// multi-tab notice in a real browser. Facts gathered:
//   1. Type into a field, close the tab without blurring, reopen → restored.
//   2. Backgrounding (visibilitychange → hidden) flushes the mid-edit field
//      to the autosave slot without blurring it.
//   3. A second tab surfaces the persistent SPEC §10 notice in BOTH tabs.
//   4. No locking: both tabs stay editable; last write wins on the slot.
import { writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:5173';
const NOTICE =
	'This canvas is open in another tab. Whichever tab edits last overwrites the other — close one of them.';
const shot = (name) => new URL(`./${name}.png`, import.meta.url).pathname;
const bannerText = (page) =>
	page
		.locator('[role="note"]')
		.textContent()
		.then((t) => t?.replace(/\s+/g, ' ').trim());

const browser = await webkit.launch();
const facts = {};
try {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });

	// ── 1. Unload flush: type, close the tab mid-edit, reopen ──
	let page = await context.newPage();
	await page.goto(APP);
	await page.locator('[aria-label="Name"][contenteditable]').click();
	await page.keyboard.type('Order Fulfillment');
	// No blur, no Enter — the caret is still in the field.
	await page.close({ runBeforeUnload: true });

	page = await context.newPage();
	await page.goto(APP);
	facts.reopenedName = await page.locator('[aria-label="Name"][contenteditable]').textContent();

	// ── 2. visibilitychange flush: background the tab mid-edit ──
	await page.locator('[aria-label="Description"][contenteditable]').click();
	await page.keyboard.type('Owns order intake through handover to fulfillment.');
	const flushed = await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', {
			value: 'hidden',
			configurable: true
		});
		document.dispatchEvent(new Event('visibilitychange'));
		Object.defineProperty(document, 'visibilityState', {
			value: 'visible',
			configurable: true
		});
		const slot = JSON.parse(localStorage.getItem('bcc.autosave') ?? '{}');
		return {
			description: slot.description,
			stillFocused: document.activeElement?.getAttribute('aria-label') ?? null
		};
	});
	facts.visibilityFlush = flushed;

	// ── 3. Second tab: persistent notice in both tabs ──
	facts.bannerBeforeSecondTab = await page.locator('[role="note"]').count();
	const second = await context.newPage();
	await second.goto(APP);
	await page.locator('[role="note"]').waitFor({ timeout: 5000 });
	await second.locator('[role="note"]').waitFor({ timeout: 5000 });
	facts.noticeFirstTab = await bannerText(page);
	facts.noticeSecondTab = await bannerText(second);
	facts.noticeVerbatim = facts.noticeFirstTab === NOTICE && facts.noticeSecondTab === NOTICE;
	await page.screenshot({ path: shot('1-notice-first-tab'), fullPage: false });
	await second.screenshot({ path: shot('2-notice-second-tab'), fullPage: false });

	// ── 4. No locking, last write wins ──
	const nameField = (p) => p.locator('[aria-label="Name"][contenteditable]');
	await nameField(page).click();
	await page.keyboard.type(' — tab A');
	await page.keyboard.press('Enter');
	await nameField(second).click();
	await second.keyboard.press('Meta+a');
	await second.keyboard.type('Order Fulfillment — tab B');
	await second.keyboard.press('Enter');
	facts.slotAfterBothEdit = JSON.parse(
		await second.evaluate(() => localStorage.getItem('bcc.autosave'))
	).name;
	facts.bothEditable = true;

	console.log(JSON.stringify(facts, null, 2));
} finally {
	await browser.close();
}
writeFileSync(new URL('./facts.json', import.meta.url).pathname, JSON.stringify(facts, null, 2));
