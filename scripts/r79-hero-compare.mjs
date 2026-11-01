/* global document, window, requestAnimationFrame */
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({reducedMotion:'reduce'});
for(const width of [1440,1920,375]){
 await page.setViewportSize({width,height:width===375?812:1080});
 for(const [label,port] of [['r76',4348],['r79',4351]])for(const catalog of [false,true]){
  await page.goto(`http://127.0.0.1:${port}/zh/${catalog?'products/':''}`,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  const count=await page.locator('[data-slide]').count();
  for(let i=0;i<count;i++){
   await page.locator(`[data-dot="${i}"]`).click();
   await page.waitForFunction(index=>[...document.querySelectorAll('[data-slide]')].findIndex(e=>e.classList.contains('on'))===index,i);
   await page.waitForFunction(()=>{if(window.innerWidth<1280)return true;const active=document.querySelector('.slide.on');const photo=active.querySelector('img');const cover=window.getComputedStyle(photo).objectFit==='cover';return document.querySelector('.gnb').dataset.tone===((cover&&active.dataset.coverHeaderTone)||active.dataset.headerTone||'light')});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.locator('[data-carousel]').screenshot({path:`artifacts/r79-review/${catalog?'catalog':'home'}-hero-${width}-frame${i+1}-${label}.png`});
  }
 }
 console.log('Hero comparison captured',width);
}
await browser.close();
