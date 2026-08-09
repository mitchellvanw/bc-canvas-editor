// Ticket 06 smoke on Playwright WebKit: the structural chrome materializes on
// approach in a real browser — ghosts on panel hover, × on item hover, grip on
// lane hover — the message flow runs ghost → type popover → focused name, and
// real pointer drags reorder chips and lanes through one commit each.
import { writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:5173';
const shot = (name) => new URL(`./${name}.png`, import.meta.url).pathname;

const browser = await webkit.launch();
const facts = {};
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	page.on('console', (m) => console.log('[page]', m.text()));
	page.on('pageerror', (e) => console.log('[pageerror]', e.message));
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.evaluate(async () => {
		const { REFERENCE_FILE } = await import('/src/lib/model/reference.fixture.ts');
		localStorage.setItem('bcc.autosave', REFERENCE_FILE);
	});
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');

	const opacity = (locator) =>
		locator.evaluate((el) => getComputedStyle(el).opacity);

	// 1. Zero chrome at rest, ghost fades in on panel hover.
	const inbound = page.locator('.area-inbound');
	const laneGhost = inbound.locator('.panel__body > .ghost');
	facts.ghostAtRest = await opacity(laneGhost);
	await inbound.locator('.panel__body').hover();
	await page.waitForTimeout(250);
	facts.ghostOnPanelHover = await opacity(laneGhost);
	await page.screenshot({ path: shot('1-panel-hover'), clip: await inbound.boundingBox() });

	// 2. Chip × on chip hover, lane grip + × on lane hover.
	const firstChip = inbound.locator('.msg').first();
	await firstChip.hover();
	await page.waitForTimeout(250);
	facts.chipXOnHover = await opacity(firstChip.locator('.x'));
	facts.gripOnLaneHover = await opacity(inbound.locator('.grip').first());
	facts.laneXOnLaneHover = await opacity(inbound.locator('.lane__head .x').first());
	await page.screenshot({ path: shot('2-chip-hover'), clip: await inbound.boundingBox() });

	// 3. Message flow: ghost → type popover → focused empty name.
	await inbound.locator('[aria-label="Add message"]').click();
	await page.waitForSelector('.typepop');
	await page.screenshot({ path: shot('3-type-popover'), clip: await inbound.boundingBox() });
	await inbound.locator('.typepop [aria-label="command"]').click();
	await page.waitForTimeout(100);
	facts.newChipFocused = await page.evaluate(
		() => document.activeElement?.getAttribute('aria-label')
	);
	facts.chipCountAfterAdd = await inbound.locator('.msg').count();
	await page.keyboard.press('Escape'); // leave the empty name field

	// 4. Drag the first chip to the end of its lane by its glyph.
	const doc = () =>
		page.evaluate(async () => {
			const { canvas } = await import('/src/lib/editor/document.svelte.ts');
			return {
				inboundMessages: canvas.doc.inboundCommunication[0].messages.map((m) => m.name),
				inboundLanes: canvas.doc.inboundCommunication.map((l) => l.collaborator)
			};
		});
	facts.before = await doc();
	const from = await inbound.locator('.msg').first().boundingBox();
	const lastChip = await inbound.locator('.msg').last().boundingBox();
	await page.mouse.move(from.x + 8, from.y + 10);
	await page.mouse.down();
	await page.mouse.move(lastChip.x + lastChip.width + 20, lastChip.y + 10, { steps: 8 });
	await page.screenshot({ path: shot('4-chip-drag'), clip: await inbound.boundingBox() });
	await page.mouse.up();
	facts.afterChipDrag = await doc();

	// 5. Add a second lane, then drag the first lane below it by its grip.
	await inbound.locator('.panel__body > .ghost').click();
	await page.waitForTimeout(100);
	await page.keyboard.type('Billing');
	await page.keyboard.press('Enter');
	const grip = await inbound.locator('.grip').first().boundingBox();
	const secondLane = await inbound.locator('.lane').nth(1).boundingBox();
	await page.mouse.move(grip.x + 3, grip.y + 3);
	await page.mouse.down();
	await page.mouse.move(grip.x + 3, secondLane.y + secondLane.height - 4, { steps: 8 });
	await page.screenshot({ path: shot('5-lane-drag'), clip: await inbound.boundingBox() });
	await page.mouse.up();
	facts.afterLaneDrag = await doc();

	console.log(JSON.stringify(facts, null, 2));
} finally {
	await browser.close();
}
