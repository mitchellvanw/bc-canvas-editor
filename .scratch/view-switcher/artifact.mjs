// PROTOTYPE capture, part three (ticket 042, requirement 3): the artifact's
// version of the switcher. "If the control only makes sense with an editor
// around it, it is the wrong control."
//
// A REAL artifact is exported from the running app (so the sheet markup, the
// inlined CSS and the base64 fonts are the shipped ones), then the strip and
// the two text panels are grafted on — the shape ticket 047 would build. All
// three panels are in the DOM; the script only adds tab semantics on top of
// markup that already works without it, so each file is also written in a
// no-script variant to prove the script-less viewer gets everything.
import { mkdirSync, writeFileSync } from 'node:fs';
import { webkit } from 'playwright-core';

const OUT = new URL('./evidence/', import.meta.url).pathname;
const APP = 'http://localhost:5177/';
mkdirSync(OUT, { recursive: true });

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(`${APP}?switcher=A`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

// The real export, straight off the shipped path.
const [download] = await Promise.all([
	page.waitForEvent('download'),
	(async () => {
		await page.getByRole('button', { name: 'Export' }).click();
		await page.getByRole('menuitem', { name: /HTML artifact/ }).click();
	})()
]);
const artifactPath = `${OUT}artifact-source.bcc.html`;
await download.saveAs(artifactPath);

// The two text Views' real bytes, read out of the running app.
const bytes = await page.evaluate(async () => {
	const tab = (name) =>
		[...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim().startsWith(name));
	tab('JSON').click();
	await new Promise((r) => setTimeout(r, 60));
	const json = document.querySelector('textarea').value;
	tab('Markdown').click();
	await new Promise((r) => setTimeout(r, 60));
	const markdown = document.querySelector('pre').textContent;
	return { json, markdown };
});
await page.close();

const source = (await import('node:fs')).readFileSync(artifactPath, 'utf8');
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Variant A's strip — the ink lip — and B's folder tabs, as static markup. */
const STRIPS = {
	A: (tabs) => `<div class="v-lip">
<p class="v-lip__eyebrow">Bounded&nbsp;Context&nbsp;Canvas&nbsp;·&nbsp;V5</p>
<div class="v-strip" role="tablist" aria-label="Views" hidden>${tabs}</div>
</div>`,
	B: (tabs) => `<div class="v-strip v-strip--folder" role="tablist" aria-label="Views" hidden>${tabs}</div>`
};

const VIEWS = [
	{ key: 'sheet', label: 'Sheet' },
	{ key: 'json', label: 'JSON' },
	{ key: 'markdown', label: 'Markdown' }
];

const CSS = `
/* --- View switcher, artifact side (prototype for ticket 047) --- */
main { max-width: 1440px; margin: 0 auto; padding: 24px 40px 48px; }
.v-lip { display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between;
  gap:.75rem 2rem; padding:1.1rem 1.7rem .75rem; border-radius:6px 6px 0 0;
  background:var(--color-ink); color:var(--color-sheet); margin-bottom:-1px; }
.v-lip__eyebrow { margin:0; opacity:.6; }
.v-lip__eyebrow, .v-lip .v-tab { font-family:var(--font-sans); font-size:.62rem; font-weight:600;
  letter-spacing:.24em; text-transform:uppercase; }
.v-lip .v-strip { display:flex; gap:1.6rem; }
.v-lip .v-tab { position:relative; padding-bottom:.3rem; color:rgb(253 253 251 / .5); background:none; border:0; cursor:pointer; }
.v-lip .v-tab[aria-selected="true"] { color:var(--color-sheet); }
.v-lip .v-tab[aria-selected="true"]::after { content:""; position:absolute; inset:auto 0 0 0; height:2px; background:var(--color-sheet); }
.v-strip--folder { display:flex; align-items:flex-end; gap:3px; padding-left:1.1rem; }
.v-strip--folder .v-tab { margin-bottom:-1px; padding:.42rem 1.05rem .5rem; border:1px solid var(--color-line);
  border-bottom:0; border-radius:5px 5px 0 0; background:color-mix(in srgb, var(--color-sheet) 55%, transparent);
  color:var(--color-ink-soft); font-family:var(--font-sans); font-size:.78rem; font-weight:500; cursor:pointer; }
.v-strip--folder .v-tab[aria-selected="true"] { padding-bottom:.62rem; background:var(--color-sheet); color:var(--color-ink); font-weight:600; }
.v-strip--folder.v-strip--ink .v-tab[aria-selected="true"] { border-color:var(--color-ink); background:var(--color-ink); color:var(--color-sheet); }
.v-tab:focus-visible { outline:2px solid var(--color-ink); outline-offset:2px; }
.v-lip .v-tab:focus-visible { outline-color:var(--color-sheet); outline-offset:3px; }
.v-lip ~ .v-panel .tb__eyebrow, .v-lip + .v-panel .tb__eyebrow { display:none; }
.v-lip ~ .v-panel .tb { border-radius:0 0 6px 6px; }
.v-strip--folder ~ .v-panel .tb { border-radius:0 0 6px 6px; }
.v-pane { border:1px solid var(--color-line); border-radius:5px; background:var(--color-sheet);
  padding:1.4rem 1.6rem; font-family:var(--font-mono); font-size:.8rem; line-height:1.65;
  white-space:pre-wrap; overflow-x:auto; }
/* Script-less: every panel is in the DOM and visible, stacked, with its own
   heading. The script below turns the stack into tabs; without it the file
   still shows everything it contains. */
.v-panel__heading { font-family:var(--font-sans); font-size:.72rem; font-weight:600;
  letter-spacing:.11em; text-transform:uppercase; color:var(--color-ink-soft); margin:1.6rem 0 .6rem; }
.v-strip[hidden] { display:none; }
.v-enhanced .v-panel__heading { display:none; }
.v-enhanced .v-panel[hidden] { display:none; }
`;

const SCRIPT = `<script>
/* Progressive enhancement only: the panels above are already in the document
   and already readable. This adds the tablist semantics (SPEC §8.3) — roving
   tabindex, arrows select, one tab stop for the set — and hides the panels
   that are not current. With script off, nothing here runs and the file falls
   back to the stack. */
(function () {
  var root = document.querySelector('[data-views]');
  if (!root) return;
  root.classList.add('v-enhanced');
  var strip0 = root.querySelector('.v-strip');
  if (strip0) strip0.removeAttribute('hidden');
  var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = [].slice.call(root.querySelectorAll('.v-panel'));
  function select(i) {
    tabs.forEach(function (t, n) {
      t.setAttribute('aria-selected', n === i ? 'true' : 'false');
      t.tabIndex = n === i ? 0 : -1;
    });
    panels.forEach(function (p, n) { p.hidden = n !== i; });
    var strip = root.querySelector('.v-strip--folder');
    if (strip) strip.classList.toggle('v-strip--ink', i === 0);
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(i); });
    tab.addEventListener('keydown', function (e) {
      var n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault();
      select(n);
      tabs[n].focus();
    });
  });
  select(0);
})();
<\/script>`;

for (const variant of ['A', 'B']) {
	for (const scripted of [true, false]) {
		const tabs = VIEWS.map(
			(v, i) =>
				`<button type="button" class="v-tab" role="tab" id="vtab-${v.key}" aria-controls="vpanel-${v.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${v.label}</button>`
		).join('');

		// The sheet the real export already produced, kept verbatim as panel one.
		const sheetMarkup = source.slice(
			source.indexOf('<main>') + '<main>'.length,
			source.indexOf('</main>')
		);

		const panels = `
<div class="v-panel" id="vpanel-sheet" role="tabpanel" aria-labelledby="vtab-sheet" tabindex="0">
<p class="v-panel__heading">Sheet</p>
${sheetMarkup}
</div>
<div class="v-panel" id="vpanel-json" role="tabpanel" aria-labelledby="vtab-json" tabindex="0">
<p class="v-panel__heading">Canvas file (JSON)</p>
<pre class="v-pane">${escape(bytes.json)}</pre>
</div>
<div class="v-panel" id="vpanel-markdown" role="tabpanel" aria-labelledby="vtab-markdown" tabindex="0">
<p class="v-panel__heading">Markdown</p>
<pre class="v-pane">${escape(bytes.markdown)}</pre>
</div>`;

		const body = `<main data-views>
${STRIPS[variant](tabs)}
${panels}
</main>`;

		let out = source
			.replace(/<main>[\s\S]*?<\/main>/, body)
			.replace('</head>', `<style>${CSS}</style>\n</head>`);
		if (scripted) out = out.replace('</body>', `${SCRIPT}\n</body>`);

		const name = `artifact-${variant}${scripted ? '' : '-noscript'}.bcc.html`;
		writeFileSync(`${OUT}${name}`, out);
		console.log(name, `${(out.length / 1024).toFixed(0)}KB`);
	}
}

// Shoot both: scripted (tabs) and script-less (the stack).
const shot = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
for (const variant of ['A', 'B']) {
	await shot.goto(`file://${OUT}artifact-${variant}.bcc.html`, { waitUntil: 'networkidle' });
	await shot.evaluate(() => document.fonts.ready);
	await shot.screenshot({ path: `${OUT}artifact-${variant}-sheet.png`, clip: { x: 0, y: 0, width: 1440, height: 400 } });
	await shot.getByRole('tab', { name: 'Markdown' }).click();
	await shot.waitForTimeout(150);
	await shot.screenshot({ path: `${OUT}artifact-${variant}-markdown.png`, clip: { x: 0, y: 0, width: 1440, height: 400 } });
}
await shot.close();

// Script off — the same files must still show all three.
const bare = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
const barePage = await bare.newPage();
await barePage.goto(`file://${OUT}artifact-A.bcc.html`, { waitUntil: 'load' });
const visible = await barePage.evaluate(() =>
	[...document.querySelectorAll('.v-panel')].map((p) => ({
		id: p.id,
		visible: p.getBoundingClientRect().height > 0
	}))
);
console.log('script disabled →', JSON.stringify(visible));
await barePage.screenshot({ path: `${OUT}artifact-noscript.png`, fullPage: false });
await bare.close();
await browser.close();
