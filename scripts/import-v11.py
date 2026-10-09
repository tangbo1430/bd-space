"""Import only approved v1.1 web assets; source documents never enter public/."""
from pathlib import Path
from PIL import Image, ImageOps
import json, re, shutil, sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
OUT = ROOT / 'public/assets/img'
manifest = []

def photo(path, base, purpose, limit=1920):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    im.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    im.save(OUT / (base + '.webp'), quality=85, method=6)
    im.save(OUT / (base + '.jpg'), quality=86, optimize=True, progressive=True)
    size=im.size
    im.thumbnail((960,960), Image.Resampling.LANCZOS)
    im.save(OUT / (base + '-m.webp'), quality=82, method=6)
    manifest.append(dict(source=str(path.relative_to(SOURCE)), base=base, purpose=purpose, dimensions=size))
    return dict(base=base,caption=purpose,width=size[0],height=size[1],mobileWidth=im.width)

replacement=SOURCE/'已上传网页图片修改建议/替换的图片'
for model,index in [('4s',2),('5s',3),('6s',4)]:
    photo(replacement/f'首页-{index}-轮播图需要换.jpeg',f'v11-home-{model}',f'半打 {model.upper()} / 外观效果图')
for n in [1,2]: photo(replacement/f'产品中心-首页增加轮播图{n}.jpeg',f'v11-catalog-{n}','住宅外观 / 效果图')
photo(replacement/'关于我们-1-需换图.jpeg','v11-about','灰度空间 / 外观效果图')
photo(replacement/'首页-8-需换图.png','v11-factory','工厂制造 / 实拍')

folders={'4s':'BD4S','5s':'BD5S','6s':'BD6S','grayscale':'灰度空间','bd8':'BD8','bd9':'BD9'}
choices={'4s':[(3,'外观'),(5,'客厅与阁楼'),(6,'卫浴'),(7,'卧室')], '5s':[(10,'日间外观'),(11,'暮色外观'),(8,'客厅')], '6s':[(14,'住宅外观'),(17,'庭院立面'),(16,'住宅组合')], 'bd8':[(20,'住宅外观'),(21,'双层空间'),(22,'暮色外观')], 'bd9':[(25,'住宅外观'),(26,'正面立面'),(27,'侧面立面')], 'grayscale':[(30,'庭院外观'),(32,'住宅立面')]}
images=[SOURCE / p for p in json.loads((ROOT/'docs/v11-image-sources.json').read_text(encoding='utf8'))]
mobile={'4s':4,'5s':9,'6s':18,'bd8':23,'bd9':28,'grayscale':37}
for order,(key,folder) in enumerate(folders.items(),1):
    path=ROOT/f'src/content/products/{key}.md'
    raw=path.read_text(encoding='utf8').split('---')[1]
    data=json.loads(raw) if raw.strip().startswith('{') else {}
    name='灰度空间' if key=='grayscale' else '半打 '+key.replace('bd','').upper()
    data.update(name=name,order=order,listed=True,published=True,featured=key in ['4s','5s','6s','grayscale'],listImageId=f'v11-{key}-hero',detailImageId=f'v11-{key}-hero')
    gallery=[]
    for n,(index,label) in enumerate(choices[key]):
        base=f'v11-{key}-hero' if n==0 else f'v11-{key}-space-{n}'
        gallery.append(photo(images[index],base,f'{name} · {label} / 方案效果图'))
    data['heroBase']=gallery[0]['base'];data['heroCaption']=gallery[0]['caption']
    portrait=photo(images[mobile[key]],f'v11-{key}-portrait',f'{name} / 手机端外观效果图')
    data['mobileImage']=f'/assets/img/{portrait["base"]}-m.webp'
    # Existing 4S and Grey interiors remain their own, source-attributed galleries.
    if key in ['4s','grayscale']:
        data['designGallery']=[p for p in data['designGallery'] if 'front' not in p['base']]+gallery[1:]
    else: data['designGallery']=gallery[1:]
    data['designNote']='方案效果图，展示空间与布局参考；具体配置以项目确认资料为准。'
    data['gallery']=[g for g in data.get('gallery',[]) if g['base']!='product-4s-mold']
    diagrams=data.get('diagrams',[])
    for i,p in enumerate(sorted((SOURCE/'B/模块产品完整图组'/folder).glob('*.png'))):
        if not any(t in p.name for t in ['平面图','立面图','外面图','剖面图']): continue
        im=Image.open(p).convert('RGB');base=f'v11-{key}-drawing-{i}'
        im.save(OUT/(base+'.webp'),lossless=True,method=6)
        label='平面图' if '平面' in p.name else '剖面图' if '剖面' in p.name else '立面图'
        diagrams.append(dict(src=f'/assets/img/{base}.webp',viewerSrc=f'/assets/img/{base}.webp',width=im.width,height=im.height,caption=f'{name} · {label} / 技术示意'))
        manifest.append(dict(source=str(p.relative_to(SOURCE)),base=base,purpose=label,dimensions=im.size))
    data.update(diagrams=diagrams,diagramLabel='技术图与装运',diagramTitle='看见空间的组成。',diagramIntro='完整保留资料中的图示标注，仅供方案沟通；实际尺寸、配置及装运按项目确认。')
    if key in ['bd8','bd9']:
        eight=key=='bd8'
        data.update(enTag='A home across two levels',tagline='让生活，在上下之间展开。' if eight else '为日常，留出从容的尺度。',description='两层住宅，将起居、休憩与功能空间有序组织。预制混凝土墙体与功能模块、木结构屋顶共同构成完整的建筑。',scenes=['住宅'],specNote='各面积按正式资料原口径列示，不合并换算；装运及项目配置以确认资料为准。')
        vals=[('建筑面积','首层123.9㎡＋二层113.9㎡；资料列总面积238㎡' if eight else '首层104㎡＋二层104㎡；总面积208㎡'),('套内面积','217㎡' if eight else '192.5㎡'),('户外平台','18.1㎡' if eight else '15.6㎡'),('户型','4房2厅4卫1厨＋车库＋设备间' if eight else '4房2厅3卫1厨＋洗衣间'),('外墙厚度','180mm'),('结构组成','混凝土墙体＋功能模块＋木结构屋顶'),('装运参考',('4' if eight else '3')+'个40尺HC集装箱／套')]
        data['params']=[dict(label=k,value=v) for k,v in vals]
    if key=='4s':
        data['video']=dict(src='/assets/video/4s-installation.mp4',poster='/assets/img/product-4s-roof.webp',caption='半打 4S 吊装全记录 / 施工实拍',width=544,height=960)
    path.write_text('---\n'+json.dumps(data,ensure_ascii=False,indent=2)+'\n---\n',encoding='utf8')

projects=json.loads((ROOT/'src/data/projects.json').read_text(encoding='utf8'))
caseids=['cayman','brisbane','zhongshan-fengdu','zhongshan-mige','zhongshan-cabins','chengdu','shenzhen','fiji','jiangmen','changzhou']
for number,key in enumerate(caseids,1):
    folder=next(p for p in (SOURCE/'B/案例完整图组').iterdir() if re.match(f'案例-{number}(?![0-9])',p.name))
    p=next(p for p in projects if p['id']==key)
    p['status']='已竣工';p['scope']=p['description']
    cover=next(f for f in folder.iterdir() if '封面' in f.name)
    photo(cover,p['base'],p['name']+' / 项目照片')
    p['gallery']=[]
    for n,f in enumerate(sorted(f for f in folder.iterdir() if '安装-' in f.name),1):
        base=f'project-{key}-{n:02}'
        g=photo(f,base,p['name']+f' / 施工记录 {n:02}')
        p['gallery'].append(dict(base=base,caption=g['caption']))
(ROOT/'src/data/projects.json').write_text(json.dumps(projects,ensure_ascii=False,indent=2),encoding='utf8')
video=ROOT/'public/assets/video';video.mkdir(exist_ok=True)
shutil.copy2(next((SOURCE/'B/工厂与施工视频').glob('*.mp4')),video/'4s-installation.mp4')
for stem in ['flow-step01-mold','product-4s-mold']:
    for p in (ROOT/'public/assets').rglob(stem+'*'):
        p.unlink()
logo=Image.open(SOURCE/'B/Logo 完整文件/半打空间logo.png').convert('RGBA')
logo=logo.crop(logo.getbbox());logo.thumbnail((1000,1000),Image.Resampling.LANCZOS)
logo.save(ROOT/'public/assets/brand/logo-original.png',optimize=True)
share=Image.open(OUT/'v11-home-6s.jpg').convert('RGB');share=ImageOps.fit(share,(1200,490))
card=Image.new('RGB',(1200,630),'#f5f6f4');card.paste(share,(0,140));logo.thumbnail((280,90));card.paste(logo,(64,25),logo);card.save(OUT/'share-banda.jpg',quality=90)
(ROOT/'docs/v11-materials-manifest.json').write_text(json.dumps({'assets':manifest,'omissions':['No clean 6S interior was supplied in the 6S folder; exterior views used, no borrowing from other models.','Promotional posters, prices, authorizations and full reports are not published.','Withdrawn mold photos and thumbnails removed.'],'sources':{'parameters':'A/模块产品正式资料.xlsx','cases':'A/项目案例资料.xlsx','contact':'A/联系信息.xlsx','english':'A/英文全站资料.xlsx'}},ensure_ascii=False,indent=2),encoding='utf8')
print('Imported',len(manifest),'approved images')
