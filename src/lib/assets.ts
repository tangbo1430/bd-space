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
