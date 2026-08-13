// Decisive: is 049's "a nested <svg> never draws" actually a MISSING xmlns?
// foreignObject content is XHTML, where an <svg> with no namespace declaration
// inherits XHTML and is not an SVG element at all. CanvasSheet.svelte writes
// its icon <svg> the HTML way — no xmlns — which is exactly this case.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright-core';

const out = '/Users/mitchell/Projects/bc-canvas-editor/.scratch/committed-images';
const PATHS =
  '<circle cx="8" cy="5.1" r="2.4"/><path d="M3.3 13.3a4.7 4.7 0 0 1 9.4 0"/>';

// exactly what CanvasSheet.svelte emits today, minus/plus the xmlns
const icon = (xmlns) =>
  `<svg${xmlns ? ' xmlns="http://www.w3.org/2000/svg"' : ''} class="kind__svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS}</svg>`;

const CASES = [
  ['1-no-xmlns (what the sheet emits today)', icon(false)],
  ['2-with-xmlns (one attribute added)', icon(true)]
];

const rows = CASES.map(
  ([name, html]) =>
    `<div class="row"><span class="kind">${html}</span><span class="lbl">${name}</span></div>`
).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="140" viewBox="0 0 520 140">
<foreignObject x="0" y="0" width="520" height="140">
<div xmlns="http://www.w3.org/1999/xhtml">
<style>
div { font-family: sans-serif; background: #f6f1e7; margin: 0; padding: 12px; }
.row { display: flex; align-items: center; gap: 14px; height: 50px; }
.kind { display: inline-block; width: 34px; height: 34px; flex: none; color: #7a4b2a; }
.kind svg { display: block; width: 100%; height: 100%; }
.lbl { font-size: 15px; color: #2b2b2b; }
</style>
${rows}
</div>
</foreignObject>
</svg>
`;
writeFileSync(path.join(out, 'xmlns-probe.svg'), svg);

const page = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">
<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="520" height="140" />
</body>`;

for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const b = await engine.launch();
  const p = await b.newPage({ viewport: { width: 540, height: 160 } });
  await p.setContent(page, { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: path.join(out, `xmlns-probe-${name}.png`) });
  await b.close();
  console.log('shot', name);
}
console.log('done');
