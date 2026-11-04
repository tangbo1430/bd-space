from pathlib import Path
from PIL import Image
import json, hashlib

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('C:/Users/Administrator/Documents/web-test/artifacts/r77-material-review/materials/5')
entries=[]
def export(relative, name, box=None):
    source=SOURCE/relative
    im=Image.open(source).convert('RGB')
    if box: im=im.crop(box)
    original=im.size
    im.thumbnail((2560,2560),Image.Resampling.LANCZOS)
    for ext in ['jpg','webp']:
        im.save(ROOT/f'public/assets/img/{name}.{ext}',quality=91)
    mobile=im.copy(); mobile.thumbnail((960,1400),Image.Resampling.LANCZOS)
    mobile.save(ROOT/f'public/assets/img/{name}-m.webp',quality=90)
    thumb=im.copy(); thumb.thumbnail((160,160)); thumb.save(ROOT/f'public/assets/thumbs/{name}.webp',quality=85)
    entries.append(dict(source=relative,base=name,sourceSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),crop=box,sourceSize=original,width=im.width,height=im.height))

export('4关于我们/首图.jpeg','r82-about-cover')
export('4关于我们/首图.jpeg','r82-about-cover-house',(150,400,1600,1080))
export('4关于我们/换图/1.png','r82-about-founder',(0,0,1000,2250))
export('4关于我们/换图/2.png','r82-about-ground',(1304,30,2612,2210))
export('4关于我们/换图/3.png','r82-about-wall',(300,870,2150,2150))
export('4关于我们/换图/4.png','r82-about-components',(260,1250,1600,2110))
export('4关于我们/换图/4.png','r82-about-car',(1750,610,3750,2200))
export('4关于我们/换图/5.png','r82-about-homes',(2350,335,3835,1615))
export('4关于我们/换图/6.png','r82-about-understanding',(0,0,1700,2250))
export('4关于我们/换图/7.png','r82-about-definition',(290,745,2290,1390))
(ROOT/'docs/r82-about-materials.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
