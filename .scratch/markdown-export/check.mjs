// Markdown export (wayfinder ticket 046) on Playwright WebKit — the one part
// the jsdom suite cannot reach, because it mocks `downloadBlob`: the real
// anchor-click download out of a Blob, in the engine that has historically
// been awkward about it (src/lib/artifact/download.ts).
//
// Checks, against the dev server with an example open:
// 1. Export → Markdown downloads `order-fulfillment.bcc.md`.
// 2. Its bytes are the Markdown View's bytes, character for character.
// 3. Unexported changes is still standing afterwards (SPEC §6.1).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:5179/', { waitUntil: 'networkidle' });

const menuItem = (label) => page.locator(`[role="menuitem"]`, { hasText: label });

// Open an example, then dirty it, so the indicator is up when we export.
await page.getByRole('button', { name: 'Examples' }).click();
await page.locator('[role="menuitem"]').first().click();
await page.locator('h1').first().click();
await page.keyboard.type(' (edited)');
await page.locator('body').click();
await page.waitForSelector('text=Unexported changes');

// The Markdown View's bytes, straight off the pane.
await page.getByRole('tab', { name: 'Markdown' }).click();
const paneText = await page.locator('pre').first().innerText();
await page.getByRole('tab', { name: 'Sheet' }).click();

await page.getByRole('button', { name: 'Export' }).click();
const labels = await page.locator('[role="menuitem"]').allInnerTexts();
await page.screenshot({ path: `${OUT}export-menu.png`, clip: { x: 830, y: 0, width: 670, height: 220 } });
const download = await Promise.all([
	page.waitForEvent('download'),
	menuItem('Markdown (.bcc.md)').click()
]).then(([d]) => d);

const path = `${OUT}downloaded.bcc.md`;
await download.saveAs(path);
const bytes = readFileSync(path, 'utf8');
const stillDirty = await page.locator('text=Unexported changes').isVisible();
await page.screenshot({ path: `${OUT}after-export.png` });

// innerText collapses the pane's trailing newline; compare on that footing.
const paneMatches = bytes.trimEnd() === paneText.trimEnd() && bytes.endsWith('\n');

const report = {
	menuLabels: labels,
	suggestedFilename: download.suggestedFilename(),
	bytesMatchThePane: paneMatches,
	endsWithNewline: bytes.endsWith('\n'),
	firstLine: bytes.slice(0, bytes.indexOf('\n')),
	length: bytes.length,
	unexportedStillShowing: stillDirty
};
writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(report);

await browser.close();

const ok =
	report.suggestedFilename === 'order-fulfillment-edited.bcc.md' &&
	paneMatches &&
	stillDirty &&
	labels.at(-1).trim() === 'Markdown (.bcc.md)';
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
