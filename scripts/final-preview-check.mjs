/* global document, innerWidth */
import {chromium} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true,timeout:15000});const p=await b.newPage({reducedMotion:'reduce'});const results=[];
for(const lang of ['zh','en'])for(const w of [375,1440,2560]){
await p.setViewportSize({width:w,height:1000});await p.goto(`http://127.0.0.1:4354/${lang}/products/`,{waitUntil:'networkidle'});
for(let i=0;i<4;i++){await p.locator('[data-dot]').nth(i).click();await p.waitForTimeout(300);const state=await p.evaluate(()=>({index:[...document.querySelectorAll('[data-slide]')].findIndex(e=>e.classList.contains('on')),overflow:document.documentElement.scrollWidth>innerWidth,loaded:document.querySelector('.slide.on img').naturalWidth>0}));assert.equal(state.index,i);assert(!state.overflow&&state.loaded);results.push({lang,w,i,...state});await p.locator('[data-carousel]').screenshot({path:`artifacts/next-review/final-${lang}-${w}-${i+1}.png`});}
await p.goto(`http://127.0.0.1:4354/${lang}/about/`,{waitUntil:'networkidle'});await p.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,3000))]);});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`artifacts/next-review/final-about-${lang}-${w}.png`,fullPage:true});
}
await fs.writeFile('artifacts/next-review/final-check.json',JSON.stringify(results,null,2));await b.close();console.log('24 final catalog states and 6 final about layouts passed');

