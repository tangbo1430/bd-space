"""Extract figures from the supplied layout sheet for an isolated web sample.
No generated image, recolouring, technical redrawing or building cropping.
Original panels remain the zoom sources. Coordinates are source pixel bounds.
"""
from pathlib import Path
from PIL import Image
import json, hashlib

root=Path(__file__).resolve().parent.parent
original=Path('C:/Users/Administrator/Documents/web-test/artifacts/r77-material-review/materials/5/1首页/插图.png')
im=Image.open(original).convert('RGB')
assert im.size == (4000,15117)
dimensions=json.loads((root/'src/data/image-dimensions.json').read_text(encoding='utf-8'))
records=[]
def output(name,box):
    crop=im.crop(box)
    path=root/f'public/assets/img/{name}.webp'
    crop.save(path,'WEBP',quality=92,method=6)
    dimensions[f'/assets/img/{name}.webp']=list(crop.size)
    thumb=crop.copy();thumb.thumbnail((160,160));thumb.save(root/f'public/assets/thumbs/{name}.webp','WEBP',quality=85)
    records.append({'asset':name,'source':str(original),'sourceSHA256':hashlib.sha256(original.read_bytes()).hexdigest(),'crop':box,'size':list(crop.size),'note':'Layout figure extraction; no changes inside figure. Full original panel available for zoom.'})
output('r79-wall-house',(0,480,1950,1480))
# Full technical panels: every dimension, inset and original label retained.
for i,(y0,y1) in enumerate([(4100,6250),(6250,8500),(8500,10700),(10700,12950)]):
    output(f'r79-wall-node-{i}',(0,y0,4000,y1))
# Extract only the complete photograph mosaic from the final reference panel.
output('r79-wall-photos',(245,13478,3680,14678))
# Same original mosaic photographs, individually readable on mobile.
photo_bounds=[(0,0,900,1200),(927,0,1713,596),(1741,0,2529,596),(2556,0,3425,596),(927,642,1713,1200),(1741,642,2529,1200),(2556,642,3425,1200)]
for i,(x0,y0,x1,y1) in enumerate(photo_bounds):
    output(f'r79-wall-photo-{i}',(245+x0,13478+y0,245+x1,13478+y1))
(root/'src/data/image-dimensions.json').write_text(json.dumps(dimensions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'docs/r79-wall-material-map.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
