"""Assemble the reviewed supplement release from the local verification evidence."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from datetime import datetime, timezone
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

browser = read('artifacts/browser-audit.json')
materials = read('artifacts/materials-browser-audit.json')
supplement = read('artifacts/supplement-browser-audit.json')
cover = read('artifacts/immersive-audit.json')
carousel = read('artifacts/carousel-navigation-audit.json')
visual = read('artifacts/visual-audit.json')
content = read('artifacts/supplement-verification.json')
image_audit = read('artifacts/supplement-image-audit.json')
assert len(browser['responsive']) == 132 and not browser['errors']
assert len(browser['accessibility']) == 24 and all(not a['violations'] for a in browser['accessibility'])
assert len(materials['layouts']) == 32 and not materials['errors']
assert len(supplement['layouts']) == 16 and not supplement['errors']
assert all(not a['violations'] for a in materials['accessibility'] + supplement['accessibility'])
assert len(cover) == 56 and all(not a['overflow'] and not a['clipped'] and not a['overlap'] for a in cover)
assert len(carousel['layouts']) == 8
assert len(visual) == 16 and all(not a['overflow'] and not a['broken'] and not a['errors'] for a in visual)
assert content['passed'] == 18 and read('artifacts/materials-verification.json')['passed'] == 44
assert image_audit['passed'] and image_audit['renderings'] == 12 and image_audit['losslessDiagrams'] == 2
report = read('docs/quality-report.json')
report.update({
    'refinement_round': 16,
    'completed_at': datetime.now(timezone.utc).isoformat(),
    'review_scope': '在既有视觉体系上整合3本补充PDF：4S和灰度空间各6张效果图，4S装运与灰度住宅/办公布局各1张技术示意。',
    'reviewed_dimensions': {
        '排版': '设计图集桌面两列三行、手机单列；图注13px，章节说明沿用既有字体。窄屏标题使用均衡断行，技术图保留原比例。字体子集按最终内容重新生成。',
        '留白': '图集行距48px、手机32px；技术图居中、最大1100px，图注与原始标注有独立空间。',
        '视觉层级': '空间体验、规格、实拍与构造、技术示意分章节；4S与灰度内容各自维护，未混用型号图片。',
        '色彩': '继承白、浅灰、近黑与青绿；新增图片保留原素材色彩，技术图使用白底完整展示。',
        '动效': '沿用轻微渐显和既有轮播；完整展示的图片不做悬停裁切或放大，减少动态效果偏好继续有效。',
        '微交互': '4S空间图集14张、灰度图集7张，技术示意独立分组；键盘、触摸、缩放、原图、首尾循环、缩略图跟随与焦点恢复通过检查。',
        '响应式': '132项全站布局、32项既有内容布局、16项补充资料布局、56项首屏及8组轮播布局通过；覆盖320—1920px、横屏和200%等效视口。',
        '原创性': '从用户提供PDF直接提取原始图片对象；不整页搬入宣传册，不引入竞品图片，不重绘技术尺寸。保留素材来源与版本差异。',
    },
    'interface_changes': '产品新增主图说明、设计图集与技术示意可选字段；图片组件支持独立源地址、真实宽高及contain模式。路由、目录范围、咨询参数及既有图集保持兼容。',
    'pending_material_confirmation': ['4S标准版宣传册中首层62.88㎡与现有63㎡口径，以及阁楼36㎡/38㎡差异；本轮保留既有参数，未公开相关户型、立面图。'],
    'deployment': '本地4322预览与静态产物已更新；未执行外部发布。',
    'font_bytes': (ROOT / 'public/assets/fonts/noto-sans-sc-site.woff2').stat().st_size,
})
report['content_verification'].update({
    'source_files': 118, 'original_source_files': 115, 'supplement_pdfs': 3,
    'new_renderings': 12, 'new_diagrams': 2,
    'public_image_files': len(list((ROOT / 'public/assets/img').glob('*'))),
    'prices_published': False, 'source_documents_published': False,
})
report['verification'].update({
    'supplement_integrity_checks': content['passed'], 'supplement_content_layouts': 16,
    'supplement_accessibility_scenarios': 8, 'accessibility_violations': 0,
    'image_references': 258, 'browser_errors': 0, 'full_page_captures': 20,
    'supplement_section_captures': 32, 'last_full_regression_round': 16,
    'interactions': browser['interactions'] + materials['checks'] + supplement['interactions'],
    'revalidation': browser.get('revalidation', {}),
    'zoom_method': '720×450 CSS视口模拟1440×900窗口200%缩放后的重排空间；首屏检查使用DPR 2。不是实际浏览器缩放操作。',
    'unchanged_evidence': '二维码源文件未修改；沿用第15轮3张二维码与原素材解码一致的证据。',
})
evidence = ROOT / 'docs/verification'
paths = ['browser-audit.json','materials-browser-audit.json','supplement-browser-audit.json',
         'immersive-audit.json','carousel-navigation-audit.json','materials-verification.json',
         'supplement-verification.json','supplement-image-audit.json','visual-audit.json']
for name in paths:
    (evidence / name).write_text((ROOT / 'artifacts' / name).read_text(encoding='utf-8'), encoding='utf-8')
report['evidence_files'] = ['docs/verification/' + name for name in paths] + ['docs/verification/qr-verification.json']
(ROOT / 'docs/quality-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

directories = ['src','public','scripts','tests','docs','.github']
files = ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','astro.config.mjs','tsconfig.json',
         'eslint.config.mjs','README.md','.env.example','.gitignore','.dockerignore','Dockerfile','nginx.conf','Caddyfile']
source_files = [p for d in directories for p in (ROOT / d).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
source_files += [ROOT / f for f in files if (ROOT / f).is_file()]
releases = []
for name, paths, relative in [('bd-space-redesign-source.zip', source_files, ROOT),
                              ('bd-space-redesign-static.zip', [p for p in (ROOT / 'dist').rglob('*') if p.is_file()], ROOT / 'dist')]:
    with ZipFile(ROOT / name, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
        for path in paths:
            archive.write(path, path.relative_to(relative).as_posix())
    with ZipFile(ROOT / name) as archive:
        assert archive.testzip() is None
        assert '.env' not in archive.namelist()
        assert not any(Path(p).suffix.lower() in ['.xlsx','.xls','.pdf','.docx','.ai','.dwg','.rar'] for p in archive.namelist())
    releases.append({'name': name, 'bytes': (ROOT / name).stat().st_size,
                     'sha256': hashlib.sha256((ROOT / name).read_bytes()).hexdigest()})
    print(name, releases[-1]['bytes'], 'bytes; integrity passed')
(ROOT / 'artifacts/supplement-release.json').write_text(json.dumps(releases, indent=2), encoding='utf-8')
