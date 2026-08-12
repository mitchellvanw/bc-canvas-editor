// Views checkpoint, part 5's Copy leg, in Chromium.
//
// Headless WebKit refuses `navigator.clipboard.writeText` outright, so the
// WebKit run only proved that pressing Copy leaves Unexported changes standing
// — not that a *successful* copy does. Chromium can be granted clipboard
// permission, so this run reads the clipboard back and checks three things at
// once: the bytes copied are the panel's own, the app announced it, and the
// dirty indicator did not move.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const APP = 'http://localhost:4173/';

const fail = (msg) => {
	throw new Error(msg);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP });
const page = await context.newPage();
await page.goto(APP, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('h1');

// An example, then one sheet edit so Unexported changes is standing.
await page.getByRole('button', { name: 'Examples' }).click();
await page.getByRole('menuitem').nth(1).click();
await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Notifications'));
await page.locator('[aria-label="Purpose"]').click();
await page.keyboard.insertText(' Edited.');
await page.locator('h1').click();
await page.waitForTimeout(200);

const dirty = () => page.evaluate(() => document.body.textContent.includes('Unexported changes'));
const announced = () =>
	page.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim() ?? '');
const clipboard = () => page.evaluate(() => navigator.clipboard.readText());

if (!(await dirty())) fail('the sheet edit did not raise Unexported changes');

const facts = {};

await page.click('#tab-json');
const boxText = await page.inputValue('textarea[aria-label="Canvas file JSON"]');
await page.click('button:has-text("Copy")');
await page.waitForTimeout(250);
facts.json = {
	announced: await announced(),
	clipboardMatchesPanel: (await clipboard()) === boxText,
	dirtyAfter: await dirty()
};

await page.click('#tab-markdown');
const paneText = await page.locator('#panel-markdown pre, pre').first().textContent();
await page.click('button:has-text("Copy")');
await page.waitForTimeout(250);
facts.markdown = {
	announced: await announced(),
	clipboardMatchesPanel: (await clipboard()) === paneText,
	dirtyAfter: await dirty()
};

writeFileSync(OUT + 'part5-copy-chromium.json', JSON.stringify(facts, null, '\t') + '\n');
console.log(JSON.stringify(facts, null, '\t'));
await browser.close();

if (facts.json.announced !== 'JSON copied' && facts.json.announced !== 'JSON copied ')
	fail(`the JSON copy did not announce: "${facts.json.announced}"`);
if (facts.markdown.announced.trim() !== 'Markdown copied')
	fail(`the Markdown copy did not announce: "${facts.markdown.announced}"`);
if (!facts.json.clipboardMatchesPanel) fail('the JSON copy put something else on the clipboard');
if (!facts.markdown.clipboardMatchesPanel)
	fail('the Markdown copy put something else on the clipboard');
if (!facts.json.dirtyAfter || !facts.markdown.dirtyAfter)
	fail('a successful Copy cleared Unexported changes');
console.log('\npart 5 Copy leg green — both copies land, neither clears the indicator');
