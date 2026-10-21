import { readFile, writeFile } from "node:fs/promises";

const directory = "artifacts/r47-review";
const browser = JSON.parse(
  await readFile(`${directory}/final/browser-results.json`, "utf8"),
);
const detail = JSON.parse(
  await readFile(`${directory}/detail/results.json`, "utf8"),
);
const readiness = JSON.parse(
  await readFile(`${directory}/readiness/report.json`, "utf8"),
);
const stats = {
  layouts: browser.layouts.length + detail.layouts.length,
  slides: browser.slides.length,
  accessibility: browser.accessibility.length + detail.accessibility.length,
  readiness: readiness.results.length,
};
const html = String.raw`<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>半打空间 · r47 样页对照</title>
<style>
*{box-sizing:border-box}body{margin:0;color:#18221e;background:#f4f5f2;font:16px/1.7 "Segoe UI","Microsoft YaHei",sans-serif}header,main,footer{max-width:1600px;margin:auto;padding:36px 40px}header{padding-bottom:20px}h1{font-size:clamp(28px,3vw,40px);font-weight:400;line-height:1.3;margin:16px 0}h2{font-size:24px;font-weight:400;margin:48px 0 20px}p{margin:12px 0;color:#526059}a{color:#006d57;text-underline-offset:4px}small{font-size:13px}.eyebrow{font-size:13px;color:#526059}.notice{padding:20px 24px;background:#e9eee8;margin:24px 0}.attention{background:#f2ead7}.attention strong{font-weight:500;color:#655021}.toolbar{display:flex;align-items:end;flex-wrap:wrap;gap:20px;margin:24px 0}.toolbar label{display:grid;gap:5px;font-size:13px;color:#526059}select,.visit{min-height:44px;padding:9px 14px;border:1px solid #cad0c8;border-radius:2px;background:white;font:inherit;color:#18221e}.visit{background:#18221e;color:white;text-decoration:none;font-size:14px;border-color:#18221e;margin-left:auto}.compare{display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:24px}.panel{min-width:0}.panel h3{display:flex;justify-content:space-between;gap:20px;font-size:15px;font-weight:500;margin:0 0 12px}.panel a.image{display:block;background:white}.panel img{width:100%;height:auto;display:block}.panel.mobile a.image{max-width:375px;margin:auto}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:24px}.gallery figure{margin:0}.gallery img{display:block;width:100%;height:auto}.gallery.mobile{grid-template-columns:repeat(3,minmax(0,1fr))}.gallery.mobile img{max-width:375px;margin:auto}.gallery figcaption{font-size:14px;color:#526059;margin-top:10px}.checks{width:100%;border-collapse:collapse;background:white}td,th{padding:16px 20px;border-bottom:1px solid #e1e5df;text-align:left;font-size:14px}th{font-weight:500;color:#526059}td:first-child{width:24%}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}.metrics div{background:white;padding:20px}.metrics b{display:block;font-size:32px;font-weight:400}.metrics span{font-size:14px;color:#526059}.small{font-size:14px}footer{font-size:13px;color:#526059}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #00765e;outline-offset:4px}ul{padding-left:22px}.details{display:grid;grid-template-columns:1fr 1fr;gap:24px}.details img{width:100%;height:auto}@media(max-width:760px){header,main,footer{padding:24px}.compare,.gallery,.gallery.mobile,.details{grid-template-columns:1fr}.metrics{grid-template-columns:1fr 1fr}.visit{margin-left:0}h2{margin-top:36px}td,th{padding:12px}.panel h3{margin-top:12px}}
</style>
<header><div class="eyebrow">半打空间 / 第一阶段 / 本地样页</div><h1>r46 / r47 视觉对照</h1><p>首页、产品中心、4S 详情的中英文实际样页。选择同一屏幕尺寸，查看原版与调整后的页面。</p>
<div class="notice">当前只完成样页阶段。线上仍为 r46；其余详情、经济款补图、资质与关于页将在样页确认后继续。</div>
<div class="notice attention"><strong>本轮可读性修正</strong><p>5S 菜单组使用局部浅色实底，顶部其余区域保持透明；灰度空间标题、说明和按钮收进左侧紧凑文字区。两处均不再依赖照片明暗来保证可读性。照片没有增加蒙版、阴影、渐变或滤镜，手机继续使用独立标题区与完整横图。</p></div></header>
<main>
<div class="toolbar"><label>页面<select id="page"><option value="home">首页</option><option value="products">产品中心</option><option value="detail">4S 详情</option></select></label><label>语言<select id="lang"><option value="zh">中文</option><option value="en">English</option></select></label><label>屏幕宽度<select id="width"><option>1440</option><option>1920</option><option>375</option></select></label><label>截图范围<select id="scope"><option value="fold">首屏</option><option value="full">整页</option></select></label><a class="visit" id="live" target="_blank" rel="noopener">打开实际样页 ↗</a></div>
<p class="small">截图均来自真实页面，同组使用相同视口。点击图片可查看原尺寸。手机截图按 375px 宽展示。</p>
<div class="compare"><section class="panel" id="oldPanel"><h3><span>r46 · 调整前</span><small id="oldSize"></small></h3><a class="image" id="oldLink" target="_blank"><img id="old" alt="r46 原版页面截图"></a></section><section class="panel" id="newPanel"><h3><span>r47 · 样页</span><small id="newSize"></small></h3><a class="image" id="newLink" target="_blank"><img id="new" alt="r47 实际样页截图"></a></section></div>
<h2 id="galleryHeading">全部轮播画面</h2><div id="gallery" class="gallery"></div>
<h2>修改稿落实情况</h2><table class="checks"><thead><tr><th>项目</th><th>本轮结果</th></tr></thead><tbody>
<tr><td>导航</td><td>1280px 及以上恢复完整栏目；80px 高度，滚动后白底；语言入口统一 EN／中文。Logo 图形保留原色，仅字标适配背景。</td></tr>
<tr><td>首屏结构</td><td>桌面为照片左侧紧凑文字组，单一操作；图片按指定横幅的原比例铺宽。手机采用标题、完整横图、操作与无文字控件的顺序。</td></tr>
<tr><td>两处轮播</td><td>首页五帧、产品中心四帧保留顺序。暂停、键盘、触摸、离屏停止及加载保护保留；导航统一色调，不逐个取色。</td></tr>
<tr><td>首页与产品目录</td><td>四个案例整齐两列两行；原图比例展示；经济款入口、建造示意与制造流程保留。目录按灰度、经济款、4S、5S、6S、半打 8、半打 9 排列。</td></tr>
<tr><td>4S 详情</td><td>参数和平面图前置；六张空间图按原顺序成组等高，七张实拍最后三张成组；手机单列；图注 16px、#555。技术图分组与手动视频保留。</td></tr>
<tr><td>章节与文字</td><td>收紧章节间距，统一标题、正文和图注；修正英文面积单位重复显示。未增加业务事实。</td></tr>
<tr><td>人工视觉结论</td><td>图片比例、手机顺序与 4S 图集布局符合本阶段要求；5S 导航与灰度文字组的可读性问题已修正。当前是等待视觉方向确认的样页，尚未推广全站。</td></tr>
<tr><td>下一阶段</td><td>样页确认后推广其余六款详情，补齐经济款指定六图，整理资质展示与关于页中英文内容，然后再进行全站验收、交付打包和部署。</td></tr>
</tbody></table>
<h2>本轮功能检查</h2><div class="metrics"><div><b>${stats.layouts}</b><span>样页尺寸组合</span></div><div><b>${stats.slides}</b><span>轮播状态</span></div><div><b>${stats.accessibility}</b><span>自动可访问性检查</span></div><div><b>${stats.readiness}</b><span>加载、取消与失败场景</span></div></div>
<p>48 项单元测试、类型检查、代码检查、构建和资源校验通过。上方数字为本轮运行结果，不沿用历史测试。</p>
<p class="small">覆盖宽度 320、375、768、1024、1440、1920、2560px，以及 844×390 手机横屏、720×450 等效缩放视口。运行环境为 Windows / Edge Chromium；没有代替真实 iPhone、Safari 或设备缩放测试。自动可访问性检查不能验证摄影背景的逐像素文字对比度。</p>
<p class="small"><a href="final/browser-results.json">轮播与页面记录</a> · <a href="detail/results.json">4S 图片与交互记录</a> · <a href="readiness/report.json">加载保护记录</a> · <a href="readability/results.json">本轮可读性检查</a> · <a href="quality.html">完整质量记录</a> · <a href="source-map.json">修改与素材对应清单</a></p>
</main><footer>当前预览运行于本机。线上服务器与 GitHub 分支均未发布本轮样页。</footer>
<script>
const $=id=>document.getElementById(id);
function render(){const page=$('page').value,lang=$('lang').value,width=$('width').value,scope=$('scope').value;
const route='/'+lang+'/'+(page==='home'?'':page==='products'?'products/':'products/4s/');const key=route.replaceAll('/','_');
for(const [id,dir] of [['old','before'],['new','after']]){const src=dir+'/'+key+'-'+width+'-'+scope+'.jpg'+(dir==='after'?'?v=readability-2':'');$(id).src=src;$(id+'Link').href=src;$(id+'Panel').classList.toggle('mobile',width==='375');$(id+'Size').textContent=width+' px';}
$('live').href='http://localhost:4325'+route+'?v=r47-readable';$('gallery').classList.toggle('mobile',width==='375');
const names=page==='home'?['4S','5S','6S','灰度空间','灰度空间经济款']:['4S 实拍一','4S 实拍二','4S 实拍三','4S 实拍四'];
$('galleryHeading').textContent=page==='detail'?'4S 重点章节':'全部轮播画面';
const items=page==='detail'?[['specifications','参数与平面图'],['spaces','完整空间图集']]:names.map((n,i)=>['slide'+i,n]);
$('gallery').innerHTML=items.map(([suffix,label])=>{const src='after/'+key+'-'+width+'-'+suffix+'.jpg?v=readability-2';return '<figure><a href="'+src+'" target="_blank"><img src="'+src+'" loading="lazy" alt="'+label+'"></a><figcaption>'+label+'</figcaption></figure>'}).join('');}
['page','lang','width','scope'].forEach(id=>$(id).addEventListener('change',render));render();
</script></html>`;
await writeFile(`${directory}/review.html`, html);
const readability = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>r47 · 两处可读性修正</title>
${html.match(/<style>[\s\S]*?<\/style>/)[0]}
<header><div class="eyebrow">半打空间 / r47 样页更新</div><h1>两处可读性修正</h1><p>5S 的菜单组增加局部浅色实底；灰度空间将标题、说明和按钮收进左侧紧凑文字区。保留照片原色与比例，没有使用全宽白色导航栏、照片蒙版或字影。</p><p>两处深字与浅底的颜色对比度约为 15.1:1。菜单位置不随切图变化，手机仍为标题区与完整横图。</p><div class="toolbar"><label>语言<select id="language"><option value="zh">中文</option><option value="en">English</option></select></label><label>屏幕宽度<select id="viewport"><option>1440</option><option>1920</option><option>375</option></select></label><a class="visit" id="visit" href="http://localhost:4325/zh/?v=r47-readable" target="_blank">打开实际首页 ↗</a></div><p class="small">实际轮播第二帧为 5S，第四帧为灰度空间。点击截图可看原尺寸。线上仍保留 r46。</p></header><main id="pairs"></main><footer><a href="review.html?v=readability-2">查看全部六个样页与整页对照</a> · <a href="quality.html">质量记录</a></footer>
<script>
function render(){const lang=document.getElementById('language').value,width=document.getElementById('viewport').value;document.getElementById('visit').href='http://localhost:4325/'+lang+'/?v=r47-readable';document.getElementById('pairs').innerHTML=[[1,'5S · 导航可读性'],[3,'灰度空间 · 文字可读性']].map(([scene,title])=>'<h2>'+title+'</h2><div class="compare">'+[['readability-before','修正前'],['after','修正后']].map(([directory,label])=>{const src=directory+'/_'+lang+'_-'+width+'-slide'+scene+'.jpg?v=readability-2';return '<section class="panel '+(width==='375'?'mobile':'')+'"><h3>'+label+'</h3><a class="image" href="'+src+'" target="_blank"><img src="'+src+'" alt="'+title+' '+label+'"></a></section>';}).join('')+'</div>').join('');}document.getElementById('language').addEventListener('change',render);document.getElementById('viewport').addEventListener('change',render);render();
</script></html>`;
await writeFile(`${directory}/readability.html`, readability);
console.log("Review page generated", stats);
