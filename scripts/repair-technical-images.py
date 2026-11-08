"""Targeted r88 repair; preserve dimensions, order, copy and all other assets."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageOps, ImageChops
from technical_image import on_paper

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('C:/Users/Administrator/Documents/web-test/artifacts/r77-material-review/materials/5/2产品中心')
ledger = json.loads((ROOT/'docs/r82-product-materials.json').read_text(encoding='utf-8'))
affected = {f'r82-bd11-diagram-{i}' for i in range(1, 10)} | {f'r82-qiyuan-diagram-{i}' for i in range(3)} | {'r82-snow11-diagram-0'}
records = []
for slug in ('bd11', 'qiyuan', 'snow11'):
    path = ROOT/f'src/content/products/{slug}.md'
    data = json.loads(path.read_text(encoding='utf-8').split('---')[1])
    for diagram in data['diagrams']:
        old_base = Path(diagram['src']).stem.replace('r88-', 'r82-')
        if old_base not in affected:
            continue
        original = next(x for x in ledger if x['output'] == old_base)
        source = SOURCE/original['source']
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        assert source_hash == original['sha256'], source
        with Image.open(source) as raw:
            raw = ImageOps.exif_transpose(raw)
            source_size = raw.size
            image = on_paper(raw)
        # Existing displayed dimensions are intentional; no layout changes or upscaling.
        size = (diagram['width'], diagram['height'])
        assert size[0] <= source_size[0] and size[1] <= source_size[1]
        if image.size != size:
            image = image.resize(size, Image.Resampling.LANCZOS)
        base = old_base.replace('r82-', 'r88-')
        target = ROOT/f'public/assets/img/{base}.webp'
        image.save(target, lossless=True, method=6)
        with Image.open(target) as decoded:
            assert ImageChops.difference(image, decoded.convert('RGB')).getbbox() is None
        thumb = image.copy()
        thumb.thumbnail((160, 160), Image.Resampling.LANCZOS)
        thumb.save(ROOT/f'public/assets/thumbs/{base}.webp', lossless=True, method=6)
        diagram['src'] = diagram['viewerSrc'] = f'/assets/img/{base}.webp'
        records.append({'source': str(source), 'sourceSha256': source_hash,
                        'previousAsset': old_base, 'asset': base, 'dimensions': size,
                        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                        'treatment': 'alpha-composited onto white paper; lossless WebP; same display dimensions; original source unchanged'})
    path.write_text('---\n'+json.dumps(data, ensure_ascii=False, indent=2)+'\n---\n', encoding='utf-8')
assert len(records) == 13
(ROOT/'docs/r88-technical-materials.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Repaired', len(records), 'drawings and their thumbnails.')
