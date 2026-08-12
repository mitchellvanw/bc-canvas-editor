// The class-based hide must remove the inactive panels from the accessibility
// tree as completely as the `hidden` attribute did — display:none does, but
// that is worth seeing rather than assuming.
import { writeFileSync } from 'node:fs';
import { webkit, chromium } from 'playwright-core';
const OUT = new URL('./evidence/', import.meta.url).pathname;
const URL_='file:///Users/mitchell/Projects/bc-canvas-editor/.scratch/views-checkpoint/evidence/triangle/artifact-order-fulfillment.bcc.html';
const out={};
for (const [n,e] of [['webkit',webkit],['chromium',chromium]]) {
  const b=await e.launch(); const p=await b.newPage();
  await p.goto(URL_); await p.waitForSelector('[role="tablist"]:not([hidden])');
  // No accessibility.snapshot in playwright-core here; ARIA locators resolve
  // through the same visibility rules assistive tech follows.
  const panels = () => p.getByRole('tabpanel').count();
  const onSheet = await panels();
  await p.click('#view-tab-json');
  const onJson = await panels();
  out[n] = {
    tabpanelsExposedOnSheet: onSheet,
    tabpanelsExposedOnJson: onJson,
    namedPanelOnJson: await p.getByRole('tabpanel').getAttribute('id'),
    // The Markdown panel's text must not be readable while JSON is live.
    markdownTextReachable: await p.locator('#view-panel-markdown').isVisible(),
    jsonTextReachable: await p.locator('#view-panel-json').isVisible()
  };
  await b.close();
}
console.log(JSON.stringify(out,null,1));
writeFileSync(`${OUT}part4-a11y-tree.json`, JSON.stringify(out,null,'\t')+'\n');
