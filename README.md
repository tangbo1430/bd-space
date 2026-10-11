# 半打空间 · Semi-Six Modular

Astro 5、TypeScript 与原生 CSS/交互实现的双语建筑产品网站。v1.1 保留已确认的简约视觉、统一按钮和轻动效。

## 运行与验收

要求 Node.js 24、pnpm 11.19+。运行 `pnpm install --frozen-lockfile`、`pnpm dev`；`pnpm check` 执行代码、类型、48 项单元测试、构建和内容/资源/英文文案检查。

浏览器测试使用 Microsoft Edge。先运行 `pnpm build` 和 `pnpm preview --host 127.0.0.1 --port 4322`，另一个终端设置 `TEST_BASE_URL=http://127.0.0.1:4322`，再执行：

- `pnpm test:browser`：32 条路由 × 6 种宽度与原有交互/可访问性覆盖。
- `pnpm test:immersive`：首屏、透明/实底导航、触摸目标、横屏、200% 等效视口。
- `pnpm test:carousel`：无文字轮播控件、键盘焦点与同步进度。
- `pnpm test:materials`：案例归组、旧锚点、二维码与资质摘要。
- `pnpm test:supplement`：4S/灰度空间完整比例、独立技术图与阅图行为。
- `pnpm test:v11`：11 个英文页面 × 8 种视口、22 组可访问性、两处轮播、六款技术图、视频和英文下载。

- `pnpm test:delivery`：全部 33 个生成页面 × 9 种视口（含 2560px），原图比例、无填充条、Logo 切换、章节定位和键盘阅图。`SKIP_SCREENSHOTS=1` 可省略重复截图，保留全部断言。

## 内容范围

产品目录为 4S、5S、6S、灰度空间、半打 8、半打 9；首页仍精选四款。slab、wall、stair 三个旧地址保留、不索引。英文发布首页、产品中心、六款详情、案例、关于、联系共 11 页。中文页面的桌面与手机语言入口统一显示 EN；没有对应英文页时跳转英文首页，通过悬停提示和无障碍名称说明目标。

官方 Logo 保留轮廓、比例及两块灰色。桌面摄影首屏使用透明导航，方块图形保持官方原色、文字保持白色；滚动后、手机导航和浅色页脚使用完整原色版。首页保留 6S → 4S → 5S，产品中心为六款产品轮播；控件无文字，支持键盘、触摸、暂停、离屏停止和减少动态效果。首屏维持满幅摄影及独立手机选图；正文照片按真实比例完整展示，混合横竖图按原比例成组等高，手机单列。

六款图片和技术图按型号分组，完整展示、缩放、原图、160px 缩略图和焦点恢复。5S 补充客厅图；6S 未提供可确认的室内图，不跨型号借图。4S 吊装视频为原始 544×960，视频帧封面、preload=none、手动播放。十个案例保留旧锚点与国内 7/海外 3 筛选，补齐各自施工图、交付范围和完工状态。

关于页增加愿景、使命、三项优势与时间线；联系页区分办公、工厂、工作时间，使用新版三个微信二维码。资质页保留检测主体和样品范围、两项扫描证书支持的历史授权，增加 17 项研发台账摘要；不宣称当前全部有效或由半打持有。

4S 保留首层 63㎡＋阁楼 36㎡与独立可使用面积 98㎡；半打 8 保留分层 123.9㎡、113.9㎡与资料列示总面积 238㎡的各自口径。咨询继续提供本地需求下载，不自动发送。价格、内部表格、授权书和完整报告不公开。

## 共用数据与本地化

产品数据在 `src/content/products/`，共享型号、数值、图组、首页精选、手机图片、视频配置。企业、案例与资质在 `src/data/`。

英文页面复用同一组件及事实数据。`src/middleware.ts` 在构建英文 HTML 时使用 parse5 遍历文本与辅助属性，应用 `src/data/en.json` 的校订文案，保留脚本、样式、数值和用户输入。客户端交互使用同一术语表。`src/lib/locale.ts` 维护已发布英文路由。`pnpm audit:translations` 检查遗漏，“中文”切换入口除外。技术图保留原始标注，英文页已说明图中可能含中文。

## 素材与部署

- `docs/v11-materials-manifest.json`：来源、用途、尺寸与取舍；原始资料不进入 public/。旧工艺照片和缩略图已撤下。
- `python scripts/import-v11.py <解压目录>`：准备 v1.1 网页资源（Pillow）；人工审核后的说明与排序以提交内容为准。
- `python scripts/prepare-official-logo.py <官方Logo目录>`：按原 PDF 曲线轮廓与 SVG 色块生成原色版及白字原色图形版 Logo（PyMuPDF），不使用整图漂白滤镜。
- `python scripts/generate-image-dimensions.py`：新增/替换网页图片后更新真实尺寸清单（Pillow），再构建。
- `python scripts/generate-gallery-thumbnails.py`：构建后更新 public/ 与 dist/ 缩略图。
- `python scripts/subset-font.py <NotoSansSC.ttf>`：更新本地 OFL 字体子集（fonttools、brotli）。
- `pnpm package:assets`：按生成页面/样式/脚本引用，移除 dist/ 未使用资源。
- `PUBLIC_SITE_URL` 配置 canonical/站点地图；临时站 robots 禁止索引，Caddy 同时提供 X-Robots-Tag。

r26 可读验收报告见 `docs/quality-report-r26.html`，本轮实测、历史记录及未覆盖环境分开列示。素材映射更新见 `docs/delivery-r26-material-map.json`。

实际验收与部署记录见 `docs/quality-report.json`、`docs/temporary-deployment.json`。代码仅在独立分支本地提交；本轮不推送 GitHub、不自动合并 main。正式域名、HTTPS、表单发送服务不在本轮范围。
