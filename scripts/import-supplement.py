"""Extract the approved supplement images without publishing the source PDFs.

Usage: python scripts/import-supplement.py <资料2.zip>
Requires PyMuPDF and Pillow. Image objects are extracted, never page screenshots.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import hashlib
import json
import sys
import pymupdf
from PIL import Image, ImageOps, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/img'
archive = ZipFile(sys.argv[1])
ledger_path = ROOT / 'docs/materials-manifest.json'
ledger = json.loads(ledger_path.read_text(encoding='utf-8'))
supplement = {'archive': Path(sys.argv[1]).name, 'documents': []}
image_checks = []


def product_read(slug):
    path = ROOT / f'src/content/products/{slug}.md'
    parts = path.read_text(encoding='utf-8').split('---', 2)
    return path, json.loads(parts[1]), parts[2]


def extract(doc, page_number, base, caption, technical=False):
    candidates = doc[page_number - 1].get_images(full=True)
    item = max(candidates, key=lambda item: item[2] * item[3])
    source = doc.extract_image(item[0])
    picture = ImageOps.exif_transpose(Image.open(BytesIO(source['image']))).convert('RGB')
    paths = []
    if technical:
        picture.save(OUT / f'{base}.png', optimize=True)
        picture.save(OUT / f'{base}.webp', lossless=True, method=6)
        paths = [f'/assets/img/{base}{suffix}' for suffix in ('.png', '.webp')]
        data = {'src': paths[0], 'viewerSrc': paths[1], 'caption': caption,
                'width': picture.width, 'height': picture.height}
    else:
        desktop = picture.copy()
        desktop.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        desktop.save(OUT / f'{base}.jpg', quality=86, optimize=True, progressive=True)
        desktop.save(OUT / f'{base}.webp', quality=84, method=6)
        mobile = picture.copy()
        mobile.thumbnail((960, 960), Image.Resampling.LANCZOS)
        mobile.save(OUT / f'{base}-m.webp', quality=82, method=6)
        paths = [f'/assets/img/{base}{suffix}' for suffix in ('.jpg', '.webp', '-m.webp')]
        data = {'base': base, 'caption': caption, 'width': desktop.width,
                'height': desktop.height, 'mobileWidth': mobile.width}
    provenance = {'page': page_number, 'imageObject': item[0],
                  'sourcePixels': [picture.width, picture.height],
                  'sourceImageSha256': hashlib.sha256(source['image']).hexdigest(),
                  'kind': 'diagram' if technical else 'render',
                  'purpose': caption, 'webResources': paths}
    for resource in paths:
        saved = Image.open(ROOT / 'public' / resource.lstrip('/')).convert('RGB')
        assert saved.width <= picture.width and saved.height <= picture.height
        assert abs(saved.width / saved.height - picture.width / picture.height) < .003
        if technical:
            assert ImageChops.difference(saved, picture).getbbox() is None
    image_checks.append({'base': base, 'page': page_number, 'kind': provenance['kind'],
                         'nativeOrSmaller': True, 'ratioPreserved': True,
                         'pixelsMatchOriginal': technical})
    return data, provenance


selections = {
    '4s': ('4S~', [
        (4, 'front', '正面外观'), (8, 'living', '客餐厅'),
        (7, 'loft', '阁楼空间'), (9, 'bedroom', '卧室'),
        (10, 'kitchen', '厨房'), (12, 'bathroom', '卫浴'),
    ], '标准版方案效果图', 5, 'packing', '半打 4S / 双集装箱装运示意'),
    'grayscale': ('60m', [
        (2, 'front', '正面外观'), (4, 'side', '侧面外观'),
        (8, 'living', '客厅'), (9, 'dining', '餐厅'),
        (10, 'kitchen', '厨房'), (11, 'bedroom', '卧室'),
    ], '方案效果图', 5, 'layouts', '灰度空间 / 住宅与办公布局示意'),
}
for slug, (match, pages, label, diagram_page, diagram_name, diagram_caption) in selections.items():
    name = next(n for n in archive.namelist() if match in n and n.lower().endswith('.pdf'))
    pdf_bytes = archive.read(name)
    doc = pymupdf.open(stream=pdf_bytes, filetype='pdf')
    entry = {'source': name, 'sha256': hashlib.sha256(pdf_bytes).hexdigest(),
             'pages': len(doc), 'uses': [], 'deferred': []}
    path, data, tail = product_read(slug)
    data['heroCaption'] = f"{data['name']} / 外观效果图"
    data['designGallery'] = []
    data['designNote'] = f'{label}，展示空间与布局参考；具体配置以项目确认资料为准。'
    for page, suffix, subject in pages:
        media, record = extract(doc, page, f'product-{slug}-design-{suffix}',
                                f'{subject} / {label}')
        data['designGallery'].append(media)
        entry['uses'].append(record)
    media, record = extract(doc, diagram_page, f'product-{slug}-{diagram_name}', diagram_caption, True)
    data['diagrams'] = [media]
    entry['uses'].append(record)
    if slug == '4s':
        data['galleryTitle'] = '从构件，到生活的细节。'
        data['galleryIntro'] = '三组功能模块与四片墙板，连接工厂制造与现场装配。'
        data['diagramTitle'] = '从工厂，走向场地。'
        data['diagramLabel'] = '装运示意'
        data['diagramIntro'] = '2 个 40 尺 HC 集装箱／套。图示为装运参考，实际装运按项目确认。'
        for photo in data['gallery']:
            if '实拍' not in photo['caption']:
                photo['caption'] += ' / 实拍'
        entry['deferred'] = [{'pages': [3, 14, 15, 16, 17],
                             'reason': '同册阁楼36㎡与38㎡并存，首层62.88㎡与现有63㎡口径待核对；暂缓户型、立面及尺寸图，保留现有参数。'}]
    else:
        data['diagramTitle'] = '居住与办公，两种可能。'
        data['diagramLabel'] = '住宅与办公'
        data['diagramIntro'] = '两种使用方案，回应不同的空间需求。图中尺寸按原资料保留，具体布局以项目设计确认为准。'
        entry['deferred'] = [{'pages': [3, 7], 'reason': '同源外观与室内画面已在网站使用，本轮不重复增加。'},
                             {'pages': [6], 'reason': '立面图保留为内部参考，本轮只展示已选布局示意。'}]
    path.write_text('---\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n---' + tail, encoding='utf-8')
    supplement['documents'].append(entry)

for slug in ['5s', '6s']:
    path, data, tail = product_read(slug)
    data['heroCaption'] = f"{data['name']} / 外观效果图"
    path.write_text('---\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n---' + tail, encoding='utf-8')

name = next(n for n in archive.namelist() if '风系列' in n and n.lower().endswith('.pdf'))
supplement['documents'].append({'source': name, 'sha256': hashlib.sha256(archive.read(name)).hexdigest(),
    'pages': 18, 'uses': [{'pages': [3, 7, 11, 12, 17], 'purpose': '核对四款产品参数、效果图归属及版本差异；无新增公开资源。', 'webResources': []}],
    'deferred': [{'reason': '价格、额外型号及轻奢配置不公开；不用于替换标准版配置。'}]})
ledger['supplement'] = supplement
ledger['total'] = len(ledger['files']) + len(supplement['documents'])
ledger_path.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(ROOT / 'artifacts').mkdir(exist_ok=True)
(ROOT / 'artifacts/supplement-image-audit.json').write_text(json.dumps({
    'passed': True, 'renderings': sum(c['kind'] == 'render' for c in image_checks),
    'losslessDiagrams': sum(c['kind'] == 'diagram' for c in image_checks),
    'checks': image_checks,
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Prepared 12 renderings and 2 lossless technical diagrams; preserved the 115-file ledger and added 3 PDF sources.')
