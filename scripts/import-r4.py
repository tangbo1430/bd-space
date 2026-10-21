"""r4 素材导入：首页/产品中心/资质/关于我们（网页调整4）。

用法：python scripts/import-r4.py <网页调整4/4 目录>
- 只把网页需要的图片压缩后写入 public/assets/img/（原始资料不进入 public/）。
- 同步重写 7 款产品的图组、参数、卖点（数据来源：模块产品资料.xlsx）。
完成后运行 python scripts/generate-image-dimensions.py，再构建。
"""
from pathlib import Path
from PIL import Image, ImageOps
import json, sys, subprocess, shutil

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1])
OUT = ROOT / 'public/assets/img'
VIDEO = ROOT / 'public/assets/video'
OUT.mkdir(parents=True, exist_ok=True)
manifest = []


def load(path, bg=(255, 255, 255)):
    im = ImageOps.exif_transpose(Image.open(path))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        base = Image.new('RGB', im.size, bg)
        base.paste(im, mask=im.split()[3])
        return base
    return im.convert('RGB')


def photo(rel, base, caption='', limit=1920, mobile=960, bg=(255, 255, 255), alpha=False):
    path = SRC / rel
    im = load(path, bg)
    im.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    if alpha:
        a = ImageOps.exif_transpose(Image.open(path)).convert('RGBA')
        a.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        a.save(OUT / f'{base}.webp', quality=88, method=6)
    else:
        im.save(OUT / f'{base}.webp', quality=86, method=6)
    im.save(OUT / f'{base}.jpg', quality=86, optimize=True, progressive=True)
    size = im.size
    m = im.copy()
    m.thumbnail((mobile, mobile), Image.Resampling.LANCZOS)
    if alpha:
        a.thumbnail((mobile, mobile), Image.Resampling.LANCZOS)
        a.save(OUT / f'{base}-m.webp', quality=84, method=6)
    else:
        m.save(OUT / f'{base}-m.webp', quality=82, method=6)
    manifest.append(dict(source=rel, base=base, dimensions=size))
    return dict(base=base, caption=caption, width=size[0], height=size[1], mobileWidth=m.width)


def drawing(rel, base, caption, limit=2400):
    im = load(SRC / rel)
    im.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    im.save(OUT / f'{base}.webp', quality=90, method=6)
    im.save(OUT / f'{base}.jpg', quality=88, optimize=True)
    manifest.append(dict(source=rel, base=base, dimensions=im.size))
    return dict(src=f'/assets/img/{base}.webp', viewerSrc=f'/assets/img/{base}.webp',
                caption=caption, width=im.width, height=im.height)


# ---------- 首页 ----------
H = '1首页'
for n, (f, key) in enumerate([('1灰度空间.jpeg', 'grayscale'), ('2灰度空间经济款.jpeg', 'grayscale-eco'),
                              ('3半打4S.jpeg', '4s'), ('4半打5S.jpeg', '5s'), ('5半打6S.jpeg', '6s')]):
    photo(f'{H}/首页轮播图/{f}', f'r4-banner-{key}', limit=2560, mobile=1280)
SYSTEM_BG = (12, 19, 16)
photo(f'{H}/2D.png', 'r4-system-panels', limit=1400, mobile=800, bg=SYSTEM_BG, alpha=True)
photo(f'{H}/3D.png', 'r4-system-modules', limit=1400, mobile=800, bg=SYSTEM_BG, alpha=True)
photo(f'{H}/组合.png', 'r4-system-hybrid', limit=1400, mobile=800, bg=SYSTEM_BG, alpha=True)
photo(f'{H}/图例2.png', 'r4-making-design', limit=1632, mobile=800)
photo(f'{H}/8、底部背景图.png', 'r4-cta', limit=2880, mobile=1280)

# ---------- 产品中心轮播（4S 实拍） ----------
for n, f in enumerate(['产品中心-轮播图1.jpeg', '产品中心-轮播图2.jpeg', '产品中心-轮播图3.png', '产品中心-轮播图4.jpeg'], 1):
    photo(f'2产品中心/轮播图/{f}', f'r4-catalog-photo-{n}', limit=2560, mobile=1280)

# ---------- 产品 ----------
D = '2产品中心/产品详情'
mains = {'4s': '主图-半打4S.png', '5s': '主图-半打5S.png', '6s': '主图-半打6S本.png', 'bd8': '主图-半打8.png',
         'bd9': '主图-半打9.png', 'grayscale': '主图-灰度空间.png', 'grayscale-eco': '主图-灰度空间经济款.png'}
for key, f in mains.items():
    photo(f'{D}/{f}', f'r4-main-{key}', limit=1920, mobile=960)

heroes = {'4s': '详情-BD4S/首图.jpeg', '5s': '详情-BD5S/首图-半打5S.jpeg', '6s': '详情-BD6S/首图-半打6S.jpeg',
          'bd8': '详情-BD8/首图-BD8.jpeg', 'bd9': '详情-BD9/首图-BD9.jpeg',
          'grayscale': '详情-灰度空间/首图-灰度空间.jpeg', 'grayscale-eco': '详情-灰度空间经济款/首图-灰度空间经济款.jpeg'}
for key, f in heroes.items():
    photo(f'{D}/{f}', f'r4-{key}-hero', limit=2560, mobile=1280)

NAMES = {'4s': '半打 4S', '5s': '半打 5S', '6s': '半打 6S', 'bd8': '半打 8', 'bd9': '半打 9',
         'grayscale': '灰度空间', 'grayscale-eco': '灰度空间经济款'}

design = {
    '4s': ('详情-BD4S', [('室内效果图 (1).png', '客厅与阁楼'), ('室内效果图 (4).png', '客厅纵向视角'),
                        ('室内效果图 (5).png', '厨房'), ('室内效果图 (6).png', '模块化厨房'),
                        ('室内效果图 (2).png', '卫浴'), ('室内效果图 (3).png', '卧室')]),
    '5s': ('详情-BD5S', [('效果图 (1).png', '暮色外观'), ('效果图 (2).png', '庭院外观'),
                        ('效果图 (3).png', '夜景外观'), ('效果图 (1).jpeg', '客厅')]),
    '6s': ('详情-BD6S', [('效果图 (1).png', '住宅外观'), ('效果图 (2).png', '庭院立面'),
                        ('效果图 (3).png', '住宅组合'), ('效果图 (4).png', '社区组合')]),
    'bd8': ('详情-BD8', [('效果图 (1).png', '住宅外观'), ('效果图 (2).png', '暮色外观'),
                        ('效果图 (3).png', '入户立面'), ('效果图 (4).png', '车库立面')]),
    'bd9': ('详情-BD9', [('BD9横图 (2).png', '雪景外观'), ('BD9横图 (3).png', '组合外观')]),
    'grayscale': ('详情-灰度空间', [('效果图 (1).png', '庭院外观'), ('效果图 (2).png', '客厅'),
                                   ('效果图 (3).png', '餐厨'), ('效果图 (4).png', '卧室'),
                                   ('效果图 (5).png', '客餐厅'), ('效果图 (6).png', '住宅立面')]),
    'grayscale-eco': ('详情-灰度空间经济款', [('效果图 (1).png', '庭院外观'), ('效果图 (2).png', '餐厅'),
                                           ('效果图 (3).png', '入口外观'), ('效果图 (4).png', '客厅')]),
}
plans = {'4s': '详情-BD4S/BD4S 平面图.png', '5s': '详情-BD5S/BD5S 平面图.png', '6s': '详情-BD6S/BD6S 平面图.png',
         'bd8': '详情-BD8/BD8 平面图.png', 'bd9': '详情-BD9/BD9 平面图.png',
         'grayscale': '详情-灰度空间/灰度空间 平面图.png', 'grayscale-eco': '详情-灰度空间/灰度空间 平面图.png'}
drawings = {
    '4s': [('详情-BD4S/装箱方案-透明背景.png', '双集装箱装运示意')],
    '5s': [('详情-BD5S/BD5S 剖面图.jpeg', '剖面图'), ('详情-BD5S/BD5S 外面图.png', '立面图')],
    '6s': [('详情-BD6S/BD6S 外面图.png', '立面图')],
    'bd8': [('详情-BD8/BD8 剖面图 (1).png', '1-1 剖面图'), ('详情-BD8/BD8 剖面图 (2).png', '2-2 剖面图'),
            ('详情-BD8/BD8 立面图 (1).png', '南立面图'), ('详情-BD8/BD8 立面图 (2).png', '西立面图'),
            ('详情-BD8/BD8 立面图 (3).png', '北立面图'), ('详情-BD8/BD8 立面图 (4).png', '东立面图')],
    'bd9': [('详情-BD9/BD9 剖面图.png', '侧立面图'), ('详情-BD9/BD9 立面图.png', '正立面图')],
    'grayscale': [('详情-灰度空间/立面图A.png', 'A 立面'), ('详情-灰度空间/立面图B.png', 'B 立面'),
                  ('详情-灰度空间/立面图C.png', 'C 立面'), ('详情-灰度空间/立面图D.png', 'D 立面')],
    'grayscale-eco': [('详情-灰度空间经济款/立面图A.jpeg', 'A 立面'), ('详情-灰度空间经济款/立面图B.jpeg', 'B 立面'),
                      ('详情-灰度空间经济款/立面图C.jpeg', 'C 立面'), ('详情-灰度空间经济款/立面图D.jpeg', 'D 立面'),
                      ('详情-灰度空间经济款/爆炸图.jpeg', '构造爆炸图')],
}
site = {
    '4s': [('详情-BD4S/实拍 (1).jpeg', '住宅外观实拍'), ('详情-BD4S/实拍 (2).jpeg', '屋顶与立面实拍'),
           ('详情-BD4S/实拍 (3).png', '外墙与门窗交接 / 实拍'), ('详情-BD4S/实拍 (1).png', '工厂中的厨卫模块 / 实拍'),
           ('详情-BD4S/实拍 (1).jpg', '预制混凝土墙板 / 实拍'), ('详情-BD4S/实拍 (2).png', '木结构屋顶安装 / 实拍'),
           ('详情-BD4S/实拍 (4).png', '室内与阁楼空间 / 实拍')],
}

products = {}
for key, (folder, items) in design.items():
    name = NAMES[key]
    gal = [photo(f'{D}/{folder}/{f}', f'r4-{key}-space-{i + 1}', f'{name} · {label} / 方案效果图')
           for i, (f, label) in enumerate(items)]
    plan = drawing(f'{D}/{plans[key]}', f'r4-{key}-plan', f'{name} · 平面图 / 技术示意')
    dr = [drawing(f'{D}/{f}', f'r4-{key}-drawing-{i + 1}', f'{name} · {label} / 技术示意')
          for i, (f, label) in enumerate(drawings[key])]
    st = [photo(f'{D}/{f}', f'r4-{key}-site-{i + 1}',
                label if '/' in label else f'{name} · {label}')
          for i, (f, label) in enumerate(site.get(key, []))]
    products[key] = dict(design=gal, plan=plan, drawings=dr, site=st)

# 4S 施工记录：运输照片 + 两段竖屏视频
photo(f'{D}/详情-BD4S/半打4S-江苏省常州}}.jpg', 'r4-4s-transport', '半打 4S · 江苏常州项目运输 / 实拍')
shutil.copyfile(SRC / f'{D}/详情-BD4S/附件视频-室内.mp4', VIDEO / '4s-interior.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '3', '-i', str(VIDEO / '4s-interior.mp4'),
                '-frames:v', '1', '-q:v', '3', str(OUT / 'r4-4s-interior-poster.jpg')], check=True)

# ---------- 资质 ----------
for n in range(1, 18):
    photo(f'3资质能力/专利证书/发明专利证书_{n:02d}.png', f'r4-patent-{n:02d}', limit=1100, mobile=520)
for n, f in enumerate(['广东省土木建筑学会科学技术奖励-草根民墅 拷贝.png', '广东省土木建筑学会科学技术奖励-黄昆 拷贝.png',
                       '广东省科技创新专项 二等奖.png'], 1):
    photo(f'3资质能力/技术荣誉/{f}', f'r4-award-{n}', limit=1100, mobile=735)

# ---------- 关于我们 ----------
for n in range(1, 14):
    photo(f'4关于我们/量产房子 全球卖房商业计划书_{n:02d}.png', f'r4-about-{n:02d}', limit=1754, mobile=900)

(ROOT / 'docs/r4-materials-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n',
                                                     encoding='utf8')
(ROOT / 'docs/r4-products.json').write_text(json.dumps(products, ensure_ascii=False, indent=2) + '\n',
                                           encoding='utf8')
print(len(manifest), 'assets')
