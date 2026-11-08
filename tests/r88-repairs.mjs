/* global document, innerWidth, scrollTo, scrollY */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4359";
const out = process.env.TEST_OUTPUT ?? "artifacts/r88-repair/local";
await fs.mkdir(out, { recursive: true });
const materials = JSON.parse(await fs.readFile("docs/r88-technical-materials.json", "utf8"));
const browser = await chromium.launch({ channel: "msedge" });
const report = { layouts: [], pixels: [], alignment: [], viewers: [], cta: [], errors: [] };
const seen = new Set();
const sizes = [[320,812],[375,812],[768,1000],[1024,1000],[1440,1000],[1920,1080],[2560,1440],[812,375]];

async function imageStats(image) {
  return image.evaluate((e) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = Math.round(e.naturalHeight / e.naturalWidth * 256);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(e, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let white = 0, ink = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 245 && data[i+1] > 245 && data[i+2] > 245) white++;
      if (data[i] < 220 && data[i+1] < 220 && data[i+2] < 220) ink++;
    }
    return { white: white/(data.length/4), ink: ink/(data.length/4), width:e.naturalWidth, height:e.naturalHeight };
  });
}
try {
  for (const lang of ["zh", "en"]) for (const id of ["bd11", "qiyuan", "snow11", "grayscale-eco"]) {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    page.on("pageerror", e => report.errors.push(e.message));
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.goto(`${base}/${lang}/products/${id}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      const images = page.locator("#specifications img, #diagrams img");
      await images.evaluateAll(async es => { await Promise.all(es.map(e=> {e.loading="eager";return e.decode();})); });
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), `${lang}/${id} ${width} overflow`);
      for (const image of await images.all()) {
        const src = await image.getAttribute("src");
        if (src.includes("/r88-") && !seen.has(src)) {
          const stats = await imageStats(image);
          // Detect black sheets and blank paper, not the density of roof hatching.
          assert(stats.white > .5 && stats.ink > .002, `${src} unreadable pixels: ${JSON.stringify(stats)}`);
          seen.add(src); report.pixels.push({src,...stats});
        }
      }
      if (id === "grayscale-eco") {
        const geometry = await page.locator(".gallery-preview-frame").evaluateAll(es=>es.map((e,i)=>{
          const image=e.querySelector("img"), r=image.getBoundingClientRect(), f=e.getBoundingClientRect(), c=e.closest("figure").querySelector("figcaption").getBoundingClientRect();
          const scale=r.width/2400;
          return {roof:r.y+([366,405][i])*scale, base:r.y+([1261,1322][i])*scale,
            frameY:f.y, frameWidth:f.width, frameHeight:f.height, captionY:c.y,
            inside:r.left>=f.left-.1 && r.right<=f.right+.1 && r.top>=f.top-.1 && r.bottom<=f.bottom+.1};
        }));
        assert.equal(geometry.length, 2);
        assert(geometry.every(g=>g.inside), "Original drawing must remain wholly in preview frame");
        if(width>=768){
          for(const key of ["roof","base","captionY","frameHeight"])
            assert(Math.abs(geometry[0][key]-geometry[1][key])<1.1, `Elevation ${key} ${width}`);
        }
        report.alignment.push({lang,width,geometry});
        if([375,1440,2560].includes(width)) {
          await page.locator(".gallery-preview-frame").first().evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-160,behavior:"instant"}));
          await page.screenshot({path:`${out}/${lang}-elevations-${width}.jpg`,type:"jpeg",quality:86});
        }
      } else if([375,1440].includes(width)) {
        await page.locator(".pd-aligned-row").first().evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-160,behavior:"instant"}));
        await page.screenshot({path:`${out}/${lang}-${id}-${width}.jpg`,type:"jpeg",quality:86});
      }
      report.layouts.push({lang,id,width,height});
    }
    // Every technical image: zoom, original link and focus recovery. New images
    // receive real viewer screenshots, so decoded black sheets cannot pass unnoticed.
    await page.setViewportSize({width:1440,height:1000});
    for (const link of await page.locator(`[data-gallery="${id}-diagrams"]`).all()) {
      const src=await link.getAttribute("data-gallery-source");
      await link.click();
      await page.waitForFunction(s=>document.querySelector(".viewer-image")?.getAttribute("src")===s,src);
      const image=page.locator(".viewer-image");await image.evaluate(e=>e.decode());
      await page.waitForTimeout(380);
      assert.equal(await page.locator("[data-viewer-original]").evaluate(e=>e.href),await link.evaluate(e=>e.href));
      if(src.includes("/r88-")&&lang==="zh")await page.screenshot({path:`${out}/viewer-${src.split('/').pop().replace('.webp','.jpg')}`,type:"jpeg",quality:86});
      await page.locator("[data-viewer-zoom]").click();
      assert.equal(await page.locator("[data-viewer-zoom]").getAttribute("aria-pressed"),"true");
      await page.keyboard.press("Escape");
      assert(await link.evaluate(e=>document.activeElement===e));
      report.viewers.push({lang,id,src,zoomAndFocus:true});
    }
    await page.close();
  }
  for(const lang of ["zh","en"]){
    const page=await browser.newPage();await page.goto(`${base}/${lang}/`);
    const link=page.locator('.h-collection-link');const text=(await link.innerText()).trim();
    assert.equal(text,lang==='zh'?'探索全部产品':'Explore all products');
    assert.equal(await link.getAttribute('href'),`/${lang}/products/#collection`);
    report.cta.push({lang,text});await page.close();
  }
  assert.equal(seen.size,materials.length);
  assert.equal(report.errors.length,0);
} finally {
  await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
  await browser.close();
}
console.log(`${report.layouts.length} layouts; ${report.pixels.length} repaired images; ${report.alignment.length} alignment checks; ${report.viewers.length} viewer checks; ${report.errors.length} script errors.`);
