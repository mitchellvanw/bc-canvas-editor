// PROTOTYPE smoke — WebKit pass over the three chooser variants: open each
// control, screenshot it, load an example, and exercise the confirmation gate.
// Run from the repo root (playwright-core lives in the root node_modules):
//   node .claude/worktrees/prototype-example-chooser/prototype/example-chooser/webkit-smoke.mjs
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:5175';
const OUT = new URL('./shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await webkit.launch();
const failures = [];
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));

	// --- Variant 1: Examples menu ---
	await page.goto(`${APP}/?variant=1`, { waitUntil: 'networkidle' });
	await page.evaluate(() => localStorage.clear());
	await page.reload({ waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.screenshot({ path: `${OUT}v1-menu-open.png` });
	await page.getByRole('menuitem', { name: /Appointment Scheduling/ }).click();
	await page.waitForTimeout(200);
	const v1name = await page.locator('h1').textContent();
	if (!v1name?.includes('Appointment Scheduling')) failures.push(`v1 load: h1 is "${v1name}"`);
	await page.screenshot({ path: `${OUT}v1-loaded.png` });

	// Dirty the sheet, then the gate must appear before Royalty Distribution loads.
	await page.locator('h1').click();
	await page.keyboard.type(' X');
	await page.keyboard.press('Tab');
	await page.waitForTimeout(200);
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem', { name: /Royalty Distribution/ }).click();
	await page.waitForSelector('dialog[open]');
	await page.screenshot({ path: `${OUT}v1-confirm-gate.png` });
	await page.getByRole('button', { name: 'Replace', exact: true }).click();
	await page.waitForTimeout(200);
	const v1b = await page.locator('h1').textContent();
	if (!v1b?.includes('Royalty Distribution')) failures.push(`v1 gate: h1 is "${v1b}"`);

	// --- Variant 2: Examples dialog ---
	await page.goto(`${APP}/?variant=2`, { waitUntil: 'networkidle' });
	await page.evaluate(() => localStorage.clear());
	await page.reload({ waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.waitForSelector('dialog[open]');
	await page.screenshot({ path: `${OUT}v2-dialog-open.png` });
	await page.getByRole('button', { name: /Notifications/ }).click();
	await page.waitForTimeout(200);
	const v2name = await page.locator('h1').textContent();
	if (!v2name?.includes('Notifications')) failures.push(`v2 load: h1 is "${v2name}"`);
	await page.screenshot({ path: `${OUT}v2-loaded.png` });

	// --- Variant 3: New canvas menu ---
	await page.goto(`${APP}/?variant=3`, { waitUntil: 'networkidle' });
	await page.evaluate(() => localStorage.clear());
	await page.reload({ waitUntil: 'networkidle' });
	await page.getByRole('button', { name: 'New canvas' }).click();
	await page.screenshot({ path: `${OUT}v3-menu-open.png` });
	await page.getByRole('menuitem', { name: /Order Fulfillment/ }).click();
	await page.waitForTimeout(200);
	const v3name = await page.locator('h1').textContent();
	if (!v3name?.includes('Order Fulfillment')) failures.push(`v3 load: h1 is "${v3name}"`);
	await page.screenshot({ path: `${OUT}v3-loaded.png` });

	// Blank canvas still one menu-click away.
	await page.getByRole('button', { name: 'New canvas' }).click();
	await page.getByRole('menuitem', { name: 'Blank canvas' }).click();
	await page.waitForTimeout(200);
	const blank = await page.locator('h1').textContent();
	if (blank?.trim() !== '') failures.push(`v3 blank: h1 is "${blank}"`);
} finally {
	await browser.close();
}

if (failures.length) {
	console.error('SMOKE FAILURES:\n' + failures.join('\n'));
	process.exit(1);
}
console.log('smoke ok — shots in', OUT);
