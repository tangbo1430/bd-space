"""Assemble local review evidence; no site assets or server state are modified."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
from datetime import datetime, timezone
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent
review = root / "artifacts/r47-review"
captures = json.loads((review / "after/captures.json").read_text(encoding="utf-8"))
for item in captures:
    if not item["route"].endswith("/4s/"):
        continue
    prefix = f'{item["key"]}-{item["width"]}'
    with Image.open(review / "after" / f"{prefix}-full.jpg") as screenshot:
        for name, rect in item["sections"].items():
            if rect:
                # Crop the true full-page screenshot, avoiding the fixed masthead
                # that Playwright's scrolling element screenshots can duplicate.
                box = (rect["x"], rect["y"], rect["x"] + rect["width"], rect["y"] + rect["height"])
                screenshot.crop(box).save(review / "after" / f"{prefix}-{name}.jpg", quality=86)

baseline = review / "r46-source-before.zip"
changes = []
with ZipFile(baseline) as archive:
    originals = {name: sha256(archive.read(name)).hexdigest() for name in archive.namelist()}
    for folder in ["src", "scripts", "tests", "docs"]:
        for path in (root / folder).rglob("*"):
            if path.is_file() and "__pycache__" not in path.parts:
                relative = path.relative_to(root).as_posix()
                digest = sha256(path.read_bytes()).hexdigest()
                if originals.get(relative) != digest:
                    changes.append({"file": relative, "sha256": digest, "change": "modified" if relative in originals else "added"})
    for name in ["astro.config.mjs"]:
        digest = sha256((root / name).read_bytes()).hexdigest()
        if originals.get(name) != digest:
            changes.append({"file": name, "sha256": digest, "change": "modified"})

mapping = {
    "stage": "r47 sample review only",
    "generatedUtc": datetime.now(timezone.utc).isoformat(),
    "baseline": "r46 working tree snapshot, not clean Git HEAD",
    "sourceSnapshot": "r46-source-before.zip (source/config/tests; existing public assets retained separately)",
    "published": False,
    "changes": changes,
    "materials": [
        {"use": "homepage carousel", "files": [f"public/assets/img/r4-banner-{name}.jpg" for name in ["4s", "5s", "6s", "grayscale", "grayscale-eco"]], "operation": "reuse original files; no retouching, mask or crop"},
        {"use": "catalog carousel", "files": [f"public/assets/img/r4-catalog-photo-{i}.jpg" for i in range(1, 5)], "operation": "reuse original files; follow per-image aspect ratio"},
        {"use": "4S experience", "files": [f"public/assets/img/r4-4s-space-{i}.jpg" for i in range(1, 7)], "operation": "reuse same order; proportional equal-height rows"},
        {"use": "4S site photographs", "files": [f"public/assets/img/r4-4s-site-{i}.jpg" for i in range(1, 8)], "operation": "reuse same order; last three grouped; videos and technical gallery retained"},
        {"use": "case photographs", "source": "src/data/projects.json: cayman, changzhou, zhongshan-mige, brisbane", "operation": "reuse full source proportions; no hover zoom"},
    ],
    "deferred": ["other six product detail layouts", "economy six-image curation", "qualification presentation", "Chinese responsive about page and English content", "full-site approval, deployment and release archives"],
}
(review / "source-map.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")
with ZipFile(review / "r47-sample-changes.zip", "w", ZIP_DEFLATED, compresslevel=6) as archive:
    for item in changes:
        archive.write(root / item["file"], item["file"])
    archive.write(review / "source-map.json", "r47-source-map.json")

quality = """<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>r47 样页质量记录</title>
<style>body{max-width:960px;margin:48px auto;padding:0 24px;color:#18221e;font:16px/1.8 'Segoe UI','Microsoft YaHei',sans-serif}h1,h2{font-weight:400;line-height:1.4}h1{font-size:34px}h2{font-size:24px;margin-top:40px}table{border-collapse:collapse;width:100%}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left;font-size:14px}a{color:#006d57}p{color:#526059}.note{background:#f3ecdc;padding:20px}</style>
<a href="review.html">返回视觉对照</a><h1>r47 样页质量记录</h1>
<p>基线：r46 当前工作区（包含未提交内容）。范围：中文／英文首页、产品中心及 4S 详情。本轮不更新线上，不推送或合并 GitHub。</p>
<h2>功能验证：通过</h2><table><tr><th>项目</th><th>本轮结果</th></tr>
<tr><td>类型检查 / lint</td><td>0 errors、0 warnings（提示详见 type-check.log）；ESLint 通过。</td></tr>
<tr><td>单元测试</td><td>5 个文件，48 项通过。</td></tr>
<tr><td>构建 / 资源</td><td>35 页构建成功；527 条图片及响应式资源引用存在；release 检查与 34 项 r4 内容检查通过。</td></tr>
<tr><td>轮播页面</td><td>36 个页面／视口组合、162 个轮播状态；中英文首页和产品中心各完成暂停、恢复、触摸与离屏停止检查。</td></tr>
<tr><td>加载保护</td><td>32 组延迟加载、取消切换、键盘竞争及加载失败场景通过。目标图片解码完成后切换。</td></tr>
<tr><td>4S 详情</td><td>18 个页面／视口组合；4 组阅图缩放、首尾循环、技术分组、焦点恢复、章节锚点及手动视频播放检查通过。</td></tr>
<tr><td>案例图像</td><td>18 个中英文视口组合：4 张案例图原比例、无内部空白条、悬停不裁切。</td></tr>
<tr><td>自动可访问性</td><td>375px 与 1440px 下的 12 个样页组合，无 axe WCAG A/AA 违规。此结果不证明照片上的全部文字对比度合格。</td></tr>
<tr><td>最终截图</td><td>6 页 × 3 尺寸 = 18 组首屏和整页对照；两处轮播全部 54 个画面截图。检查标题最多两行、图片加载、无横向溢出及英文面积单位。</td></tr></table>
<h2>人工视觉：两处可读性已修正，样页待确认</h2>
<p>已检查原比例横幅、手机完整图片顺序、桌面导航层级、四案例网格、4S 参数前置与横竖图成组。已修正旧案例悬停放大规则、图注重复间距、手机断句、英文面积单位重复与缓存图片切换空白风险。</p>
<div class="note">5S 使用仅覆盖菜单组的浅色实底，不做全宽白色导航栏；灰度空间使用左侧紧凑文字区，深字配浅底。照片保持原色、原比例，不增加蒙版、阴影或滤镜。中英文、1280–2560px 桌面及手机均复核；两处文字／实底颜色对比度超过 4.5:1，导航尺寸和位置不随切图变化。该局部承托是本次为解决可读性而作出的明确调整，替代这两处纯透明叠字。</div>
<p>本轮依修改稿与已确认计划执行。Taste 静态扫描提示的 shadow 命中包含 text-shadow:none／box-shadow:none；细线导航状态和菜单图标是当前既定组件，未按通用审美规则删除。Taste 自带浏览器检查器报 “Not attached to an active page”，未成功完成；以实际 Playwright/Edge 截图、CSS 几何检查与人工复核补充。没有宣称该技能检查器通过。</p>
<p>本次补测：<a href="readability/results.json">48 组中英文可读性、主题切换与恢复检查</a>。已重新运行轮播页面回归、类型检查、lint、单元测试与构建；其余图集和案例专项结果来自同一 r47 样页阶段，非此次重复执行。</p><h2>环境与覆盖边界</h2><p>Windows / Edge Chromium，无头浏览器。覆盖 320、375、768、1024、1440、1920、2560px；844×390 横屏；720×450 为 200% 等效视口，并非真实设备缩放。未覆盖 Safari、真实 iPhone、不同系统字体渲染或公网部署。本轮结果来自新的测试文件与报告；r46 截图只用于视觉对照，不作为本轮通过依据。</p>
<h2>后续与文件</h2><p>按用户确定的“先确认样页”流程，待样页方向确认后，继续其余六款产品、经济款六图、资质与关于页；完成全站验收后再生成完整源码／静态发布包并部署。当前提供的 ZIP 是相对 r46 工作区的增量源码，不能单独部署。</p>
<p><a href="r47-sample-changes.zip">r47 样页增量源码</a> · <a href="source-map.json">源码哈希与素材映射</a> · <a href="r46-source-before.zip">r46 源码基线快照</a></p>
<p>本轮所有图片复用已有网页资源，未新增素材、价格、完整资料下载或业务宣称。</p></html>"""
(review / "quality.html").write_text(quality, encoding="utf-8")
print(f"Review finalized: {len(changes)} changed source/test files; technical report + cropped section screenshots.")
