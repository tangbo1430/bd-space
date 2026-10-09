# 半打空间 BANDA SPACE

基于原项目素材重构的沉浸式建筑产品官网。视觉参照 HAZO 的满屏影像与黑白章节节奏，保留半打品牌、产品及原创建造示意。使用 Astro 5、TypeScript、原生 CSS 与渐进增强交互，无客户端框架。

## 本地运行

要求 Node.js 24 与 pnpm 11.19。项目使用 `pnpm-lock.yaml` 锁定依赖。

```sh
pnpm install --frozen-lockfile
pnpm dev --host 0.0.0.0
```

打开 `http://localhost:4321/zh/`。根路径自动进入中文首页。

## 验证与构建

```sh
pnpm check          # ESLint、类型检查、43 项单元测试、构建、路由、图片、44项原素材及18项补充资料校验
pnpm test:browser   # 先启动本地服务；6 种宽度、22 条路由、交互与 axe 可访问性检查
pnpm test:visual    # 保存桌面 / 手机页面截图至 artifacts/
pnpm test:immersive # 首屏覆盖层、导航、触摸目标、横屏与 200% 等效视口检查
pnpm test:carousel  # 三段式轮播索引、键盘焦点与同步播放进度检查
pnpm test:materials # 新内容重排、二维码、案例归组、旧锚点、资质展开与可访问性
pnpm test:supplement # 两款产品的16组布局、8组可访问性、完整图片比例和独立技术图阅图
pnpm build
pnpm preview --host 0.0.0.0
```

浏览器测试默认使用本机 Microsoft Edge。安装其他 Playwright 浏览器后，可在测试脚本调整 browser channel；`TEST_BASE_URL` 可以指定另一服务地址。浏览器测试包含下载项目需求草稿，测试数据仅保存在 `artifacts/`。

## 页面与设计

白色、浅灰与近黑构成章节底色，青绿色用于交互状态与品牌点缀；使用轻字重中文无衬线标题、满幅本地摄影和自然页面滚动。没有视频或大型动画依赖。

全站使用本地 Noto Sans SC 可变字体，标题采用 350 字重、正文 400、主按钮 450；2px 微圆角主按钮与细线文字次级入口构成统一的操作层级。字体按现有内容裁剪为 WOFF2 并预加载，保留系统字体回退和 `font-display: swap`。字体来源为 [Google Fonts Noto Sans SC](https://github.com/google/fonts/tree/main/ofl/notosanssc)，OFL 授权随包保存在 `public/assets/fonts/OFL-NotoSansSC.txt`。后续新增文案可在安装 `fonttools`、`brotli` 的 Python 环境运行 `python scripts/subset-font.py <原始TTF路径>` 更新字库；常规构建不需要 Python，也不请求外部字体服务。

- 首页：6S、4S暮色、5S三帧满屏轮播、产品切换、深色建造体系、室内生活场景、项目精选、制造工序与影像咨询入口。
- 产品：目录仅展示4S、5S、6S、灰度空间，提供真实面积口径、户型、外墙厚度、结构与装运参考；不公开价格。五个历史产品地址保留并设为不索引，不进入目录、推荐和站点地图。
- 案例：10个项目（国内7、海外3），桌面两列、手机单列；2026年半打项目与2016—2024年团队历年实践明确区分。保留4个旧项目锚点，10组现场照片分别归属项目，首页继续精选开曼与常州。
- 关于、联系、资质、新闻、招聘、投资者关系及错误页面采用同一设计系统。
- 提供轮播暂停、触摸切换、键盘产品切换、移动菜单焦点管理与轻量渐显。
- 产品与工程照片支持全屏阅图、缩略图、放大与原图入口、左右键和手机滑动；关闭后恢复焦点，不启用脚本时仍可直接打开照片。
- 轮播离开视野时暂停，回到视野后保留剩余计时续播。手机正文与表单使用更宽松的阅读空间。
- 建造体系采用原创轴测示意，支持板式、模块与组合切换；原生单选控件保留键盘及无脚本操作。示意表达建造逻辑，不能作为施工图。
- 手机首屏保留产品入口；展开菜单后切到桌面会恢复滚动与焦点；浏览中修改系统减少动态效果偏好会即时生效。
- 产品、产品详情与关于页面使用统一的覆盖式摄影首屏；导航起初透明，滚动后转为实底。咨询和空态页面保持浅色背景，页脚全站统一为近黑色。
- 细节统一：宽屏首屏控件与正文对齐，轮播采用线性图标及明确的暂停状态；手机产品说明为 16px，页脚使用 44px 点击区域，图片入口保留可见的键盘焦点。
- 控件设计：主按钮使用居中文字，普通链接移除装饰箭头；必要功能使用统一20px画布与1.25px线宽的SVG图标。阅图与工序控件使用统一圆角和细边框，产品及建造体系以细线与圆点表示选中状态。
- 首页轮播使用三段无字细线，可直接切换照片，型号与编号仅保留在无障碍标签中。细线进度与5秒播放计时同步，支持暂停、离屏续播、左右键及Home/End；减少动态效果时显示静态选中线，点击当前照片不会重置计时。
- 全站操作采用共用主按钮与细线文字次级入口，深色及摄影背景使用柔白按钮、浅色背景使用深色按钮，2px轻微圆角、52px点击高度，桌面间距32px、手机26px；悬停仅改变颜色与线条，不添加箭头或位移动画。
- 咨询表单显示需求字数，下载后继续修改会提醒重新下载。
- 尊重系统减少动态效果偏好，低功耗和省流量设备仍可手动切换产品轮播。

## 内容与上线配置

原始 `bd-space.zip` 保持不变。本轮使用经核对的115份素材，正式Logo由AI中的填色矢量路径导出；分享图由产品照片与正式标识重新排版。二维码原像素无损裁切并增加留白，三张均通过解码且内容与原图一致。182个未使用旧图片文件已移入 `artifacts/materials/unused-assets/`，不进入交付包。

企业、联系人、股权与创始人维护在 `src/data/company.ts`；案例维护在 `src/data/projects.json`；报告、代表性历史授权与荣誉摘要维护在 `src/data/credentials.ts`。`src/lib/site.ts` 引用同一份企业联系信息。产品数据在 `src/content/products/`，`listed` 控制目录与站点地图，`published` 控制详情地址是否生成。正式职位在 `src/content/jobs/`，新闻和招聘继续保持真实空态。

`docs/materials-manifest.json` 记录原115份素材及3本补充PDF的来源、页面用途与取舍。补充记录包含页码、图片对象、原图尺寸与哈希；只公开提取的12张效果图及2张无损技术示意。原表、完整报告、价格、海报截图和隐私草稿均未部署。材料检测保留原送检主体和样品适用范围；专利仅选录扫描证书支持的历史授权，不等于当前有效或半打持有。股权以网页重排为60%／38%／1%／1%。

4S与灰度空间新增“空间体验”：桌面两列、手机单列，按原图比例展示。4S原有7张实拍与构造图保持独立章节。4S装运图和灰度住宅／办公布局图使用各自独立阅图分组，提供缩放与PNG原图入口。4S宣传册中的首层62.88㎡、阁楼36㎡／38㎡存在口径差异，网站继续保留既有首层63㎡＋阁楼36㎡及独立的可使用面积98㎡；相关户型与立面图待核对后使用。

产品可选字段 `heroCaption`、`designGallery`、`designNote`、`galleryTitle`、`galleryIntro`、`diagrams`及其章节标题与说明集中维护内容。`EditorialImage`和`GalleryImage`支持明确的源地址、真实宽高与`contain`模式；原有调用保持兼容。新增资料可用 `python scripts/import-supplement.py <资料2.zip>` 重现导入（Pillow、PyMuPDF，仅素材维护时需要），原始PDF不随交付包提供。

`.env.example` 中可配置真实域名、表单服务和可选统计。缺少表单端点或访问键时，联系页面仅提供项目需求文件下载，明确提示未向企业发送。配置两项后恢复真实提交、隐私同意和成功 / 失败状态。仅服务器确认接收成功后展示发送成功；失败保留输入。

隐私草稿含残留文字且与本地下载行为不一致，等待核对；Cookie 政策正文待提供，当前准备中页面不被索引。英文版为预留页面，导航仅提示筹备中。

## 主要文件

- `src/styles/global.css`：基础样式、导航状态、表单与职位组件。
- `src/styles/editorial.css`：页面组件的基础排版与响应式规则，已清理被替代的旧首屏样式。
- `src/styles/hero.css`：首页满屏轮播、标题覆盖层与响应式控件。
- `src/styles/immersive.css`：统一主题、黑白章节、摄影首屏与产品展示。
- `src/styles/materials.css`：素材整合页面的网格、资料摘要、股权、联系人与正式标识适配；沿用已有共用按钮。
- `src/components/BrandLogo.astro`：正式矢量Logo，支持透明导航和实底导航切换。
- `src/data/`：公司、项目与技术资料的共享事实来源。
- `src/styles/actions.css`：全站主按钮、文字次级入口、导航紧凑尺寸、深浅背景适配及交互状态；已移除各页面旧按钮主题规则。
- `src/pages/`：23 个静态页面输出，包含根路径、英文预留与 404。
- `src/components/EditorialImage.astro`：本地图片与响应式 WebP。
- `src/components/Icon.astro`：全站功能图标，统一比例与描边，隐藏于读屏器且不单独获取焦点。
- `src/components/PageVisual.astro`：共用首图；支持 cover / caption 模式，默认 caption，cover 提供 title、description、actions 插槽。
- `src/components/BuildingSystems.astro`、`src/styles/building-systems.css`：建造体系示意与原生交互。
- `src/components/GalleryImage.astro`、`PhotoViewer.astro`：渐进增强的照片入口与全屏浏览器。
- `src/styles/photo-viewer.css`、`src/scripts/photo-viewer.ts`：阅图布局、加载反馈、缩放与输入操作，按需加载。
- `src/scripts/main.ts`：导航、轮播、渐显、职位与服务端表单。
- `src/scripts/editorial.ts`：产品预览、制造工序、案例筛选与本地需求草稿。
- `tests/editorial-browser.mjs`：实际浏览器响应式、交互与可访问性验证。
- `tests/materials-browser.mjs`：新增内容与照片归组、QR放大、缩略图滚动和旧锚点回归。
- `scripts/import-materials.py`：从内部核对副本导出网页资源；需要 Pillow、PyMuPDF。原文件不随源码包提供，常规构建不依赖本脚本。
- `scripts/verify-materials.mjs`：产品公开范围、面积、项目归属、股权、报告边界与公开资源检查。

`docs/technical-design.md` 和旧版本测试脚本保留为原项目历史参考，以本 README 与当前运行代码为准。

## 静态部署

产物在 `dist/`，可托管于 Nginx、CDN 或任意静态站点服务。部署前设置 `PUBLIC_SITE_URL` 为正式地址，再构建；HTML 使用不缓存策略，`/_astro/` 哈希资源使用长期缓存。

提供 Dockerfile 与 CI 配置；本次已验证本地构建和浏览器行为，未执行云端部署或 Docker 构建。
