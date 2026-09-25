# 技术设计说明 — 半打空间企业官网（SUNM3245-2）

基线：PRD v0.3、UI 规范/原型 v1.1、T1 功能用例（30 条）。本文覆盖 Leader 要求的选型、环境变量、数据模型、SEO、统计事件与运行/部署方式。

## 1. 技术选型（不自研后端）

| 能力 | 选型 | 理由 | 备选 |
| --- | --- | --- | --- |
| 站点框架 | **Astro 5（SSG）** | 内容型官网零运行时后端；静态产物任意托管；岛屿架构按需在页面内注入 vanilla JS；自带 i18n 友好路由 | Next.js（重） |
| 内容管理 | **Astro Content Collections**（Git 化 Markdown + Zod schema） | 成熟、可配置、类型安全；草稿/发布由 `published` 字段控制；内容随 deploy branch 评审留痕（BR-3） | 后续可平滑接 Headless CMS（Decap/Strapi/Keystatic，见 §6） |
| 咨询表单 | **Web3Forms 兼容邮件表单服务**（环境变量配置端点） | 线索直达企业邮箱（OP-21/BR-16），免自研后端；服务端确认成功才展示成功态（BR-10） | Formspree / 企业自建网关（同接口约定） |
| 基础统计 | **Plausible 兼容脚本**（可选注入） | 无 Cookie、轻量、支持自定义事件；不配置则完全不注入追踪 | Umami（同一注入位） |
| 测试 | Vitest + 构建产物验证脚本 | 表单校验、路由清单、SEO 规则可自动化回归 | — |

表单接口约定：`POST $PUBLIC_FORM_ENDPOINT`，`multipart/form-data`，字段 `name/company/contact/location/message/source/access_key`；HTTP 2xx 且 JSON `{success:true}` 判定成功。蜜罐字段 `bd_website` 命中即前端静默拦截。

## 2. 环境变量

见 `.env.example`。全部为 `PUBLIC_*` 构建期变量（Astro 静态站无服务端运行时）：

- `PUBLIC_SITE_URL`：站点绝对地址，决定 canonical / hreflang / sitemap / robots。**部署前必填**。
- `PUBLIC_FORM_ENDPOINT` / `PUBLIC_FORM_ACCESS_KEY`：表单服务。未配置时表单呈现“暂未开通”态并禁用提交——不伪造成功（BR-16）。
- `PUBLIC_ANALYTICS_SCRIPT_URL` / `PUBLIC_ANALYTICS_DOMAIN`：统计脚本。未配置则不注入（无 Cookie 站）。

密钥仅存在于部署平台环境变量中；仓库内无密钥（`.env` 已忽略）。

## 3. 数据模型（Content Collections）

`src/content.config.ts`（Zod 校验，构建期失败即暴露非法内容）：

- **products**（`src/content/products/*.md`）：`name / enTag / order / tagline / description / scenes[] / params[{label,value}] / listImageId / detailImageId / published`。
  - `published:false` = 草稿，不进入列表、详情路由与 sitemap（对应 FR-12 草稿/发布口径的静态实现）。
- 企业事实（电话/邮箱/地址/ICP/品牌文案）集中于 `src/lib/site.ts`，未提供项统一 `【待提供】`（BR-15）。
- 新闻/案例/资质：当前无经审核数据，列表页按 PRD §9 展示空态；上线数据到位后新增同名 collection（`news`、`cases`、`qualifications`）即可，路由已预留版式。

事实纪律：产品参数仅允许可追溯来源值，缺失字段不渲染空标签（AC-4）；案例未授权不发布（BR-8/AC-5）——当前案例页为空态，首页案例为明确标注的占位块且不链接到虚构详情。

## 4. SEO（AC-10 / BR-14 / FR-13）

- 每个可索引页：独立 `<title>` / `description`、自引用 `canonical`（绝对地址）。
- `hreflang`：当前仅中文发布 → 输出 `zh-CN` 自引用 + `x-default`；**不含** 未发布的 `/en/`。英文页发布后在 `src/lib/seo.ts` 的 `hreflangLinks()` 打开 `en:true`，自动生成双向含自身的声明。
- sitemap：`@astrojs/sitemap` 生成，构建期过滤 `/en/` 与 `/404`（未发布页不进入 sitemap）。
- robots.txt：构建期由 `src/pages/robots.txt.ts` 生成，`Disallow: /en/` 并指向 sitemap。
- `/` → `/zh/` 使用 meta refresh + canonical + 链接兜底（静态托管兼容）。
- URL 纪律：`trailingSlash:'always'`，栏目 URL 固定；页面删除/变更需配重定向（BR-11，部署层执行）。

## 5. 统计事件（FR-14 / AC-15）

页面浏览由 Plausible 自动采集；自定义事件（`src/lib/analytics.ts`，未启用时 no-op）：

| 事件 | 触发点 |
| --- | --- |
| `consult_click` | 导航/抽屉/Hero/浮动条/页内咨询 CTA 点击 |
| `form_submit_attempt` | 表单校验通过发起提交 |
| `form_submit_success` | 仅服务端确认后 |
| `form_submit_error` | 提交失败（网络/服务异常） |
| `banner_prev` / `banner_dot` / `banner_cta` | Banner 手动切换 / CTA 点击（v0.4 FR-32） |
| `about_sub_click` | 关于我们子项访问（FR-32） |
| `job_filter` / `job_expand` / `apply_click` | 职位筛选 / 展开 / 申请邮件点击（FR-32；不采集邮件正文、简历） |

同意管理、保留期限与访问权限随统计平台账号配置验收（当前默认不启用追踪）。

## 6. 内容后台口径（AC-9 缺口说明）

T1 已将后台列为设计缺口。本实现以 Git 化内容（Content Collections + PR 评审 + 发布留痕）覆盖“增删改查、草稿、发布”的内容管理需求；若业务要求 Web 后台，可在现有内容上无侵入接入 Decap CMS（Git 后端）或 Strapi（构建期拉取），数据模型不变。该决策待 Leader/业务确认。

## 7. 动效降级（UI 规范 §5）

`prefers-reduced-motion` / `saveData` / 低性能启发式（`hardwareConcurrency ≤ 4` 且视口 <1280）满足其一即 `data-motion="off"`：轮播不自动播放、渐显/视差/分解外扩全部以终态静态呈现。CSS 同步含 `prefers-reduced-motion` 媒体查询兜底。

## 8. 本地运行与部署

```bash
npm install
npm run dev       # 开发
npm run check     # lint + type-check + test + build + verify（交付门禁自检）
```

部署：`PUBLIC_SITE_URL` 等环境变量配置后 `npm run build`，将 `dist/` 发布到静态托管；发布/回滚 = 重新部署对应 commit 的产物（deploy branch：`release/SUNM3245-2-corporate-website`）。

## 9. 已知限制

1. 正式图片素材全部缺失，视觉以几何渐变 + 原创线稿占位为准；替换时整图替换（占位 ID 已标注，BR-15）。
2. 品牌大标题/按钮等示例文案标注【示例文案，待确认】，待 PM/客户确认口径。
3. 表单真实提交依赖 OP-21 企业邮箱与表单服务密钥，未配置前保持禁用态。
4. 联系方式、ICP 备案号、法务正文均为【待提供】，上线检查点前由需求方/法务补齐。
5. 性能预算（首屏图 ≤350KB 等）需在正式素材到位后复测；当前占位图为纯 CSS/SVG，无图片请求。

## 10. v0.4 增量（FR-17~32 / v1.2 设计）

- **Banner 七态状态机**（`src/lib/banner.ts`）：`resolveBannerState()` 纯函数实现 playing / paused-hover / paused-focus / paused-hidden / reduced-motion / static-fallback / single-item；固定参数 6000ms 间隔 / 1200ms 过渡 / 40px 滑动阈值集中在该模块，无第二套数值（BR-19）。单一计时器，状态变化即重置（AC-18）；标签页隐藏暂停、返回续播；手动切换时 `aria-live="polite"` 播报帧标签（FR-20）。
- **微动效 M1~M10**：缓动统一 `cubic-bezier(.22,.61,.36,1)`，仅 transform/opacity；`——` 占位数字不渐显（BR-25）；全部动效受 `data-motion=off` 与 `prefers-reduced-motion` 降级（BR-20/21）。
- **关于我们二级导航**（D3）：桌面触发器链接（无脚本直达 `/zh/about/`，BR-23）+ chevron 点击 / Enter / Space 展开，`Escape` 关闭并焦点返回，hover 仅辅助；移动抽屉为可展开分组。当前态三重冗余（竖条 + 字重 + 颜色，AC-26）。
- **投资者关系** `/zh/about/investors/`：IR-Hero + 摘要 + 股权卡片 + 融资时间轴 + 联系，全字段【待提供】，无结构化数据、占位不入 SEO 事实（AC-27/28）。
- **人才招聘** `/zh/about/careers/`：职位内容集合 `src/content/jobs/`（Zod schema，placeholder/published 字段）；chip 筛选（部门/地点）+ 清空 + 无结果空态；独立展开（aria-expanded）；邮箱由 `site.careersEmail` 配置，无效时 DOM 无 mailto、显示「招聘邮箱待提供」（AC-30）；点击 mailto 仅提示打开邮件客户端，不显示申请成功（BR-28）。
