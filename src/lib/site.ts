/**
 * 全站事实数据集中配置。
 * 事实纪律（PRD BR-5/BR-15）：未提供的信息一律以「【待提供】」呈现，禁止虚构。
 * 上线前由需求方提供并替换本文件中的占位值。
 */

export const PLACEHOLDER = '【待提供】';

export const site = {
  name: '半打空间',
  nameEn: 'BANDA SPACE',
  // 示例品牌文案需 PM/客户确认（见 UI 规范 §9 已知限制）
  tagline: '装配式混凝土空间的制造者',
  contact: {
    phone: PLACEHOLDER,
    email: PLACEHOLDER,
    address: PLACEHOLDER,
  },
  icp: PLACEHOLDER, // ICP 备案号
  /** 招聘邮箱（OP-27）：未确认前保持占位，页面不生成 mailto（BR-27/AC-30） */
  careersEmail: PLACEHOLDER,
  year: new Date().getFullYear(),
} as const;
