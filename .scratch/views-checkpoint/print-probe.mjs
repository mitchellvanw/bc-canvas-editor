// What does the artifact actually print, per live tab, per engine, script on/off?
import { webkit, chromium } from 'playwright-core';
const URL_='file:///Users/mitchell/Projects/bc-canvas-editor/.scratch/views-checkpoint/evidence/triangle/artifact-order-fulfillment.bcc.html';
const probe = async (page) => page.evaluate(() => {
  const d = (id) => getComputedStyle(document.getElementById(id)).display;
  const ink = [...document.querySelectorAll('#view-panel-sheet, #view-panel-json, #view-panel-markdown')]
    .filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.id);
  return { sheet: d('view-panel-sheet'), json: d('view-panel-json'), markdown: d('view-panel-markdown'), visible: ink,
           bodyHeight: document.body.getBoundingClientRect().height };
});
for (const [n,e] of [['webkit',webkit],['chromium',chromium]]) {
  const b=await e.launch();
  for (const js of [true,false]) {
    const ctx = await b.newContext({ javaScriptEnabled: js });
    const p = await ctx.newPage();
    await p.goto(URL_);
    if (js) await p.waitForSelector('[role="tablist"]:not([hidden])');
    for (const tab of js ? ['sheet','json','markdown'] : ['(no script)']) {
      if (js) await p.click('#view-tab-'+tab);
      await p.emulateMedia({media:'print'});
      console.log(n, 'js='+js, 'tab='+tab, JSON.stringify(await probe(p)));
      await p.emulateMedia({media:'screen'});
    }
    await ctx.close();
  }
  await b.close();
}
