"""User-authorised detail crops; complete annotated sheets remain viewer sources."""
from pathlib import Path
from PIL import Image
import json
root = Path(__file__).resolve().parents[1]
dimensions = json.loads((root/'src/data/image-dimensions.json').read_text(encoding='utf-8'))
boxes = [(990,265,3730,1990),(1260,330,3690,1940),(1260,285,3635,1970),(1300,330,3640,2020)]
records = []
for index,box in enumerate(boxes):
    source = root/f'public/assets/img/r79-wall-node-{index}.webp'
    im = Image.open(source).crop(box)
    im.thumbnail((1200,900), Image.Resampling.LANCZOS)
    name = f'r83-wall-detail-{index}'
    im.save(root/f'public/assets/img/{name}.webp',quality=94,method=6)
    dimensions[f'/assets/img/{name}.webp'] = list(im.size)
    thumb=im.copy(); thumb.thumbnail((160,160)); thumb.save(root/f'public/assets/thumbs/{name}.webp',quality=90)
    records.append(dict(source=source.name,crop=box,preview=name+'.webp',viewer=source.name,note='Detail preview only; full annotated source retained in viewer.'))
(root/'src/data/image-dimensions.json').write_text(json.dumps(dimensions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'docs/r83-wall-materials.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
