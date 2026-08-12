// The strip's keyboard focus ring, measured on a freshly loaded page so the
// sequential-focus starting point is the document start (the earlier run
// blurred mid-page, which in Chromium leaves the starting point where it was
// and sends the next Tab past the strip into the panel).
import { writeFileSync } from 'node:fs';
import { webkit, chromium } from 'playwright-core';
const OUT = new URL('./evidence/', import.meta.url).pathname;
const URL_='file:///Users/mitchell/Projects/bc-canvas-editor/.scratch/views-checkpoint/evidence/triangle/artifact-order-fulfillment.bcc.html';
const out={};
for (const [n,e] of [['webkit',webkit],['chromium',chromium]]) {
  const b=await e.launch(); const ctx=await b.newContext({viewport:{width:1200,height:900}}); const p=await ctx.newPage();
  await p.goto(URL_); await p.waitForSelector('[role="tablist"]:not([hidden])');
  const strip = p.locator('[role="tablist"]');
  const before = await strip.screenshot();
  await p.keyboard.press('Tab');
  const first = await p.evaluate(()=>document.activeElement?.id ?? null);
  const after = await strip.screenshot();
  writeFileSync(`${OUT}ring-${n}-unfocused.png`, before);
  writeFileSync(`${OUT}ring-${n}-focused.png`, after);
  // Tab again: the strip is one stop, so this must leave it.
  await p.keyboard.press('Tab');
  const second = await p.evaluate(()=>document.activeElement?.id ?? null);
  out[n]={ firstTabStop:first, secondTabStop:second, pixelsDiffer: !before.equals(after),
    style: await p.evaluate(()=>{ const el=document.getElementById('view-tab-sheet'); const s=getComputedStyle(el);
      return {outline:s.outlineWidth+' '+s.outlineStyle+' '+s.outlineColor, offset:s.outlineOffset, background:s.backgroundColor}; }) };
  await b.close();
}
console.log(JSON.stringify(out,null,1));
writeFileSync(`${OUT}part4-focus-ring.json`, JSON.stringify(out,null,'\t')+'\n');
