/* global document, window */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const out='artifacts/r79-review';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({reducedMotion:'reduce'});
const results=await fs.readFile(`${out}/baseline-comparison.json`,'utf8').then(JSON.parse,()=>[]);
const modules=[['cases','/zh/','.h-cases',true],['footer','/zh/','.project-cta',true],['making','/zh/','.h-making',false],['systems','/zh/','.h-systems',false],['contact-intro','/zh/contact/','.contact-intro',true],['contact-people','/zh/contact/','#wechat',false],['film','/zh/products/4s/','#installation-video',false],['drawings','/zh/products/grayscale/','#diagrams',false],['catalog-collection','/zh/products/','#collection',true],['comparison','/zh/products/','#product-comparison',false]];
for(const width of [1440,1920,2560,375]){
 await page.setViewportSize({width,height:1000});
 for(const [name,route,selector,unchanged] of modules){
  if(results.some(r=>r.name===name&&r.width===width))continue;
  const evidence={name,width,unchanged};
  for(const [label,port] of [['r76',4348],['r79',4351]]){
   await page.goto(`http://127.0.0.1:${port}${route}`,{waitUntil:'networkidle'});
   await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'));});
   const el=page.locator(selector);await el.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(200);
   evidence[label]=await el.evaluate(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,parts:[...e.querySelectorAll('h1,h2,h3,p,a.action,img')].map(n=>{const b=n.getBoundingClientRect();return {tag:n.tagName,x:b.x-r.x,y:b.y-r.y,width:b.width,height:b.height,text:n.tagName==='IMG'?n.getAttribute('src'):n.textContent};})};});
   // Capture a complete raster with normal navigation visible, then extract the
   // section from that render. Avoid off-viewport locator capture clipping.
   const imagePath=`${out}/${name}-${width}-${label}.png`;
   const exists=await fs.access(imagePath).then(()=>true,()=>false);
   if(exists)continue;
   const rect=await el.boundingBox();
   if(!rect){
    evidence[label].hidden=true;
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:imagePath});
    continue;
   }
   const y=await page.evaluate(()=>window.scrollY);
   const full=await page.screenshot({fullPage:true});
   const sharp=(await import('../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js')).default;
   const image=sharp(full);const metadata=await image.metadata();
   const top=Math.max(0,Math.round(rect.y+y));
   await image.extract({left:0,top,width:metadata.width,height:Math.min(Math.ceil(rect.height),metadata.height-top)}).toFile(imagePath);
  }
  if(unchanged)evidence.match=JSON.stringify(evidence.r76)===JSON.stringify(evidence.r79);
  results.push(evidence);
  await fs.writeFile(`${out}/baseline-comparison.json`,JSON.stringify(results,null,2));
 }
 console.log('Compared baseline modules',width);
}
await fs.writeFile(`${out}/baseline-comparison.json`,JSON.stringify(results,null,2));
await browser.close();console.log('Unchanged-region discrepancies',results.filter(r=>r.unchanged&&!r.match).map(r=>({name:r.name,width:r.width})));
