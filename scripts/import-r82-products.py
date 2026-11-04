"""Rebuild P5 assets from reviewed October source files; never publish reference sheets."""
from pathlib import Path
import json, hashlib, subprocess
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('C:/Users/Administrator/Documents/web-test/artifacts/r77-material-review/materials/5/2产品中心')
PREVIOUS = Path('C:/Users/Administrator/Documents/web-test/src/content/products')
FFMPEG = Path('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
IMG = ROOT / 'public/assets/img'
THUMB = ROOT / 'public/assets/thumbs'
VIDEO = ROOT / 'public/assets/video'
for p in (IMG, THUMB, VIDEO): p.mkdir(parents=True, exist_ok=True)
manifest = []

def asset(file, base, technical=False):
    original = ImageOps.exif_transpose(Image.open(file))
    im = original.copy()
    im.thumbnail((3200, 5000) if technical else (3072, 3072))
    if technical:
        im.save(IMG / (base + '.webp'), lossless=True, method=6)
    else:
        im = im.convert('RGB')
        im.save(IMG / (base + '.jpg'), quality=94, subsampling=0)
        im.save(IMG / (base + '.webp'), quality=93, method=6)
        mobile = im.copy(); mobile.thumbnail((960, 960))
        mobile.save(IMG / (base + '-m.webp'), quality=91, method=6)
    thumb = im.copy(); thumb.thumbnail((160, 160)); thumb.save(THUMB / (base + '.webp'), quality=87)
    manifest.append({'source':str(file.relative_to(SOURCE)), 'sha256':hashlib.sha256(file.read_bytes()).hexdigest(), 'output':base, 'originalSize':list(original.size), 'webSize':list(im.size), 'treatment':'complete, proportional; lossless technical image' if technical else 'complete, proportional web image'})
    return im.size

settings = {
 'bd11': ('半打11', '半打11', ['效果图1 (1).png','效果图1 (2).png'], ['BD11 平面图.png','BD11 首层平面图.png','BD11 二层平面图.png','BD11 屋顶平面图.png','BD11 正立面图.png','BD11 背立面图.png','BD11 左立面图.png','BD11 右立面图.png','BD11 1-1剖面图.png','BD11 2-2剖面图.png']),
 'qiyuan': ('栖元', '半打11', ['效果图 (1).png','效果图 (2).png'], ['栖元 平面图.png','首层平面图.png','二层平面图.png']),
 'snow11': ('诗诺', '诗诺', ['效果图 (1).png','效果图 (2).png','效果图 (3).png','效果图 (4).png'], ['首层及二层平面图.png','平面图.png']),
}
for slug, (folder, hero_name, photos, drawings) in settings.items():
    old = (PREVIOUS / (slug + '.md')).read_text(encoding='utf-8').split('---')[1]
    data = json.loads(old)
    data.pop('referenceLayout', None)
    base = 'r82-' + slug
    src = SOURCE / ('增加产品-' + folder)
    asset(SOURCE / ('主图-' + folder + '.png'), base + '-main')
    asset(src / ('首图-' + hero_name + '.jpeg'), base + '-hero')
    data.update(listImageId=base+'-main',detailImageId=base+'-hero',heroBase=base+'-hero',mainBase=base+'-main')
    for i, file in enumerate(photos):
        w,h = asset(src/file, base+f'-space-{i+1}')
        data['designGallery'][i].update(base=base+f'-space-{i+1}',width=w,height=h,mobileWidth=min(w,960,round(w*960/h)))
    for i, file in enumerate(drawings):
        w,h = asset(src/file, base+f'-diagram-{i}')
        # Snow's low-resolution overview is the parameter illustration; detailed double plan follows.
        entry = next(d for d in data['diagrams'] if f'-diagram-{i}.' in d['src'])
        entry.update(src='/assets/img/'+base+f'-diagram-{i}.webp',viewerSrc='/assets/img/'+base+f'-diagram-{i}.webp',width=w,height=h)
    if slug == 'qiyuan': data['tagline'] = '通透复式，让生活舒展。'
    if slug == 'snow11': data['tagline'] = '留一间书房，也留一份从容。'
    if 'video' in data:
        source_video = src / ('半打11漫游视频.mp4' if slug=='bd11' else '诗诺安装动画演示.mp4')
        dest = VIDEO / (base+'.mp4')
        subprocess.run([str(FFMPEG),'-y','-i',str(source_video),'-vf',"scale='min(1920,iw)':-2",'-c:v','libx264','-crf','19','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',str(dest)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        poster = IMG / (base+'-video-poster.webp')
        poster_time = '7' if slug == 'snow11' else '0.4'
        subprocess.run([str(FFMPEG),'-y','-ss',poster_time,'-i',str(dest),'-frames:v','1','-q:v','2',str(poster)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        w,h=Image.open(poster).size
        data['video'].update(src='/assets/video/'+dest.name,poster='/assets/img/'+poster.name,width=w,height=h)
        manifest.append({'source':str(source_video.relative_to(SOURCE)),'sha256':hashlib.sha256(source_video.read_bytes()).hexdigest(),'output':'/assets/video/'+dest.name,'treatment':'H.264 yuv420p + faststart; manual playback'})
    (ROOT/'src/content/products'/f'{slug}.md').write_text('---\n'+json.dumps(data,ensure_ascii=False,indent=2)+'\n---\n',encoding='utf-8')
(ROOT/'docs/r82-product-materials.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Imported',len(manifest),'source assets for three products')
