"""Generate 160px viewer thumbnails from built gallery markup. Requires Pillow.

Run after adding gallery assets and building. Writes public/ and dist/ so the
current release and future builds use identical thumbnails, without cropping.
"""
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image, ImageOps
import json

ROOT = Path(__file__).resolve().parents[1]
sources = {}


class GalleryParser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and 'gallery-link' in attrs.get('class', '').split():
            source = attrs.get('data-gallery-source', attrs['href'])
            sources[Path(source).stem] = source


for page in (ROOT / 'dist').rglob('*.html'):
    GalleryParser().feed(page.read_text(encoding='utf-8'))

records = []
for name, source in sorted(sources.items()):
    original = ROOT / 'public' / source.lstrip('/')
    with Image.open(original) as picture:
        picture = ImageOps.exif_transpose(picture).convert('RGB')
        picture.thumbnail((160, 160), Image.Resampling.LANCZOS)
        for directory in ['public', 'dist']:
            output = ROOT / directory / 'assets/thumbs' / f'{name}.webp'
            output.parent.mkdir(parents=True, exist_ok=True)
            picture.save(output, 'WEBP', quality=72, method=6)
        records.append({'source': source, 'thumbnail': f'/assets/thumbs/{name}.webp',
                        'width': picture.width, 'height': picture.height,
                        'bytes': output.stat().st_size})
(ROOT / 'docs/gallery-thumbnails.json').write_text(
    json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(records)} gallery thumbnails: {sum(r["bytes"] for r in records):,} bytes')
