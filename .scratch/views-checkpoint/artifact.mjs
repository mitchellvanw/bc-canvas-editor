// Views checkpoint, part 4 (wayfinder ticket 048): the exported artifact with
// JavaScript switched off and switched on, in WebKit *and* Chromium.
//
// The script-less pass is the load-bearing one: an artifact is a file someone
// else opens, and the panels must be present, readable and in reading order
// with nothing but the markup. The script-on pass checks the enhancement it
// buys — real tab semantics, arrows, a visible focus ring — and that print
// still shows the Sheet alone whichever tab is live.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// The artifact under test is the one part 1 exported from the shipped build.
const ARTIFACT = join(OUT, 'triangle', 'artifact-order-fulfillment.bcc.html');
const URL_ = 'file://' + ARTIFACT;
const SIZE = readFileSync(ARTIFACT).length;

// Collected rather than thrown: the gate wants the whole defect list in one
// pass, not the first one.
const defects = [];
const fail = (msg) => {
	defects.push(msg);
	console.error('DEFECT: ' + msg);
};
const facts = { artifact: 'order-fulfillment.bcc.html', bytes: SIZE, engines: {} };

const LABELS = ['Sheet', 'JSON', 'Markdown'];
const IDS = ['view-panel-sheet', 'view-panel-json', 'view-panel-markdown'];

for (const [engineName, engine] of [
	['webkit', webkit],
	['chromium', chromium]
]) {
	const browser = await engine.launch();
	const engineFacts = {};

	// ── script off ────────────────────────────────────────────────────────────
	{
		const context = await browser.newContext({
			javaScriptEnabled: false,
			viewport: { width: 1200, height: 900 }
		});
		const page = await context.newPage();
		await page.goto(URL_);

		const seen = await page.evaluate(() => {
			const panels = [...document.querySelectorAll('.views__panel')];
			const visible = (el) => {
				const rect = el.getBoundingClientRect();
				const style = getComputedStyle(el);
				return (
					rect.width > 0 &&
					rect.height > 0 &&
					style.display !== 'none' &&
					style.visibility !== 'hidden' &&
					!el.hidden &&
					!el.classList.contains('views__panel--off')
				);
			};
			const strip = document.querySelector('[role="tablist"]');
			return {
				order: panels.map((p) => p.id),
				visible: panels.map(visible),
				headings: panels.map(
					(p) => p.querySelector('.views__heading')?.textContent?.trim() ?? null
				),
				roles: panels.map((p) => p.getAttribute('role')),
				ariaLabels: panels.map((p) => p.getAttribute('aria-label')),
				textLengths: panels.map((p) => p.textContent.trim().length),
				stripHidden: strip?.hasAttribute('hidden') ?? null,
				stripBox: strip ? strip.getBoundingClientRect().height : null,
				// The gap the strip would have left behind if it had a wrapper.
				firstPanelTop: panels[0].getBoundingClientRect().top,
				enhancedClass: document
					.querySelector('[data-canvas-views]')
					.className.includes('views--enhanced')
			};
		});
		engineFacts.scriptOff = seen;

		if (seen.order.join(',') !== IDS.join(','))
			fail(`${engineName}: panels are not in reading order — ${seen.order}`);
		if (seen.visible.some((v) => !v))
			fail(`${engineName}: a panel is not visible with script off — ${JSON.stringify(seen.visible)}`);
		if (seen.headings.join('|') !== LABELS.join('|'))
			fail(`${engineName}: panel headings are wrong — ${seen.headings}`);
		if (seen.roles.some((r) => r !== null))
			fail(`${engineName}: a panel claims a role with no live tablist — ${seen.roles}`);
		if (seen.ariaLabels.join('|') !== LABELS.join('|'))
			fail(`${engineName}: panels lost their region labels — ${seen.ariaLabels}`);
		if (seen.textLengths.some((n) => n < 200))
			fail(`${engineName}: a panel is empty — ${seen.textLengths}`);
		if (seen.stripHidden !== true) fail(`${engineName}: the strip is not hidden with script off`);
		if (seen.stripBox !== 0) fail(`${engineName}: the hidden strip still occupies ${seen.stripBox}px`);
		if (seen.enhancedClass) fail(`${engineName}: the enhanced class is on with script off`);

		await page.screenshot({ path: `${OUT}artifact-${engineName}-nojs-top.png` });
		await page.screenshot({ path: `${OUT}artifact-${engineName}-nojs-full.png`, fullPage: true });
		await context.close();
	}

	// ── script on ─────────────────────────────────────────────────────────────
	{
		const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
		const page = await context.newPage();
		await page.goto(URL_);
		await page.waitForSelector('[role="tablist"]:not([hidden])');

		const shown = () =>
			page.evaluate(() => {
				const panels = [...document.querySelectorAll('.views__panel')];
				const tabs = [...document.querySelectorAll('[role="tab"]')];
				return {
					visible: panels.map((p) => getComputedStyle(p).display !== 'none'),
					offClass: panels.map((p) => p.classList.contains('views__panel--off')),
					hiddenAttr: panels.map((p) => p.hasAttribute('hidden')),
					selected: tabs.map((t) => t.getAttribute('aria-selected')),
					tabindex: tabs.map((t) => t.tabIndex),
					roles: panels.map((p) => p.getAttribute('role')),
					labelledby: panels.map((p) => p.getAttribute('aria-labelledby')),
					focused: document.activeElement?.id ?? null
				};
			});

		engineFacts.scriptOnRest = await shown();
		if (engineFacts.scriptOnRest.visible.join(',') !== 'true,false,false')
			fail(`${engineName}: script-on rest state is not Sheet alone — ${engineFacts.scriptOnRest.visible}`);
		if (engineFacts.scriptOnRest.roles.some((r) => r !== 'tabpanel'))
			fail(`${engineName}: panels did not become tabpanels`);

		await page.click('#view-tab-markdown');
		engineFacts.afterClickMarkdown = await shown();
		if (engineFacts.afterClickMarkdown.visible.join(',') !== 'false,false,true')
			fail(`${engineName}: clicking Markdown did not switch panels`);
		await page.screenshot({ path: `${OUT}artifact-${engineName}-tab-markdown.png` });

		// Arrows: one tab stop, focus follows selection.
		await page.click('#view-tab-sheet');
		await page.focus('#view-tab-sheet');
		await page.keyboard.press('ArrowRight');
		engineFacts.afterArrowRight = await shown();
		await page.keyboard.press('ArrowLeft');
		engineFacts.afterArrowLeft = await shown();
		await page.keyboard.press('End');
		engineFacts.afterEnd = await shown();
		if (engineFacts.afterArrowRight.focused !== 'view-tab-json')
			fail(`${engineName}: ArrowRight did not move focus — ${engineFacts.afterArrowRight.focused}`);
		if (engineFacts.afterArrowRight.visible.join(',') !== 'false,true,false')
			fail(`${engineName}: ArrowRight did not select the JSON panel`);
		if (engineFacts.afterArrowLeft.focused !== 'view-tab-sheet')
			fail(`${engineName}: ArrowLeft did not come back`);
		if (engineFacts.afterEnd.focused !== 'view-tab-markdown')
			fail(`${engineName}: End did not reach the last tab`);

		// Tab order and the focus ring, on a page loaded for the purpose: a
		// mid-page blur() leaves the sequential-focus starting point where it
		// was, so Tab from there walks *past* the strip. Only a fresh load
		// starts the walk at the top of the document, which is the thing worth
		// checking anyway.
		{
			const fresh = await context.newPage();
			await fresh.goto(URL_);
			await fresh.waitForSelector('[role="tablist"]:not([hidden])');
			const strip = fresh.locator('[role="tablist"]');
			const before = await strip.screenshot();
			await fresh.keyboard.press('Tab');
			const focusedShot = await strip.screenshot();
			engineFacts.firstTabStop = await fresh.evaluate(() => document.activeElement?.id ?? null);
			engineFacts.focusRing = {
				focused: engineFacts.firstTabStop,
				pixelsDiffer: !before.equals(focusedShot),
				outline: await fresh.evaluate(() => {
					const style = getComputedStyle(document.activeElement);
					return {
						outline: `${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}`,
						offset: style.outlineOffset
					};
				})
			};
			await fresh.keyboard.press('Tab');
			engineFacts.secondTabStop = await fresh.evaluate(() => document.activeElement?.id ?? null);
			writeFileSync(`${OUT}artifact-${engineName}-strip-unfocused.png`, before);
			writeFileSync(`${OUT}artifact-${engineName}-strip-focused.png`, focusedShot);
			if (engineFacts.firstTabStop !== 'view-tab-sheet')
				fail(`${engineName}: the first Tab does not reach the strip — ${engineFacts.firstTabStop}`);
			if (!engineFacts.focusRing.pixelsDiffer)
				fail(`${engineName}: keyboard focus paints nothing on the strip`);
			if (engineFacts.secondTabStop === 'view-tab-json')
				fail(`${engineName}: the strip is more than one tab stop`);
			await fresh.close();
		}

		// Print: the Sheet alone, from the Markdown tab.
		await page.click('#view-tab-markdown');
		await page.emulateMedia({ media: 'print' });
		engineFacts.print = await page.evaluate(() => {
			const display = (id) => getComputedStyle(document.getElementById(id)).display;
			return {
				sheet: display('view-panel-sheet'),
				json: display('view-panel-json'),
				markdown: display('view-panel-markdown'),
				strip: getComputedStyle(document.querySelector('[role="tablist"]')).display,
				headings: [...document.querySelectorAll('.views__heading')].map(
					(h) => getComputedStyle(h).display
				)
			};
		});
		if (
			engineFacts.print.sheet !== 'block' ||
			engineFacts.print.json !== 'none' ||
			engineFacts.print.markdown !== 'none' ||
			engineFacts.print.strip !== 'none'
		)
			fail(`${engineName}: print does not show the Sheet alone — ${JSON.stringify(engineFacts.print)}`);
		await page.screenshot({ path: `${OUT}artifact-${engineName}-print.png`, fullPage: true });
		await page.emulateMedia({ media: 'screen' });
		await context.close();
	}

	await browser.close();
	facts.engines[engineName] = engineFacts;
}

facts.defects = defects;
writeFileSync(OUT + 'part4-artifact.json', JSON.stringify(facts, null, '\t') + '\n');
console.log(JSON.stringify(facts, null, '\t'));
if (defects.length > 0) {
	console.log(`\npart 4 RED — ${defects.length} defect(s):`);
	for (const d of defects) console.log('  · ' + d);
	process.exitCode = 1;
} else {
	console.log('\npart 4 green in WebKit and Chromium');
}
