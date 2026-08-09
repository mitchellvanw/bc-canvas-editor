// Ticket 10 checkpoint on Playwright WebKit: a brand-new canvas teaches in a
// real browser — every ghost question visible at rest (no hover), every empty
// field's placeholder italic and quiet, teaching gone the moment content
// exists and back the moment it's emptied, and none of the copy in the
// serialized file or the HTML artifact.
import { writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:5173';
const shot = (name) => new URL(`./${name}.png`, import.meta.url).pathname;

const QUESTIONS = [
	'+ trait — how does this context behave?',
	'+ collaborator — who sends this context commands, queries or events?',
	'+ collaborator — who consumes what this context emits?',
	'+ term — which words mean something precise here?',
	'+ decision — which rules does this context enforce?',
	'+ assumption — what are you taking to be true?',
	'+ metric — what would verify this design?',
	"+ question — what's still unresolved?"
];

const browser = await webkit.launch();
const facts = {};
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
	page.on('console', (m) => console.log('[page]', m.text()));
	page.on('pageerror', (e) => console.log('[pageerror]', e.message));

	// A brand-new canvas: no autosave slot at all.
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.evaluate(() => localStorage.clear());
	await page.goto(APP, { waitUntil: 'networkidle' });
	await page.waitForSelector('h1');

	// 1. Every ghost question rendered and visible at rest — pointer parked on
	// the title bar, nothing hovered.
	await page.mouse.move(2, 2);
	await page.waitForTimeout(300);
	facts.ghostsAtRest = {};
	for (const q of QUESTIONS) {
		const ghost = page.locator('.ghost', { hasText: q.replace('+ ', '') }).first();
		const visible = await ghost.evaluate((el) => getComputedStyle(el).opacity);
		facts.ghostsAtRest[q] = visible;
	}

	// 2. Placeholders: italic, quiet, present on name and description.
	const nameField = page.locator('[contenteditable][aria-label="Name"]');
	facts.namePlaceholder = await nameField.evaluate((el) => ({
		text: getComputedStyle(el, '::before').content,
		fontStyle: getComputedStyle(el, '::before').fontStyle,
		opacity: getComputedStyle(el, '::before').opacity
	}));
	const desc = page.locator('[contenteditable][aria-label="Description"]');
	facts.descriptionPlaceholder = await desc.evaluate((el) => ({
		text: getComputedStyle(el, '::before').content,
		fontStyle: getComputedStyle(el, '::before').fontStyle
	}));
	facts.classificationValues = await page
		.locator('header dl dd')
		.allTextContents()
		.then((t) => t.map((s) => s.trim()));
	await page.screenshot({ path: shot('1-new-canvas'), fullPage: true });

	// 3. Typing replaces a placeholder instantly (no commit needed).
	await nameField.click();
	await page.keyboard.type('Order');
	facts.namePlaceholderWhileTyping = await nameField.evaluate(
		(el) => getComputedStyle(el, '::before').content
	);
	await page.keyboard.press('Escape'); // revert — keep the canvas byte-blank

	// 4. First item collapses the ghost to its terse label; ghost goes back to
	// hover-materialized; deleting the last item restores the visible question.
	const inbound = page.locator('.area-inbound');
	const inboundQ = QUESTIONS[1];
	await inbound.locator('.ghost', { hasText: 'collaborator' }).click();
	await page.waitForTimeout(100);
	const terse = inbound.locator('.panel__body > .ghost');
	facts.terseLabel = (await terse.textContent()).trim();
	await page.mouse.move(2, 2);
	await page.keyboard.press('Escape');
	await page.evaluate(() => document.activeElement?.blur());
	await page.waitForTimeout(300);
	facts.terseGhostAtRest = await terse.evaluate((el) => getComputedStyle(el).opacity);
	await page.screenshot({ path: shot('2-first-item'), clip: await inbound.boundingBox() });

	await inbound.locator('.lane').hover();
	await inbound.locator('.lane__head .x').click();
	await page.mouse.move(2, 2);
	await page.waitForTimeout(300);
	facts.questionRestored = (await inbound.locator('.panel__body > .ghost').textContent()).trim();
	facts.restoredGhostAtRest = await inbound
		.locator('.panel__body > .ghost')
		.evaluate((el) => getComputedStyle(el).opacity);
	await page.screenshot({ path: shot('3-question-back'), clip: await inbound.boundingBox() });

	// 5. Nothing teaching-flavored reaches the file or the HTML artifact.
	const guard = await page.evaluate(async () => {
		const { canvas } = await import('/src/lib/editor/document.svelte.ts');
		const { serializeCanvas } = await import('/src/lib/model/serialize.ts');
		const { buildHtmlArtifact } = await import('/src/lib/artifact/html.ts');
		const file = serializeCanvas(canvas.doc);
		const html = await buildHtmlArtifact(canvas.doc);
		const leak = (s) =>
			['does this context', 'What it means here', 'still unresolved'].filter((needle) =>
				s.includes(needle)
			);
		// data-placeholder may appear inside the inlined stylesheet as a dead
		// selector — what must not exist is the attribute on any element, or
		// teaching copy in the rendered text.
		const artifactDom = new DOMParser().parseFromString(html, 'text/html');
		return {
			fileLeaks: leak(file),
			artifactTextLeaks: leak(artifactDom.body.textContent ?? ''),
			artifactPlaceholderEls: artifactDom.querySelectorAll(
				'[data-placeholder], [contenteditable], button'
			).length,
			fileBytes: file.length
		};
	});
	facts.guard = guard;

	console.log(JSON.stringify(facts, null, 2));
} finally {
	await browser.close();
}
writeFileSync(new URL('./facts.json', import.meta.url).pathname, JSON.stringify(facts, null, 2));
