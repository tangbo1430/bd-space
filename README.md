# 半打空间企业官网（bd-space）

装配式混凝土工厂企业官网，Web + 移动端响应式同站，多语言单站点（`/zh/` 默认，`/en/` 预留）。

- 基线：`prd-SUNM3245-2-v0.3`、`ui-design-spec-SUNM3245-2-v1.1`、`prototype-SUNM3245-2-v1.1`、T1 用例（Issue SUNM3245-2 附件）
- 交付分支：`release/SUNM3245-2-corporate-website`（单一发布单元，BR-12）

## 技术栈

- [Astro 5](https://astro.build)（静态站点生成 + Content Collections 内容管理）
- TypeScript（strict）、原生 CSS（设计令牌 = UI 规范 v1.1 §1）、无框架 vanilla JS 交互
- `@astrojs/sitemap`（语言化站点地图）、ESLint 9 + eslint-plugin-astro、`astro check`、Vitest

## 本地运行

```bash
npm install
npm run dev        # http://localhost:4321（/ 自动进入 /zh/）
```

## 自动化检查

```bash
npm run lint        # ESLint
npm run type-check  # astro check（TS 严格）
npm run test        # Vitest：表单校验 + 路由/SEO 规则
npm run build       # 静态构建到 dist/
npm run verify      # 构建产物验证：关键路由 / canonical / hreflang / sitemap / 表单字段
npm run check       # 以上全部串联
npm run test:nav    # 导航带行为测试（Playwright，需先启动预览服务并监听 4321）
```

## 部署

静态产物在 `dist/`，可部署到任意静态托管（Nginx / OSS+CDN / Vercel / Netlify）。部署前配置环境变量（见 `.env.example` 与 `docs/technical-design.md`）：

| 变量 | 用途 | 未配置时行为 |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | canonical / sitemap / robots 的绝对地址 | 退回 `http://localhost:4321`（仅本地） |
| `PUBLIC_FORM_ENDPOINT` | 咨询表单提交端点（Web3Forms 兼容，如 `https://api.web3forms.com/submit`） | 与 key 任一缺失即禁用提交并提示（BR-16） |
| `PUBLIC_FORM_ACCESS_KEY` | 表单服务访问密钥 | 不附加 |
| `PUBLIC_ANALYTICS_SCRIPT_URL` / `PUBLIC_ANALYTICS_DOMAIN` | Plausible 兼容统计 | 不注入任何统计脚本 |

**密钥纪律**：密钥仅通过部署平台环境变量注入，仓库不提交任何密钥；`.env` 已 gitignore。

## 内容管理

内容由 `src/content/products/*.md`（产品）与 `src/lib/site.ts`（企业联系事实）维护，经 Content Collections Zod 校验；`published: false` 为草稿态不上线。数据模型与扩展（新闻/案例/资质集合、后续可接入 Headless CMS）见 `docs/technical-design.md`。

## 目录结构

```
src/
  layouts/BaseLayout.astro     # SEO head + 导航 + 页脚 + 统计注入
  components/                  # GNB/抽屉、浮动联系条、占位图、原创线稿、咨询表单
  pages/                       # / 重定向、/zh/ 七栏目与详情、/en/ 预留态、404、robots.txt
  content/products/            # 产品内容（Zod schema 校验）
  lib/                         # 路由清单、表单校验、SEO、统计、事实占位
  scripts/main.ts              # 轮播/抽屉/动效降级/表单状态机（vanilla）
  styles/global.css            # v1.1 设计令牌与组件样式
tests/                         # Vitest 单元测试
scripts/verify-build.mjs       # 构建产物验证
docs/technical-design.md       # 选型、环境变量、数据模型、SEO、统计、部署
```

## 占位与事实纪律

全部缺失素材以 `IMG-*` 几何/线稿占位呈现，事实数据统一 `【待提供】`，示例文案标注【示例文案，待确认】；隐私/Cookie 页面仅有模板与路由。替换清单见 UI 规范 §6，占位素材 ID 已在页面内标注。
