/* global document, window */
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='http://127.0.0.1:4351';
const out='artifacts/r79-review';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({reducedMotion:'reduce'});
const page=await context.newPage();
const findings=[],checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const routes=['/zh/','/en/','/zh/products/','/en/products/','/zh/products/4s/','/en/products/4s/','/zh/products/grayscale/','/zh/products/grayscale-eco/','/zh/contact/','/en/contact/','/zh/qualifications/','/zh/review/wall/','/en/review/wall/'];
const viewports=[{width:320,height:740},{width:375,height:812},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900},{width:1920,height:1080},{width:2560,height:1440},{width:844,height:390},{width:720,height:450}];
async function open(path){await page.goto(root+path,{waitUntil:'networkidle'});await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'));});}
function record(name,passed,detail={}){checks.push({name,passed,...detail});if(!passed)findings.push({name,...detail});}
for(const viewport of viewports){
 await page.setViewportSize(viewport);
 for(const route of routes){
  await open(route);
  const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>window.innerWidth+1,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.currentSrc),logo:(()=>{const e=document.querySelector('.gnb .official-brand');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})(),media:[...document.querySelectorAll('[data-film-aligned] .pd-film img,[data-film-aligned] .pd-film video')].map(e=>{const r=e.getBoundingClientRect();return {y:r.y,h:r.height};}),drawings:[...document.querySelectorAll('.pd-aligned-row')].map(e=>[...e.querySelectorAll('img')].map(i=>i.getBoundingClientRect().height)),qr:[...document.querySelectorAll('.contact-people .wechat-code')].map(e=>e.getBoundingClientRect().y)}));
  record(`${route} ${viewport.width}x${viewport.height}`,!result.overflow&&!result.broken.length,result);
  if(viewport.width>=1024&&result.media.length)record(`4S equal media heights ${route} ${viewport.width}`,Math.max(...result.media.map(e=>e.h))-Math.min(...result.media.map(e=>e.h))<2);
  if(viewport.width>=768){
   result.drawings.forEach((heights,i)=>record(`Drawing row ${i} ${route} ${viewport.width}`,Math.max(...heights)-Math.min(...heights)<2));
   if(result.qr.length)record(`QR baseline ${route} ${viewport.width}`,Math.max(...result.qr)-Math.min(...result.qr)<2);
  }
 }
 console.log('Responsive checked',viewport);
}
// Every slide, exact source order, no drift in mobile image/control position.
for(const lang of ['zh','en'])for(const catalog of [false,true])for(const width of [375,1440,2560]){
 await page.setViewportSize({width,height:width===375?812:1000});
 const route=`/${lang}/${catalog?'products/':''}`;await open(route);
 const count=await page.locator('[data-slide]').count();record(`Slide count ${route}`,count===(catalog?4:5));
 const positions=[];
 for(let i=0;i<count;i++){
  await page.locator(`[data-dot="${i}"]`).click();await page.waitForTimeout(200);
  const state=await page.evaluate(()=>({index:[...document.querySelectorAll('[data-slide]')].findIndex(e=>e.classList.contains('on')),src:document.querySelector('.slide.on img')?.currentSrc,stageY:document.querySelector('.hero-stage').getBoundingClientRect().top+window.scrollY,controlsY:document.querySelector('.hero-controls').getBoundingClientRect().top+window.scrollY}));
  record(`Carousel ${route} ${width} frame${i+1}`,state.index===i&&!!state.src,state);positions.push(state.stageY);
  await page.locator('[data-carousel]').screenshot({path:`${out}/${lang}-${catalog?'catalog':'home'}-${width}-frame${i+1}.png`});
 }
 if(width===375)record(`Stable mobile caption ${route}`,Math.max(...positions)-Math.min(...positions)<2,{positions});
 await page.locator('[data-carousel]').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(200);record(`Keyboard wraps ${route} ${width}`,await page.locator('[data-dot="0"]').getAttribute('aria-current')==='true');
}
await page.setViewportSize({width:1440,height:1000});await open('/zh/products/');
const rightBefore=await page.locator('[data-comparison-name="1"]').textContent();await page.locator('[data-comparison-select="0"]').selectOption('6s');record('Compare left remains independent',await page.locator('[data-comparison-name="1"]').textContent()===rightBefore&&/6S/.test(await page.locator('[data-comparison-name="0"]').textContent()));
await page.locator('[data-comparison-select="1"]').selectOption('bd9');record('Compare right remains independent',/6S/.test(await page.locator('[data-comparison-name="0"]').textContent())&&/9/.test(await page.locator('[data-comparison-name="1"]').textContent()));
await open('/zh/contact/');record('Contacts have correct identities/order',JSON.stringify(await page.locator('.contact-person h3').allTextContents())===JSON.stringify(['黄先生','唐小姐','王先生']));record('Hong Kong telephone',await page.locator('a[href="tel:+85267256153"]').count()===1);record('Old Wang telephone removed',!(await page.content()).includes('18073804567'));
const qr=page.locator('.wechat-code').first();await qr.click();await page.waitForTimeout(200);record('QR viewer opens',await page.locator('.photo-viewer').isVisible());await page.keyboard.press('Escape');record('QR focus restored',await qr.evaluate(e=>e===document.activeElement));
await open('/zh/products/4s/');record('Video preload remains none',await page.locator('video').evaluateAll(v=>v.every(e=>e.preload==='none'&&!e.autoplay)));
const video=page.locator('video').first();await video.scrollIntoViewIfNeeded();const playback=await video.evaluate(async e=>{e.muted=true;await e.play();await new Promise(r=>setTimeout(r,700));const result={time:e.currentTime,error:e.error?.message??null};e.pause();return result;});record('4S manual video playback',playback.time>0&&!playback.error,playback);
await open('/zh/review/wall/');const drawing=page.locator('.wall-connections [data-gallery]').first();await drawing.click();await page.waitForTimeout(200);record('Wall technical viewer opens',await page.locator('.photo-viewer').isVisible());await page.keyboard.press('Escape');record('Wall focus restored',await drawing.evaluate(e=>e===document.activeElement));
const axe=[];
for(const width of [375,1440])for(const route of routes){await page.setViewportSize({width,height:900});await open(route);const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();axe.push({route,width,violations:a.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))});}
record('No browser script errors',errors.length===0,{errors});
await fs.writeFile(`${out}/browser-results.json`,JSON.stringify({checks,findings,axe,errors,note:'Edge desktop emulation; 720x450 is a 200% equivalent viewport, not a physical-device or native zoom test. Screenshot review is separate.'},null,2));
await browser.close();console.log(JSON.stringify({checks:checks.length,failures:findings,axe:axe.filter(a=>a.violations.length)},null,2));assert.equal(findings.length,0,'Browser regressions need correction');
