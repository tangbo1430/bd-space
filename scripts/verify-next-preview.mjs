/* global document, innerWidth */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const base='http://127.0.0.1:4354';
const b=await chromium.launch({channel:'msedge',headless:true});
const p=await b.newPage({reducedMotion:'reduce'});const errors=[],results=[];
p.on('pageerror',e=>errors.push({url:p.url(),message:e.message}));
const paths=['','products/','products/bd11/','products/qiyuan/','products/snow11/','about/','contact/'];
await fs.mkdir('artifacts/next-review',{recursive:true});
for(const lang of ['zh','en'])for(const path of paths)for(const w of [320,375,768,1024,1440,1920,2560]){
await p.setViewportSize({width:w,height:1000});const response=await p.goto(`${base}/${lang}/${path}`,{waitUntil:'networkidle'});
await p.evaluate(async()=>{document.querySelectorAll('img').forEach(x=>x.loading='eager');await Promise.all([...document.images].map(x=>x.decode().catch(()=>{})));document.querySelectorAll('.rv').forEach(x=>x.classList.add('in'));});
const result=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(x=>!x.naturalWidth).map(x=>x.currentSrc),h1:document.querySelector('h1')?.textContent}));
results.push({lang,path,w,status:response.status(),...result});
if([375,1440].includes(w))await p.screenshot({path:`artifacts/next-review/${lang}-${path.replaceAll('/','-')||'home'}-${w}.png`,fullPage:true});
}
await fs.writeFile('artifacts/next-review/layout-results.json',JSON.stringify({results,errors},null,2));
console.log(JSON.stringify({checks:results.length,failures:results.filter(x=>x.status!==200||x.overflow||x.broken.length),errors},null,2));
await b.close();


