// Ticket 12 checkpoint on Playwright WebKit: full keyboard operability and
// the assistive-tech surface in a real browser. Facts gathered:
//   1. A canvas is built keyboard-only: name, trait via the checklist,
//      collaborator lanes, typed message chips through the type popover.
//   2. Reordered keyboard-only: Alt+←/→ chip within lane, Alt+↑/↓ lane —
//      focus stays on the moved item; and emptied via Delete on ×/containers.
//   3. Focus reveals what hover reveals; the revealed × is the next stops
//      inside its chip; ghosts rest visible at 1 while the panel holds focus.
//   4. §8.4: keyboard-focused field carries the 2px ring, pointer-focused
//      the hairline; reduced-motion kills the reveal transition.
//   5. §8.5: textbox roles with identity names, native list structures,
//      type-led chip names; the polite live region speaks the §10 strings
//      and stays silent on field-blur commits.
import { writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const APP = 'http://localhost:5173';
const shot = (name) => new URL(`./${name}.png`, import.meta.url).pathname;

const browser = await webkit.launch();
const facts = {};
try {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
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
				(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) ??
				el.tagName
			);
		});
	const liveRegion = () =>
		page.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim() ?? '');
	// WebKit walks every focusable with Option+Tab (bare Tab visits only
	// text-entry targets — Safari's platform convention, not an app defect).
	const tabUntil = async (want, max = 60) => {
		for (let i = 0; i < max; i++) {
			await page.keyboard.press('Alt+Tab');
			const now = await active();
			if (now && now.startsWith(want)) return now;
		}
		throw new Error(`never reached "${want}" by Tab`);
	};

	// The one linear sequence (SPEC §8.1): record the bare-sheet walk.
	// Hydration must finish first — the editable action makes fields tabbable.
	await page.waitForSelector('[contenteditable][aria-label="Name"]');
	const walk = [];
	for (let i = 0; i < 19; i++) {
		await page.keyboard.press('Alt+Tab');
		walk.push(await active());
	}
	facts.tabOrderBareSheet = walk;
	await page.reload();

	// ── 1. Build keyboard-only ──
	await tabUntil('Name');
	await page.keyboard.type('Kbd Canvas');
	await page.keyboard.press('Enter');

	// Trait via the checklist: ghost → Enter → Space toggles → Esc closes.
	await tabUntil('+ trait');
	await page.keyboard.press('Enter');
	await page.keyboard.press(' ');
	facts.announceTraitAdded = await liveRegion();
	await page.keyboard.press('Escape');

	// First collaborator, with two typed messages through the type popover.
	await tabUntil('+ collaborator — who sends this context');
	await page.keyboard.press('Enter');
	facts.focusAfterGhostAdd = await active(); // the new lane's Collaborator field
	await page.keyboard.type('Checkout');
	await page.keyboard.press('Enter');
	await tabUntil('Add message');
	await page.keyboard.press('Enter'); // opens ▶/?/◆
	await tabUntil('command');
	await page.keyboard.press('Enter');
	facts.focusAfterTypePick = await active(); // Message name
	await page.keyboard.type('Place Order');
	await page.keyboard.press('Enter');
	await tabUntil('Add message');
	await page.keyboard.press('Enter');
	await tabUntil('event');
	await page.keyboard.press('Enter');
	await page.keyboard.type('Payment Confirmed');
	await page.keyboard.press('Enter');

	// Second collaborator, so lanes can reorder.
	await tabUntil('+ collaborator');
	await page.keyboard.press('Enter');
	await page.keyboard.type('Billing');
	await page.keyboard.press('Enter');

	const slot = () => page.evaluate(() => JSON.parse(localStorage.getItem('bcc.autosave')));
	facts.builtKeyboardOnly = await slot().then((s) => ({
		name: s.name,
		traits: s.domainRoles.length,
		lanes: s.inboundCommunication.map((l) => l.collaborator),
		messages: s.inboundCommunication[0].messages.map((m) => `${m.type} ${m.name}`)
	}));
	await page.screenshot({ path: shot('1-keyboard-built'), fullPage: true });

	// ── 2. Reorder + focus retention, then empty via Delete ──
	const nameField = page.locator('[contenteditable][aria-label="Message name"]').first();
	await nameField.focus();
	await page.keyboard.press('Alt+ArrowRight');
	facts.chipMoved = await slot().then((s) =>
		s.inboundCommunication[0].messages.map((m) => m.name)
	);
	facts.announceMovedDown = await liveRegion();
	facts.focusAfterChipMove = await page.evaluate(() => ({
		label: document.activeElement?.getAttribute('aria-label'),
		text: document.activeElement?.textContent
	}));

	await page.locator('[contenteditable][aria-label="Collaborator"]').first().focus();
	await page.keyboard.press('Alt+ArrowDown');
	facts.lanesAfterAltDown = await slot().then((s) =>
		s.inboundCommunication.map((l) => l.collaborator)
	);
	facts.announceLaneMove = await liveRegion();

	// Delete a chip from its ×, then a whole lane; both announce type-led.
	await page.locator('[aria-label="Remove command Place Order"]').focus();
	await page.keyboard.press('Delete');
	facts.announceCommandRemoved = await liveRegion();
	await page.locator('[aria-label^="Remove collaborator Billing"]').focus();
	await page.keyboard.press('Delete');
	facts.announceCollaboratorRemoved = await liveRegion();
	facts.emptiedTo = await slot().then((s) => ({
		lanes: s.inboundCommunication.map((l) => l.collaborator),
		messages: s.inboundCommunication[0]?.messages.length ?? 0
	}));

	// Field-blur commits stay silent: the region still holds the last string.
	await page.locator('[contenteditable][aria-label="Description"]').focus();
	await page.keyboard.type('Quiet edit.');
	await page.keyboard.press('Tab');
	facts.regionAfterFieldBlur = await liveRegion();

	// Undone: announces the section name without moving focus.
	await page.keyboard.press('Meta+z');
	facts.announceUndone = await liveRegion();

	// ── 3. Focus reveals what hover reveals ──
	const chipName = page.locator('[contenteditable][aria-label="Message name"]').first();
	const chipX = page.locator('[aria-label^="Remove event"]').first();
	facts.xAtRest = await chipX.evaluate((el) => getComputedStyle(el).opacity);
	await chipName.focus();
	await page.waitForTimeout(250); // the 120ms reveal fade must settle
	facts.xWhileChipFocused = await chipX.evaluate((el) => getComputedStyle(el).opacity);
	const inboundGhost = page.locator('.area-inbound .ghost').last();
	facts.ghostWhilePanelFocused = await inboundGhost.evaluate(
		(el) => getComputedStyle(el).opacity
	);
	// Tab order inside the chip: name field → (revealed detail) → its own ×.
	const stops = [await active()];
	for (let i = 0; i < 3; i++) {
		await page.keyboard.press('Alt+Tab');
		stops.push(await active());
	}
	facts.chipTabStops = stops;
	await page.screenshot({ path: shot('2-focus-reveal'), fullPage: false });

	// ── 4. Focus rings & reduced motion ──
	// The chip walk above moved focus on; return by keyboard (Shift+Option+Tab)
	// so the field's focus is genuinely keyboard-initiated when measured.
	for (let i = 0; i < 6; i++) {
		await page.keyboard.press('Alt+Shift+Tab');
		if ((await active()) === 'Message name') break;
	}
	facts.keyboardFieldRing = await chipName.evaluate((el) => ({
		focused: document.activeElement === el,
		hasClass: el.classList.contains('field-kbd'),
		outline: `${getComputedStyle(el).outlineWidth} ${getComputedStyle(el).outlineStyle}`
	}));
	await page.screenshot({ path: shot('3-keyboard-ring') });
	await chipName.click();
	facts.pointerFieldRing = await chipName.evaluate((el) => ({
		hasClass: el.classList.contains('field-kbd'),
		outline: `${getComputedStyle(el).outlineWidth} ${getComputedStyle(el).outlineStyle}`
	}));
	// :focus-visible needs real keyboard travel, not programmatic focus.
	await tabUntil('Remove event', 6);
	facts.xFocusVisibleRing = await chipX.evaluate(
		(el) => `${getComputedStyle(el).outlineWidth} ${getComputedStyle(el).outlineStyle}`
	);
	const ghostButton = page.locator('.area-roles .ghost').first();
	await page.emulateMedia({ reducedMotion: 'reduce' });
	facts.ghostTransitionReduced = await ghostButton.evaluate(
		(el) => getComputedStyle(el).transitionProperty
	);
	await page.emulateMedia({ reducedMotion: null });

	// ── 5. Assistive-tech semantics ──
	facts.semantics = await page.evaluate(() => {
		const sheet = document.querySelector('.quiet-sheet');
		const textboxes = [...sheet.querySelectorAll('[role="textbox"]')];
		const chip = sheet.querySelector('.msg');
		return {
			textboxCount: textboxes.length,
			everyTextboxNamed: textboxes.every((el) => el.getAttribute('aria-label')),
			multilineOnProse: sheet
				.querySelector('[aria-label="Description"]')
				?.getAttribute('aria-multiline'),
			placeholdersRide: textboxes.some((el) => el.getAttribute('aria-placeholder')),
			lanesAreList: sheet.querySelector('.lanes')?.tagName,
			messagesAreList: sheet.querySelector('.msgs')?.tagName,
			rolesAreList: sheet.querySelector('.roles')?.tagName,
			chipTypeLed: chip?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 30),
			liveSurfaces: [...document.querySelectorAll('[role="status"], [aria-live]')].map(
				(el) => `${el.tagName}[${el.getAttribute('role') ?? ''}|${el.getAttribute('aria-live') ?? ''}]#${el.id || el.className}`
			)
		};
	});

	// The multi-tab notice reaches the live region when a second tab opens.
	const second = await context.newPage();
	await second.goto(APP);
	await page.locator('[role="note"]').waitFor({ timeout: 5000 });
	facts.announceMultiTab = await liveRegion();

	console.log(JSON.stringify(facts, null, 2));
} finally {
	await browser.close();
}
writeFileSync(new URL('./facts.json', import.meta.url).pathname, JSON.stringify(facts, null, 2));
