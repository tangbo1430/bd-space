"""Prepare the explicitly reviewed, low-risk r79 changes from the r76 checkout.

This is a one-shot audit utility. It rechecks source hashes before importing
individual image derivatives; it does not merge the rejected r78 layout.
"""
from pathlib import Path
import hashlib
import json
import shutil

root = Path(__file__).resolve().parent.parent
previous = Path('C:/Users/Administrator/Documents/web-test')
material = previous / 'artifacts/r77-material-review/materials/5'

def replace(path, before, after, count=1):
    path = root / path
    value = path.read_text(encoding='utf-8')
    assert value.count(before) == count, (path, before[:80], value.count(before))
    path.write_text(value.replace(before, after), encoding='utf-8')

# These two component diffs contain only optional subtitle / image inputs.
for name in ['HeroCarousel.astro', 'SystemsTriptych.astro']:
    shutil.copy2(previous / 'src/components' / name, root / 'src/components' / name)

replace('src/pages/zh/index.astro', 'desktopImage: "/assets/img/r65-layered-4s.webp",\n    headerTone: "dark" as const,', 'desktopImage: "/assets/img/r78-home-4s.webp",\n    headerTone: "light" as const,\n    brandTone: "light" as const,')
replace('src/pages/zh/index.astro', 'desktopImage: "/assets/img/r66-layered-grayscale.webp",', 'desktopImage: "/assets/img/r78-home-grayscale.webp",')
replace('src/pages/zh/index.astro', 'base: `r4-banner-${s.id}`,\n  mobileImage: `/assets/img/r4-banner-${s.id}-m.webp`,', 'base: ["4s", "grayscale"].includes(s.id) ? `r78-home-${s.id}` : `r4-banner-${s.id}`,\n  mobileImage: ["4s", "grayscale"].includes(s.id) ? `/assets/img/r78-home-${s.id}-m.webp` : `/assets/img/r4-banner-${s.id}-m.webp`,')
replace('src/pages/zh/index.astro', 'base: "r4-making-design",', 'base: "r78-design",')
replace('src/pages/zh/index.astro', 'base={p.main}', 'base={p.id === "4s" ? "r78-home-4s" : p.main}')
replace('src/pages/zh/index.astro', '''headingLines={
        english
          ? ["Design and manufacturing,", "in one system"]
          : ["设计与制造，", "在同一个系统里"]
      }''', '''heading={english ? "Ways to build" : "建造方式"}
      subheading={english ? "Three ways to build, for possibilities around the world." : "用三种建造方式，接住全球市场的所有可能"}
      images={{panels:"r78-system-panels", hybrid:"r78-system-hybrid"}}''')

# Keep catalog markup/order intact. Only its existing carousel data changes.
old_catalog = (previous / 'src/pages/zh/products/index.astro').read_text(encoding='utf-8')
photo_data = old_catalog.split('const photoHeadings =')[1].split('const slides =')[0]
path = root / 'src/pages/zh/products/index.astro'
value = path.read_text(encoding='utf-8')
start = value.index('const photoHeadings =')
end = value.index('const slides =')
value = value[:start] + 'const photoHeadings =' + photo_data + value[end:]
value = value.replace('`r4-catalog-photo-${i + 1}`', '`r78-catalog-${i + 1}`').replace('/assets/img/r4-catalog-photo-', '/assets/img/r78-catalog-').replace('/assets/img/r68-catalog-original-', '/assets/img/r78-catalog-')
value = value.replace('heading: photoHeadings[i],', 'heading: photoHeadings[i],\n  subtitle: photoCopy[i],')
value = value.replace('{english ? "BD-4S · Photography" : "半打 4S · 实拍"}', '{photoCopy[0]}')
path.write_text(value, encoding='utf-8')
# Reviewed diff: per-slide subtitle and reserved mobile caption height only.
shutil.copy2(previous / 'src/scripts/main.ts', root / 'src/scripts/main.ts')
shutil.copy2(previous / 'src/styles/hero.css', root / 'src/styles/hero.css')

replace('src/styles/header-vessel.css', 'font-size: 15px;\n  font-weight: 500;', 'font-size: 16px;\n  font-weight: 600;')
replace('src/data/company.ts', '  { id: "wang", name: "王先生", phone: "18073804567" },\n', '')
replace('src/data/company.ts', '  { id: "tang", name: "唐小姐", phone: "18503005860" },', '  { id: "tang", name: "唐小姐", phone: "18503005860" },\n  { id: "wang", name: "王先生", phone: "13600001448", additionalPhone: "+852 6725 6153" },')
replace('src/pages/zh/contact.astro', '''const people = [
  contacts.find((p) => p.id === "tang")!,
  ...contacts.filter((p) => p.id !== "tang"),
];''', 'const people = contacts;')
replace('src/pages/zh/contact.astro', '                  <span class="qr-instruction">', '                  {p.additionalPhone && <a class="contact-phone contact-phone--additional" href={`tel:${p.additionalPhone.replaceAll(" ", "")}`}>{p.additionalPhone}</a>}\n                  <span class="qr-instruction">')
replace('src/styles/contact.css', '.qr-instruction {\n  display: block;', '.contact-phone--additional { display: table; }\n.qr-instruction {\n  display: block;')

replace('src/components/ProductComparison.astro', 'justify-content: space-between;', 'justify-content: flex-start;')
replace('src/components/ProductComparison.astro', '  thead th {', '  tr > :nth-child(2) { background: #fff; }\n  tr > :nth-child(3) { background: #f5f6f4; }\n  thead th {', count=2)
# Keep a small internal gutter so the white comparison column reads as a unit.
replace('src/components/ProductComparison.astro', '  tr > :nth-child(2) { background: #fff; }', '  tr > :nth-child(2) { background: #fff; padding-left: 16px; }', count=2)

# Patent text is rechecked against the original certificate bodies, not names.
shutil.copy2(previous / 'src/data/credentials.ts', root / 'src/data/credentials.ts')
replace('src/pages/zh/qualifications.astro', '''const patentCerts = Array.from({ length: 17 }, (_, i) => ({
  base: `r4-patent-${String(i + 1).padStart(2, "0")}`,
  caption: i < 6 ? "发明专利证书" : "实用新型专利证书",
}));''', '''const patentCerts = [
  ...Array.from({ length: 17 }, (_, i) => ({
    base: `r4-patent-${String(i + 1).padStart(2, "0")}`,
    caption: i < 6 ? "发明专利证书" : "实用新型专利证书",
  })),
  ...patents.slice(-3).map((p, i) => ({base: `r77-patent-${i + 1}`, caption: `${p.title} · ${p.number}`})),
];''')
replace('src/pages/zh/qualifications.astro', '共 17 项：发明专利 6 项、实用新型专利 11 项。', '共 20 项：发明专利 6 项、实用新型专利 14 项。')

# The diagram is its own row; adding it must not reflow existing elevation pairs.
path = root / 'src/content/products/grayscale-eco.md'
data = json.loads(path.read_text(encoding='utf-8').split('---')[1])
data['diagrams'].append({'src':'/assets/img/r77-eco-packing.webp','viewerSrc':'/assets/img/r77-eco-packing.webp','caption':'灰度空间经济款 · 装箱方案 / 技术示意','width':1001,'height':747})
path.write_text('---\n'+json.dumps(data, ensure_ascii=False, indent=2)+'\n---\n', encoding='utf-8')

selected = {'r78-home-4s','r78-home-grayscale','r78-system-panels','r78-system-hybrid','r78-design','r77-eco-packing',*[f'r78-catalog-{i}' for i in range(1,5)],*[f'r77-patent-{i}' for i in range(1,4)]}
records = json.loads((previous / 'docs/r78-material-map.json').read_text(encoding='utf-8'))
dimension_path = root / 'src/data/image-dimensions.json'
dimensions = json.loads(dimension_path.read_text(encoding='utf-8'))
old_dimensions = json.loads((previous / 'src/data/image-dimensions.json').read_text(encoding='utf-8'))
verified = []
for record in records:
    base = record.get('base')
    if base not in selected: continue
    source = material / record['source']
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert digest == record['sourceSHA256'], source
    outputs = []
    for folder in ['img','thumbs']:
        for suffix in ['.jpg','.webp','-m.webp'] if folder=='img' else ['.webp']:
            src = previous / f'public/assets/{folder}/{base}{suffix}'
            if not src.exists(): continue
            dst = root / f'public/assets/{folder}/{base}{suffix}'
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src,dst)
            key = f'/assets/{folder}/{base}{suffix}'
            if key in old_dimensions: dimensions[key] = old_dimensions[key]
            outputs.append({'path':key,'sha256':hashlib.sha256(dst.read_bytes()).hexdigest()})
    verified.append({**record,'r79SourceRechecked':True,'outputs':outputs})
assert len(verified) == len(selected)
dimension_path.write_text(json.dumps(dimensions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'docs/r79-material-map.json').write_text(json.dumps(verified,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Only add dictionary entries introduced by these selected changes.
translations_path = root/'src/data/en.json'
translations = json.loads(translations_path.read_text(encoding='utf-8'))
old_translations = json.loads((previous/'src/data/en.json').read_text(encoding='utf-8'))
texts = '\n'.join((root/p).read_text(encoding='utf-8') for p in ['src/pages/zh/index.astro','src/pages/zh/qualifications.astro','src/data/credentials.ts','src/content/products/grayscale-eco.md'])
for key, value in old_translations.items():
    if key in texts: translations[key] = value
translations_path.write_text(json.dumps(translations,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Imported {len(verified)} independently verified source assets; r76 layouts retained.')
