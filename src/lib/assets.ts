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

/** 产品详情批准辅图（不含第三方车辆）；v1.8 批次：4S 详情图组（人物已脱敏，dusk-door 原生 608 宽不放大） */
export const PRODUCT_ASSETS = {
  bd8Interior: { base: 'product-bd8-interior-01', alt: '半打风系列 BD8 产品室内空间实景渲染', w: 1281, h: 870, mw: 960, mh: 652 },
  bd9Floorplan: { base: 'product-bd9-floorplan', alt: '半打风系列 BD9 产品户型图（含房间标注与尺寸线）', w: 1395, h: 810, mw: 960, mh: 557 },
  p4sDusk: { base: 'product-4s-dusk', alt: '半打 4S 产品黄昏正立面实景', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m' },
  p4sDetailWall: { base: 'product-4s-detail-wall', alt: '半打 4S 产品外墙细节实景', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m' },
  p4sDuskDoor: { base: 'product-4s-dusk-door', alt: '半打 4S 产品入户门黄昏实景', w: 608, h: 810, maxW: 608 },
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

/* ==================== v1.7 RAR 批次真实素材（asset-manifest-rar.csv，G1/Reviewer PASS） ==================== */
/* 全部自有版权；award-* 证书与黑底 brand-logo 本轮不上站（证书口径待确认；黑底 Logo 禁入浅底区域） */

/** 首页 Banner 三帧（21:9 桌面 1920×823 + 移动 960×411） */
export const HOME_HERO_ASSETS = {
  hero01: { base: 'home-hero-01', w: 1920, h: 823, mw: 960, mh: 411, msuf: '-m', alt: '半打空间 4S 模块化建筑黄昏全景' },
  hero02: { base: 'home-hero-02', w: 1920, h: 823, mw: 960, mh: 411, msuf: '-m', alt: '半打空间 5S 模块化建筑日景正面' },
  hero03: { base: 'home-hero-03', w: 1920, h: 823, mw: 960, mh: 411, msuf: '-m', alt: '半打空间 6S 模块化建筑黄昏实景' },
} satisfies Record<string, Img16>;

/** 关于我们首图（21:9；右栏含愿景文案，移动裁左半建筑） */
export const ABOUT_HERO_ASSET: Img16 = { base: 'about-hero', w: 1920, h: 823, mw: 960, mh: 412, msuf: '-m', alt: '半打空间白盒装配式建筑与愿景标语' };

/** M4 案例墙（v1.7 RAR 封面替换 v1.6 低清/旧图；仅地点+类型，无客户名）；v1.9 新增常州/成都/江门/中山方舱/米阁封面（营房封面客户名待确认暂不列入） */
export const CASE_COVER_ASSETS: Record<string, Img16> = {
  cayman: { base: 'case-cover-cayman', w: 1667, h: 1250, mw: 960, mh: 720, msuf: '-m', alt: '开曼群岛海外住宅项目外观实景' },
  brisbane: { base: 'case-cover-brisbane', w: 1667, h: 1250, mw: 960, mh: 720, msuf: '-m', alt: '澳大利亚布里斯班住宅项目外观实景' },
  zhongshan: { base: 'case-cover-zhongshan-fd', w: 1667, h: 1250, mw: 960, mh: 720, msuf: '-m', alt: '中国中山低层住宅项目外观实景' },
  fiji: { base: 'case-cover-fiji', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '斐济模块化建筑样箱外观实景' },
  changzhou: { base: 'case-cover-changzhou', w: 1667, h: 1250, mw: 960, mh: 720, msuf: '-m', alt: '中国常州4S住宅项目外观实景' },
  chengdu: { base: 'case-cover-chengdu-dorm', w: 1667, h: 1250, mw: 960, mh: 720, msuf: '-m', alt: '中国成都宿舍建筑项目外观实景' },
  jiangmen: { base: 'case-cover-jiangmen', w: 1667, h: 1250, mw: 960, mh: 720, msuf: '-m', alt: '中国江门装配式建筑项目外观实景' },
  zhongshanCabin: { base: 'case-cover-zhongshan-cabin', w: 1667, h: 1250, mw: 960, mh: 720, msuf: '-m', alt: '中国中山方舱建筑项目外观实景' },
  mige: { base: 'case-cover-zhongshan-mg', w: 1667, h: 1250, mw: 960, mh: 720, msuf: '-m', alt: '中国中山独栋民宅项目外观实景' },
};

/** 产品详情主图（16:9 桌面 1920×1080 + 移动 960×540；按产品系列名映射） */
export const PRODUCT_HERO_ASSETS: Record<string, Img16> = {
  '4s': { base: 'product-4s-hero', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '半打 4S 产品外观实景' },
  '5s': { base: 'product-5s-hero', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '半打 5S 产品外观实景' },
  '6s': { base: 'product-6s-hero', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '半打 6S 产品外观实景' },
  grayscale: { base: 'product-grayscale-hero', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '灰度空间产品外观实景' },
};

/** M3 交付流程 step02 工厂生产实拍（无人物；panels 无移动档、上限 1280px） */
export const FLOW_FACTORY_ASSETS = {
  module: { base: 'flow-factory-module', w: 1080, h: 810, mw: 960, mh: 720, msuf: '-m', alt: '工厂车间内白色模块构件实拍' },
  panels: { base: 'flow-factory-panels', w: 1280, h: 960, alt: '工厂墙板存放区实拍' },
} satisfies Record<string, Img16>;

/* ==================== v1.6 增量素材（asset-manifest-v16.csv，均已批准） ==================== */

/** Img16 移动档后缀：v1.6 批次为 -960w（默认），v1.7 RAR 批次为 -m */
export interface Img16 {
  base: string;
  w: number;
  h: number;
  /** 移动档后缀 -m（存在时提供尺寸） */
  mw?: number;
  mh?: number;
  /** 移动档文件后缀（缺省 -960w；RAR 批次传 '-m'） */
  msuf?: string;
  alt: string;
  /** 展示宽上限（低清素材不放大，manifest max_display_width） */
  maxW?: number;
}

/* M4 案例墙素材由 v1.7 CASE_COVER_ASSETS 取代（RAR 全尺寸封面；原 v1.6 低清/裁剪图已删除） */

/** M3 交付流程实拍步骤（v1.6 批次；step05 运输图已被 v1.8 frames-load 替换并删除原图）；mechPipingAlt 为 step04 机电备用实拍 */
export const FLOW_ASSETS = {
  mechPiping: { base: 'flow-mech-piping', w: 1379, h: 1034, alt: '工厂内机电管线预制特写' },
  mechPipingAlt: { base: 'flow-mech-piping-alt', w: 1376, h: 1032, alt: '工厂内机电管线与内装同步预制实拍' },
  transportFrames: { base: 'flow-transport-frames', w: 510, h: 205, alt: '厂区运输框架', maxW: 510 },
} satisfies Record<string, Img16>;

/** 原创 SVG 线稿（设计师原创，320×240 视框；flow step01/03/06 已由 v1.8 实拍替换，SVG 保留为降级底稿） */
export const LINEART_SVGS = {
  flowStep01: 'flow-step-01-design.svg',
  flowStep02: 'flow-step-02-factory.svg',
  flowStep03: 'flow-step-03-inspection.svg',
  flowStep06: 'flow-step-06-install.svg',
  system2d: 'system-2d-panel.svg',
  system3d: 'system-3d-module.svg',
  systemCombined: 'system-combined.svg',
} as const;

/* ==================== v1.8 素材增强批次（asset-manifest-v18.csv，G1 三轮 PASS；人物/品牌/时间戳均已脱敏） ==================== */

/** M3 交付流程 v1.8 实拍替换（step01 制模 / step03 出厂检验 / step05 框架装载 / step06 吊装特写横幅）；v1.9 step06 恢复全幅 16:9 含人物 */
export const FLOW_V18_ASSETS = {
  step01Mold: { base: 'flow-step01-mold', w: 1504, h: 1128, alt: '工厂内构件生产模具制备实拍' },
  step03PanelLift: { base: 'flow-step03-panel-lift', w: 1080, h: 810, alt: '墙板出厂前吊装检验实拍' },
  step05FramesLoad: { base: 'flow-step05-frames-load', w: 1656, h: 932, mw: 960, mh: 540, msuf: '-m', alt: '构件框架装车运输组织实拍' },
  step06CranePanel: { base: 'flow-step06-crane-panel', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '现场吊装作业，工人协同吊装墙板' },
} satisfies Record<string, Img16>;

/** 案例施工实景图组（案例页新增模块；仅地点+项目类型，无客户名；深圳营房客户名待确认、暂缓上页不列入）
 *  v1.9：按人物允许出镜新口径补强，恢复清晰人物版并接入新增源素材，同案例择优不堆叠。
 *  江门不写合作方、深圳营房仅中性命名。 */
export interface CaseDetailGroup {
  loc: string;
  type: string;
  imgs: Img16[];
}
export const CASE_DETAIL_GROUPS: CaseDetailGroup[] = [
  {
    loc: '开曼群岛',
    type: '海外住宅',
    imgs: [
      { base: 'case-cayman-install-crane', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '开曼群岛海外住宅项目吊装现场，地面工人协同' },
      { base: 'case-cayman-install-roof', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '开曼群岛海外住宅项目二层吊装，屋顶工人作业' },
      { base: 'case-cayman-install-02', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '开曼群岛海外住宅项目墙板安装，现场工人协同' },
    ],
  },
  {
    loc: '澳大利亚 · 布里斯班',
    type: '住宅',
    imgs: [
      { base: 'case-brisbane-lift-01', w: 1080, h: 1440, mw: 960, mh: 1280, msuf: '-m', alt: '布里斯班住宅项目带窗墙板吊装，工人牵引就位' },
      { base: 'case-brisbane-install-frame', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '布里斯班住宅项目结构框架实景' },
      { base: 'case-brisbane-install-02', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '布里斯班住宅项目墙板就位，多人协同' },
    ],
  },
  {
    loc: '中国 · 中山',
    type: '方舱建筑',
    imgs: [
      { base: 'case-cabin-site-aerial', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '中山方舱建筑项目场地航拍实景' },
      { base: 'case-cabin-rows', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '中山方舱建筑项目成排箱体实景' },
      { base: 'case-fangcang-install-02', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '中山方舱建筑项目箱体就位现场' },
    ],
  },
  {
    loc: '中国 · 中山',
    type: '独栋民宅',
    imgs: [
      { base: 'case-mige-install-01', w: 1705, h: 1279, mw: 960, mh: 720, msuf: '-m', alt: '中山独栋民宅项目现场安装实景' },
      { base: 'case-mige-install-03', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '中山独栋民宅项目现场安装，工人作业' },
      { base: 'case-mige-install-05', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '中山独栋民宅项目现场安装实景' },
    ],
  },
  {
    loc: '中国 · 中山',
    type: '低层住宅',
    imgs: [
      { base: 'case-zhongshan-install-03', w: 1899, h: 1424, mw: 960, mh: 720, msuf: '-m', alt: '中山低层住宅项目吊装就位，现场指挥' },
    ],
  },
  {
    loc: '中国 · 成都',
    type: '宿舍建筑',
    imgs: [
      { base: 'case-chengdu-site-wide', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '成都宿舍建筑项目多栋工地全景' },
      { base: 'case-chengdu-assembly-01', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '成都宿舍建筑项目墙板吊装组对，登高作业' },
      { base: 'case-chengdu-install-03', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '成都宿舍建筑项目模块就位，雨中作业' },
      { base: 'case-chengdu-site-04', w: 1920, h: 1080, mw: 960, mh: 540, msuf: '-m', alt: '成都宿舍建筑项目营地全景，基础与吊装' },
    ],
  },
  {
    loc: '中国 · 常州',
    type: '4S 住宅',
    imgs: [
      { base: 'case-changzhou-install-02', w: 1728, h: 2304, mw: 960, mh: 1280, msuf: '-m', alt: '常州4S住宅项目现场安装，工人作业' },
      { base: 'case-changzhou-install-03', w: 1728, h: 2304, mw: 960, mh: 1280, msuf: '-m', alt: '常州4S住宅项目现场安装，吊装就位' },
    ],
  },
  {
    loc: '中国 · 深圳',
    type: '营房建筑',
    imgs: [
      { base: 'case-shenzhen-stack-03', w: 1584, h: 1188, mw: 960, mh: 720, msuf: '-m', alt: '深圳营房项目双层箱体堆叠吊装' },
      { base: 'case-shenzhen-glass-corner-04', w: 1152, h: 1536, mw: 960, mh: 1280, msuf: '-m', alt: '深圳营房项目玻璃幕墙转角仰拍' },
      { base: 'flow-transport-spreader-lift', w: 1044, h: 1392, mw: 960, mh: 1280, msuf: '-m', alt: '深圳营房项目平衡梁吊装箱体作业' },
      { base: 'flow-transport-lift-cabin', w: 1122, h: 1496, mw: 960, mh: 1280, msuf: '-m', alt: '深圳营房项目箱体吊装上平板车，安全帽工人背影' },
    ],
  },
  {
    loc: '斐济',
    type: '模块化建筑',
    imgs: [
      { base: 'case-fiji-box-ext', w: 1705, h: 1279, alt: '斐济模块化建筑样箱外观实景' },
      { base: 'case-fiji-box-door', w: 1705, h: 1279, alt: '斐济模块化建筑样箱入户门实景' },
      { base: 'case-fiji-interior-06', w: 1631, h: 917, mw: 960, mh: 540, msuf: '-m', alt: '斐济模块化建筑样箱室内实景' },
    ],
  },
  {
    loc: '中国 · 江门',
    type: '装配式建筑',
    imgs: [
      { base: 'case-jiangmen-install-02', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '江门装配式建筑项目基础就位俯瞰' },
      { base: 'case-jiangmen-install-03', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '江门装配式建筑项目吊车箱体就位全景' },
    ],
  },
];

/* ==================== v1.9 人物口径批次（asset-manifest-v19.csv，人物允许出镜；G1 两轮 PASS） ==================== */

/** 施工流程 v1.9 运输吊装载入（运输组织/现场交付环节补充实拍） */
export const FLOW_V19_ASSETS = {
  liftCabin: { base: 'flow-transport-lift-cabin', w: 1122, h: 1496, mw: 960, mh: 1280, msuf: '-m', alt: '箱体吊装上平板车，安全帽工人背影' },
  spreaderLift: { base: 'flow-transport-spreader-lift', w: 1044, h: 1392, mw: 960, mh: 1280, msuf: '-m', alt: '平衡梁吊装箱体作业' },
  stacker01: { base: 'flow-transport-stacker-01', w: 1164, h: 1552, mw: 960, mh: 1280, msuf: '-m', alt: '正面吊装箱装车作业' },
  panel03: { base: 'flow-transport-panel-03', w: 543, h: 724, alt: '港区墙板吊卸，工人作业', maxW: 543 },
} satisfies Record<string, Img16>;

/** 工厂生产补充（关于/工厂能力区） */
export const FACTORY_V19_ASSETS = {
  precastUnits: { base: 'factory-precast-units', w: 1920, h: 1440, mw: 960, mh: 720, msuf: '-m', alt: '工厂预制混凝土单元构件养护现场' },
} satisfies Record<string, Img16>;

/** 现场安装细节 */
export const INSTALL_V19_ASSETS = {
  roofTrim: { base: 'install-detail-roof-trim', w: 1279, h: 1705, mw: 960, mh: 1280, msuf: '-m', alt: '现场安装屋面收边细节，登高作业' },
} satisfies Record<string, Img16>;
