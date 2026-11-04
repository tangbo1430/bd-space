import {chromium} from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts/next-review',{recursive:true});
const b=await chromium.launch({channel:'msedge',headless:true});
const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await p.goto('http://127.0.0.1:4351/zh/products/',{waitUntil:'networkidle'});
for(let i=0;i<4;i++){
await p.locator('.hero-scene').nth(i).click();await p.waitForTimeout(850);
await p.screenshot({path:`artifacts/next-review/catalog-${i+1}.png`});
}
await p.goto('http://127.0.0.1:4351/zh/',{waitUntil:'networkidle'});
await p.locator('#banda-wall').scrollIntoViewIfNeeded();await p.waitForTimeout(800);
await p.locator('#banda-wall').screenshot({path:'artifacts/next-review/wall.png'});
await b.close();
