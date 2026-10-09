"""Prepare approved web assets from the inspected, numbered source archive.

Usage: python scripts/import-materials.py <inspection-folder>
Requires Pillow, PyMuPDF and openpyxl. Original documents remain outside public/.
Source IDs are recorded in docs/materials-manifest.json, never published as files.
"""
import sys
import json
import re
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
OUT = ROOT / 'public/assets/img'
BRAND = ROOT / 'public/assets/brand'
BRAND.mkdir(parents=True, exist_ok=True)
manifest = json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))
uses = {}


def record(n, purpose, outputs=()):
    uses.setdefault(n, []).append({'purpose': purpose, 'webResources': list(outputs)})


def source(n):
    return SOURCE / f"{n:03}{Path(manifest[n]['path']).suffix.lower()}"


def photo(n, base, caption):
    im = ImageOps.exif_transpose(Image.open(source(n))).convert('RGB')
    desktop = im.copy()
    desktop.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
    desktop.save(OUT / f'{base}.webp', quality=83, method=6)
    desktop.save(OUT / f'{base}.jpg', quality=84, optimize=True, progressive=True)
    mobile = im.copy()
    mobile.thumbnail((960, 960), Image.Resampling.LANCZOS)
    mobile.save(OUT / f'{base}-m.webp', quality=80, method=6)
    record(n, caption, [f'/assets/img/{base}{suffix}' for suffix in ('.webp', '-m.webp', '.jpg')])


# AI contains vector PDF artwork. Keep original geometry, remove duplicate CAD strokes.
document = pymupdf.open(source(18))
page = document[0]
bounds = pymupdf.Rect()
for drawing in page.get_drawings():
    bounds |= drawing['rect']
page.set_cropbox(bounds)
raw_svg = page.get_svg_image()
# The AI also embeds a raster proof and CAD outlines. Keep only its eight filled
# vector paths, including the compound glyph path, with their original transforms.
paths = re.findall(r'<path\b[^>]*fill="#[0-9a-fA-F]+"[^>]*/>', raw_svg)
assert len(paths) == 8, 'Unexpected logo artwork: inspect before exporting.'
svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="541.741" viewBox="0 0 1920 541.741">' + ''.join(paths) + '</svg>'
for theme in ('dark', 'light'):
    colored = svg if theme == 'dark' else svg.replace('#122e3b', '#ffffff').replace('#636466', '#85928b')
    (BRAND / f'logo-{theme}.svg').write_text(colored, encoding='utf-8')
record(18, '正式矢量标识；AI 内嵌 PDF 路径导出，保持原始比例；深浅背景版本', ['/assets/brand/logo-dark.svg', '/assets/brand/logo-light.svg'])
# Favicon uses only the supplied six-square symbol, not a newly invented mark.
icon = svg.replace('viewBox="0 0 1920 541.741"', 'viewBox="-24 -24 590 590"').replace('width="1920" height="541.741"', 'width="64" height="64"')
(ROOT / 'public/favicon.svg').write_text(icon, encoding='utf-8')

for n, base, caption in [
    (0, 'product-4s-module', '4S 工厂完成的厨卫模块'),
    (1, 'product-4s-mold', '4S 墙板与构件模具'),
    (2, 'product-4s-panels', '4S 预制墙板'),
    (3, 'product-4s-roof', '4S 木结构屋顶安装'),
    (6, 'product-4s-interior', '4S 室内与阁楼'),
    (29, 'founder-huang-kun', '关于页：创始人黄昆肖像'),
]:
    photo(n, base, caption)

groups = [
    ('cayman', 44, range(40, 44)), ('brisbane', 49, range(45, 49)),
    ('zhongshan-fengdu', 54, range(50, 54)), ('zhongshan-mige', 60, range(55, 60)),
    ('zhongshan-cabins', 65, range(61, 65)), ('chengdu', 70, range(66, 70)),
    ('shenzhen', 76, range(71, 76)), ('fiji', 83, range(77, 83)),
    ('jiangmen', 89, range(84, 89)), ('changzhou', 39, range(36, 39)),
]
for key, cover, details in groups:
    photo(cover, f'project-{key}-cover', f'案例 {key}：项目封面')
    for i, n in enumerate(details, 1):
        photo(n, f'project-{key}-{i:02}', f'案例 {key}：现场记录 {i:02}，仅归属本项目')

# Exact source pixels with more than four modules of quiet space on all sides.
qr = Image.open(source(91)).convert('RGB')
for name, box in [('wang', (224, 193, 583, 552)), ('huang', (706, 179, 1080, 553)), ('tang', (1202, 189, 1568, 555))]:
    cropped = qr.crop((box[0] - 4, box[1] - 4, box[2] + 4, box[3] + 4))
    padded = Image.new('RGB', (max(cropped.size) + 96,) * 2, 'white')
    padded.paste(cropped, ((padded.width - cropped.width) // 2, (padded.height - cropped.height) // 2))
    padded.save(OUT / f'wechat-{name}.png', optimize=True)
    record(91, f'{name} 联系人微信二维码：原像素无损裁切，四周至少 48px 留白', [f'/assets/img/wechat-{name}.png'])
map_image = Image.open(source(92)).convert('RGB')
map_image.save(OUT / 'contact-map.webp', quality=90, method=6)
record(92, '联系页静态地图，完整保留地图图像及归属信息', ['/assets/img/contact-map.webp'])

# Share card is a typographic layout over the approved product photograph.
share = ImageOps.fit(Image.open(source(12)).convert('RGB'), (1200, 630), method=Image.Resampling.LANCZOS, centering=(.5, .5))
shade = Image.new('RGBA', share.size)
draw = ImageDraw.Draw(shade)
for x in range(1200):
    draw.line((x, 0, x, 630), fill=(8, 16, 12, int(190 * (1 - x / 1200) + 10)))
share = Image.alpha_composite(share.convert('RGBA'), shade)
logo_doc = pymupdf.open(BRAND / 'logo-light.svg')
pix = logo_doc[0].get_pixmap(matrix=pymupdf.Matrix(.15, .15), alpha=True)
logo = Image.frombytes('RGBA', (pix.width, pix.height), pix.samples)
share.alpha_composite(logo, (66, 57))
draw = ImageDraw.Draw(share)
font_path = ROOT / 'artifacts/NotoSansSC.ttf'
font = ImageFont.truetype(str(font_path), 56)
small = ImageFont.truetype(str(font_path), 20)
font.set_variation_by_axes([400])
small.set_variation_by_axes([400])
draw.text((64, 332), '让空间，回归生活。', font=font, fill='white')
draw.text((67, 431), '装配式混凝土空间的设计与制造', font=small, fill='#e2e7e2')
share.convert('RGB').save(OUT / 'share-banda.jpg', quality=90, optimize=True)
record(12, '分享图摄影，与正式 Logo 重新排版，不含报价', ['/assets/img/share-banda.jpg'])

# Existing approved photography remains visually unchanged.
for n, base in [(4,'product-4s-dusk'),(5,'product-4s-detail-wall'),(8,'product-4s-hero'),(10,'product-5s-hero'),(12,'product-6s-hero'),(14,'product-grayscale-hero')]:
    record(n, '保留已认可的同源产品摄影', [f'/assets/img/{base}.jpg', f'/assets/img/{base}.webp', f'/assets/img/{base}-m.webp'])
for n in [9,11,13,15,16,17,21,22,27,28,30,33,34,35,90,108,109,110]:
    record(n, '仅提取已核对事实，重排为网页；不发布原表、海报、报价或嵌入式户型截图')
for n in range(93,107):
    record(n, '仅网页摘要：送检主体、样品、报告编号；历史授权/获奖主体；原文件不公开')
rows = []
for entry in manifest:
    n = entry['id']
    rows.append({'id': n, 'source': entry['source'], 'bytes': entry['bytes'],
                 'decision': '使用或事实来源' if n in uses else '保留内部，未部署',
                 'uses': uses.get(n, []),
                 'note': '隐私政策含残留文字且与本地下载行为不一致，待核对' if n == 24 else
                         '专利清单状态与证书存在差异，仅采用证书支持的历史授权事实' if n == 107 else ''})
(ROOT / 'docs/materials-manifest.json').write_text(json.dumps({'total': len(rows), 'policy': '资料原件不进入公开目录；产品无公开价格；新摄影只做缩放压缩、不修改建筑内容', 'files': rows}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Prepared assets and provenance for {len(rows)} source files.')
