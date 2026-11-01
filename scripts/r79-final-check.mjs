/* global document, window */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from '../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js';
const out='artifacts/r79-review';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({reducedMotion:'reduce'});
const page=await context.newPage();
const results=[];
const measurementsOnly=process.argv.includes('--measurements-only');
async function open(path){await page.goto('http://127.0.0.1:4351'+path,{waitUntil:'networkidle'});await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'));});}
async function section(selector,name){const el=page.locator(selector);await el.scrollIntoViewIfNeeded();const rect=await el.boundingBox();const y=await page.evaluate(()=>window.scrollY);const full=await page.screenshot({fullPage:true});const pic=sharp(full);const m=await pic.metadata();const top=Math.max(0,Math.round(rect.y+y));await pic.extract({left:0,top,width:m.width,height:Math.min(Math.ceil(rect.height),m.height-top)}).toFile(`${out}/${name}.png`);}
for(const width of [320,375,768,1024,1440,1920,2560]){
 await page.setViewportSize({width,height:width<768?812:1000});
 await open('/zh/');
 const heights=await page.locator('.h-steps img').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().height));
 // r76 intentionally uses a single column below 1024px. Equal-height applies
 // to the three images sharing one desktop row, not to stacked mobile images.
 const equal=width<1024||Math.max(...heights)-Math.min(...heights)<2;
 results.push({name:'Manufacturing image heights',width,heights,passed:equal});
 if(width>=1440&&!measurementsOnly)await section('.h-making',`making-final-${width}`);
 for(const lang of ['zh','en']){
  await open(`/${lang}/review/wall/`);
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>window.innerWidth+1,broken:[...document.images].filter(i=>!i.naturalWidth).length,photos:[...document.querySelectorAll('.wall-photographs img')].filter(e=>e.getBoundingClientRect().width>0).length,copy:document.querySelector('.wall-introduction').innerText}));
  const passed=!layout.overflow&&!layout.broken&&(width>=768||layout.photos===7);
  results.push({name:'Wall sample mobile photographs and layout',lang,width,passed,...layout});
  if([375,1440,1920,2560].includes(width)&&!measurementsOnly){await section('.wall-introduction',`wall-final-${lang}-${width}`);await page.screenshot({path:`${out}/wall-full-final-${lang}-${width}.png`,fullPage:true});}
 }
}
await fs.writeFile(`${out}/final-layout-recheck.json`,JSON.stringify(results,null,2));
for(const width of [375,1440]){
 await page.setViewportSize({width,height:900});await open('/zh/qualifications/');
 const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 results.push({name:'Qualifications contrast recheck',width,passed:!a.violations.length,violations:a.violations});
}
await fs.writeFile(`${out}/final-recheck.json`,JSON.stringify(results,null,2));
await browser.close();console.log(JSON.stringify(results.map(r=>({...r,copy:undefined})),null,2));assert(results.every(r=>r.passed));
