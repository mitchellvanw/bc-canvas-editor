// Ticket 023 pre-commit smoke on Playwright WebKit against the production
// build (`vite preview`): the Examples menu opens, an example lands clean,
// the gate fires over unexported changes, and Esc restores focus.
import { writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:4173';
const SHOTS = new URL('./', import.meta.url).pathname;

const browser = await webkit.launch();
const fail = (msg) => {
	throw new Error(msg);
};
try {
	const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
	await page.goto(APP, { waitUntil: 'networkidle' });

	// Menu opens with the four two-line entries.
	await page.getByRole('button', { name: 'Examples' }).click();
	const items = page.getByRole('menuitem');
	if ((await items.count()) !== 4) fail(`expected 4 menu items, got ${await items.count()}`);
	const first = (await items.first().textContent()) ?? '';
	if (!first.includes('Order Fulfillment') || !first.includes('picking, packing'))
		fail(`first entry wrong: ${first}`);
	const last = (await items.last().textContent()) ?? '';
	if (!last.includes('Captured mid-workshop.')) fail(`mid-workshop flag missing: ${last}`);
	writeFileSync(`${SHOTS}smoke-menu-open.png`, await page.screenshot());

	// Opening lands clean: sheet renamed, no Unexported changes, no gate.
	await items.first().click();
	await page.waitForSelector('h1');
	const h1 = await page.locator('h1').first().textContent();
	if (!h1?.includes('Order Fulfillment')) fail(`sheet not replaced: ${h1}`);
	if (await page.getByText('Unexported changes').isVisible().catch(() => false))
		fail('example landed dirty');
	writeFileSync(`${SHOTS}smoke-loaded-clean.png`, await page.screenshot());

	// First edit dirties; choosing another example now hits the Replace gate.
	await page.locator('h1').click();
	await page.keyboard.type(' Draft');
	await page.keyboard.press('Tab');
	await page.getByText('Unexported changes').waitFor();
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').nth(1).click();
	const gate = page.locator('dialog[open]');
	const gateText = ((await gate.textContent()) ?? '').replace(/\s+/g, ' ');
	if (!gateText.includes('Opening an example replaces the canvas and clears undo history.'))
		fail(`gate copy wrong: ${gateText}`);
	writeFileSync(`${SHOTS}smoke-gate.png`, await page.screenshot());
	await gate.getByRole('button', { name: 'Replace' }).click();
	await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Notifications'));

	// Keyboard path: focus the control, Enter opens, Tab reaches an entry,
	// Esc closes and returns focus (WebKit never focuses buttons on click).
	await page.getByRole('button', { name: 'Examples' }).focus();
	await page.keyboard.press('Enter');
	await page.keyboard.press('Alt+Tab');
	await page.keyboard.press('Escape');
	if ((await page.getByRole('menuitem').count()) !== 0) fail('Esc left the menu open');
	const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
	if (focused !== 'Examples') fail(`focus after Esc on: ${focused}`);

	console.log('WebKit smoke: all green');
} finally {
	await browser.close();
}
