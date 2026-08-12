// Live look at the three editor Views (wayfinder ticket 045), on Playwright
// WebKit against a *production* build — safaridriver stays admin-gated, so
// WebKit via Playwright is this project's habit.
//
// What this is for: the switcher in situ with the real chrome at every
// responsive tier (the chrome-resemblance risk bites hardest where the chrome
// wraps), the two text panes, and the three states of the JSON View that only
// exist while something is wrong or pending — the marker, the moved-canvas
// line, and a refusal carrying the parser's own detail.
import { mkdirSync } from 'node:fs';
import { webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
const APP = 'http://localhost:5179/';
mkdirSync(OUT, { recursive: true });

// The gutters are px-10 (40px) each side at lg, so page width ≈ container + 80.
const TIERS = [
	{ name: '1-canonical', width: 1440, height: 1500 },
	{ name: '2-trim', width: 1080, height: 1500 },
	{ name: '3-two-col', width: 900, height: 1900 },
	{ name: '4-stack', width: 660, height: 2600 }
];

const browser = await webkit.launch();

async function openExample(page) {
	// The chrome hydrates before it answers clicks; give it a beat.
	await page.waitForTimeout(400);
	await page.getByRole('button', { name: 'Examples' }).click();
	await page.getByRole('menuitem').first().click({ timeout: 5000 });
	await page.waitForTimeout(200);
}

/** Replace the JSON box's contents the way a paste does. */
async function paste(page, text) {
	await page.locator('textarea').fill(text);
	await page.waitForTimeout(120);
}

for (const tier of TIERS) {
	const page = await browser.newPage({
		viewport: { width: tier.width, height: tier.height },
		deviceScaleFactor: 2
	});
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	await openExample(page);

	await page.screenshot({ path: `${OUT}${tier.name}-sheet.png` });
	// The band the risk lives in: chrome and pill together, cropped.
	await page
		.locator('body')
		.screenshot({ path: `${OUT}${tier.name}-band.png`, clip: { x: 0, y: 0, width: tier.width, height: 170 } });
	await page.close();
}

const page = await browser.newPage({ viewport: { width: 1440, height: 1500 }, deviceScaleFactor: 2 });
await page.goto(APP, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await openExample(page);

for (const view of ['JSON', 'Markdown']) {
	await page.getByRole('tab', { name: view, exact: true }).click();
	await page.waitForTimeout(150);
	await page.screenshot({ path: `${OUT}view-${view.toLowerCase()}.png` });
}

// The keyboard path: focus the selected tab, arrow across, ring on the pill.
await page.getByRole('tab', { name: 'Sheet' }).click();
await page.evaluate(() => document.querySelector('[role="tab"][aria-selected="true"]')?.focus());
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
await page.locator('[role="tablist"]').screenshot({ path: `${OUT}focus-ring.png` });

// The unapplied marker: one keystroke of disagreement.
const canonical = await page.locator('textarea').inputValue();
await paste(page, canonical.replace('Order Fulfillment', 'Order Fulfilment'));
await page.locator('[role="tablist"]').screenshot({ path: `${OUT}marker.png` });

// The canvas moving under a live proposal — undo/redo on the sheet is enough.
await page.getByRole('tab', { name: 'Sheet' }).click();
await page.getByRole('textbox', { name: 'Purpose' }).click();
await page.keyboard.type(' Edited after the proposal was written.');
// The marker is in the accessible name by now, so match on the prefix.
await page.getByRole('tab', { name: /^JSON/ }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}moved-line.png` });

// A refusal, with the parser's clause where the offending bytes are.
await paste(page, canonical.replace('"command"', '"notification"'));
await page.getByRole('button', { name: 'Apply' }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}refusal-shape.png` });

// Malformed JSON: WebKit's engine message, which carries no position at all.
await paste(page, canonical.replace('{', '{,'));
await page.getByRole('button', { name: 'Apply' }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}refusal-malformed.png` });
console.log(
	'malformed detail:',
	await page.locator('[role="note"] span').textContent()
);

// A v1 paste comes back migrated, in the box.
await paste(
	page,
	JSON.stringify(
		{
			version: 1,
			name: 'From an older export',
			description: 'Written before the v2 format existed.',
			strategicClassification: {},
			domainRoles: [],
			inboundCommunication: [],
			ubiquitousLanguage: [],
			businessDecisions: [],
			outboundCommunication: [],
			assumptions: [],
			verificationMetrics: [],
			openQuestions: []
		},
		null,
		2
	)
);
await page.getByRole('button', { name: 'Apply' }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}migrated.png` });

// And what a nearly-empty canvas reads like as Markdown — the map's open fog.
await page.getByRole('tab', { name: 'Markdown', exact: true }).click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}markdown-nearly-empty.png` });
console.log('nearly-empty markdown:\n' + (await page.locator('pre').textContent()));

await browser.close();
console.log('shots written to', OUT);
