/**
 * 首批批准真实素材（主管首批决策 + asset-manifest.csv，v1.0 批次）。
 * 仅列入已批准文件；含第三方车辆的 BD8/BD9 hero/card 继续保留占位、不得引用。
 * 文件位于 public/assets/img/，桌面 WebP + 移动 960w WebP + JPG 回退。
 */

export interface BannerAsset {
  /** 名前缀：home-banner-60m-living-01 */
  base: string;
  alt: string;
}

/** 首页 Banner 已批准帧（桌面 1920×823 21:9 + 移动 960×1200 4:5） */
export const BANNER_ASSETS: Record<string, BannerAsset> = {
  living: { base: 'home-banner-60m-living-01', alt: '半打空间 60㎡ 装配式住宅外观与庭院实景渲染' },
  dining: { base: 'home-banner-60m-dining-02', alt: '半打空间 60㎡ 装配式住宅餐厨空间实景渲染' },
};

export interface SpaceAsset {
  base: string;
  alt: string;
  w: number;
  h: number;
  mw: number;
  mh: number;
}

/** 空间氛围图（p07–p11，无裁切等比缩放；桌面 1920×1288 + 移动 960×644） */
export const SPACE_ASSETS: Record<'dining' | 'kitchen' | 'bath' | 'laundry' | 'bedroom', SpaceAsset> = {
  dining: { base: 'space-60m-dining', alt: '半打空间 60㎡ 住宅餐厅空间实景渲染', w: 1920, h: 1288, mw: 960, mh: 644 },
  kitchen: { base: 'space-60m-kitchen', alt: '半打空间 60㎡ 住宅厨房空间实景渲染', w: 1920, h: 1288, mw: 960, mh: 644 },
  bath: { base: 'space-60m-bath', alt: '半打空间 60㎡ 住宅卫浴空间实景渲染', w: 1920, h: 1288, mw: 960, mh: 644 },
  laundry: { base: 'space-60m-laundry', alt: '半打空间 60㎡ 住宅家政洗衣空间实景渲染', w: 1920, h: 1288, mw: 960, mh: 644 },
  bedroom: { base: 'space-60m-bedroom', alt: '半打空间 60㎡ 住宅卧室空间实景渲染', w: 1920, h: 1288, mw: 960, mh: 644 },
};

/** 产品详情批准辅图（不含第三方车辆） */
export const PRODUCT_ASSETS = {
  bd8Interior: { base: 'product-bd8-interior-01', alt: '半打风系列 BD8 产品室内空间实景渲染', w: 1281, h: 870, mw: 960, mh: 652 },
  bd9Floorplan: { base: 'product-bd9-floorplan', alt: '半打风系列 BD9 产品户型图（含房间标注与尺寸线）', w: 1395, h: 810, mw: 960, mh: 557 },
} as const;

/**
 * 继续保留占位（画面含可识别第三方车辆，暂不发布；不得在页面引用）：
 * product-bd8-hero / product-bd8-card / product-bd9-hero / product-bd9-card
 */
export const WITHHELD_ASSETS = [
  'product-bd8-hero',
  'product-bd8-card',
  'product-bd9-hero',
  'product-bd9-card',
] as const;

/* ==================== v1.6 增量素材（asset-manifest-v16.csv，均已批准） ==================== */

export interface Img16 {
  base: string;
  w: number;
  h: number;
  /** 移动档后缀 -m（存在时提供尺寸） */
  mw?: number;
  mh?: number;
  alt: string;
  /** 展示宽上限（低清素材不放大，manifest max_display_width） */
  maxW?: number;
}

/** M4 案例墙（仅地点+类型，无客户/金额/工期） */
export const CASE_ASSETS: Record<'cayman' | 'brisbane' | 'zhongshan' | 'fiji', Img16> = {
  cayman: { base: 'case-cayman-hero', w: 1920, h: 1440, mw: 960, mh: 720, alt: '开曼群岛海外住宅项目建成实景' },
  brisbane: { base: 'case-brisbane-ext', w: 711, h: 533, alt: '澳大利亚布里斯班住宅项目后院外观', maxW: 711 },
  zhongshan: { base: 'case-zhongshan-house', w: 568, h: 426, alt: '中国中山低层住宅项目建成实景', maxW: 568 },
  fiji: { base: 'case-fiji-interior', w: 1705, h: 1279, mw: 960, mh: 720, alt: '斐济模块化酒店室内客厅实景' },
};

/** M3 交付流程实拍步骤（step 01–03 为原创 SVG 线稿占位，不在此列） */
export const FLOW_ASSETS = {
  mechPiping: { base: 'flow-mech-piping', w: 1379, h: 1034, alt: '工厂内机电管线预制特写' },
  transport: { base: 'flow-delivery-module', w: 1920, h: 1440, mw: 960, mh: 720, alt: '模块构件吊装运输现场' },
  transportFrames: { base: 'flow-transport-frames', w: 510, h: 205, alt: '厂区运输框架', maxW: 510 },
  delivery: { base: 'flow-delivery-module', w: 1920, h: 1440, mw: 960, mh: 720, alt: '模块构件现场吊装交付' },
} satisfies Record<string, Img16>;

/** 原创 SVG 线稿（设计师原创，320×240 视框） */
export const LINEART_SVGS = {
  flowStep01: 'flow-step-01-design.svg',
  flowStep02: 'flow-step-02-factory.svg',
  flowStep03: 'flow-step-03-inspection.svg',
  flowStep06: 'flow-step-06-install.svg',
  system2d: 'system-2d-panel.svg',
  system3d: 'system-3d-module.svg',
  systemCombined: 'system-combined.svg',
} as const;
