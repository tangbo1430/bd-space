/** Readable counterparts to the 13 supplied company presentation panels.
 * Source: 网页调整4/4/4关于我们/量产房子 全球卖房商业计划书_01–13.png.
 * Projections remain plans; company history uses the corroborated profile.
 */
type Copy = { title: string; paragraphs: string[]; rows?: [string, string][] };
type Story = {
  zh: Copy;
  en: Copy;
  images?: { base: string; zh: string; en: string }[];
};
export const aboutStory: Story[] = [
  {
    zh: {
      title: "让房子成为可以制造的产品。",
      paragraphs: [
        "半打空间集成房屋（江门）有限公司，以工业化建造为方向，连接设计、制造与现场装配，探索面向不同市场的住宅产品。",
      ],
    },
    en: {
      title: "Homes, made as products.",
      paragraphs: [
        "Semi Six Modular Building Manufacturing (Jiangmen) Co.,Ltd connects design, manufacturing and on-site assembly. Our focus is industrialised building: developing homes that can serve different markets.",
      ],
    },
  },
  {
    zh: {
      title: "从长期研发，到工厂制造。",
      paragraphs: [
        "团队持续探索装配式建筑，将构件、功能模块和现场装配纳入同一个建造系统。让建筑在工厂中有序成形，是这条技术路线的核心。",
      ],
    },
    en: {
      title: "From research to manufacturing.",
      paragraphs: [
        "Our work in prefabricated construction brings components, functional modules and on-site assembly into one building system. The aim is to make the factory an integral part of how a home takes shape.",
      ],
    },
    images: [
      { base: "v11-factory", zh: "工厂制造", en: "Factory manufacturing" },
    ],
  },
  {
    zh: {
      title: "面向更广阔的居住需求。",
      paragraphs: [
        "工业化建造让住宅的设计、生产与运输能够共同规划。半打关注国内与海外项目，希望让工厂制造的空间抵达更多场地。",
      ],
    },
    en: {
      title: "A wider view of housing.",
      paragraphs: [
        "Industrialised construction allows design, production and transport to be planned together. We work with domestic and overseas project needs, exploring how factory-made spaces can reach more sites.",
      ],
    },
  },
  {
    zh: {
      title: "住宅，不止于建造。",
      paragraphs: [
        "量产住宅是半打的长期方向。我们也关注空间投入使用之后的生活体验，探索住宅与智能系统结合的可能。",
      ],
    },
    en: {
      title: "Beyond the building process.",
      paragraphs: [
        "Manufacturing homes at scale is our long-term direction. We also look at life after construction, including the possibilities of integrating homes with intelligent systems.",
      ],
    },
  },
  {
    zh: {
      title: "连接空间与智能生活。",
      paragraphs: [
        "从手机、汽车到住宅，智能技术正进入更多日常场景。半打将住宅视为未来智能生活的重要载体，持续探索建筑与系统的协同。",
      ],
    },
    en: {
      title: "Spaces for connected living.",
      paragraphs: [
        "From phones and cars to homes, intelligent technology is entering more of everyday life. We see the home as a setting for future connected living and continue to explore the relationship between buildings and systems.",
      ],
    },
  },
  {
    zh: {
      title: "黄昆 · 创始人",
      paragraphs: [
        "持续参与装配式建筑研发与实践，将技术探索与工厂制造连接起来。",
      ],
      rows: [
        ["2008", "创办快而居，开展装配式建筑相关工作。"],
        ["2014", "快而居被三一收购。"],
        ["2016", "创办草根民墅，推进装配式建筑实践。"],
        ["2025", "半打空间在广东江门成立。"],
      ],
    },
    en: {
      title: "Huang Kun · Founder",
      paragraphs: [
        "A career in prefabricated construction, connecting technical development with manufacturing practice.",
      ],
      rows: [
        ["2008", "Founded Kuai Er Ju to work in prefabricated construction."],
        ["2014", "Kuai Er Ju was acquired by SANY."],
        [
          "2016",
          "Founded Caogen Minshu to continue prefabricated building projects.",
        ],
        ["2025", "Semi-Six Modular was established in Jiangmen, Guangdong."],
      ],
    },
    images: [
      { base: "founder-huang-kun", zh: "创始人黄昆", en: "Huang Kun, founder" },
    ],
  },
  {
    zh: {
      title: "产业协作与股权结构",
      paragraphs: [
        "广东志特装配科技有限公司参股，为制造协同与产业资源对接提供支持。",
      ],
      rows: [
        ["60%", "昆记投资（中山）有限公司"],
        ["38%", "广东志特装配科技有限公司"],
        ["1%", "联润（南昌）企业管理有限公司"],
        ["1%", "四川澳美优品国际贸易有限公司"],
      ],
    },
    en: {
      title: "Industrial collaboration and ownership",
      paragraphs: [
        "Guangdong GETO Prefabricated Technology Co., Ltd. is a shareholder, supporting manufacturing collaboration and access to industrial resources.",
      ],
      rows: [
        ["60%", "Kunji Investment (Zhongshan) Co., Ltd."],
        ["38%", "Guangdong GETO Prefabricated Technology Co., Ltd."],
        ["1%", "Lianrun (Nanchang) Enterprise Management Co., Ltd."],
        ["1%", "Sichuan Aomei Youpin International Trade Co., Ltd."],
      ],
    },
  },
  {
    zh: {
      title: "板式、模块与组合建造",
      paragraphs: ["以结构、填充与表皮的组合思路，组织不同的建造方式。"],
      rows: [
        ["2D 板式", "支持非标准定制，结合现场条件组织构件装配。"],
        ["3D 模块", "面向批量项目，将更多工作安排在工厂完成。"],
        ["2D＋3D 组合", "结合板式构件与功能模块，适应不同项目场景。"],
      ],
    },
    en: {
      title: "Panels, modules and hybrid construction",
      paragraphs: [
        "Structure, infill and envelope work together across three approaches to building.",
      ],
      rows: [
        [
          "2D panels",
          "Customisable components assembled to suit site conditions.",
        ],
        [
          "3D modules",
          "More work completed in the factory for multi-unit projects.",
        ],
        [
          "2D + 3D hybrid",
          "Panels and functional modules combined for different project settings.",
        ],
      ],
    },
    images: [
      {
        base: "r4-system-panels",
        zh: "2D 板式建造示意",
        en: "2D panel construction",
      },
      {
        base: "r4-system-modules",
        zh: "3D 模块建造示意",
        en: "3D modular construction",
      },
      {
        base: "r4-system-hybrid",
        zh: "2D＋3D 组合建造示意",
        en: "2D + 3D hybrid construction",
      },
    ],
  },
  {
    zh: {
      title: "从住宅产品，到合作网络。",
      paragraphs: [
        "围绕住宅产品，探索项目开发、标准产品销售和系统配套等合作方式，与合作伙伴共同拓展应用场景。",
      ],
    },
    en: {
      title: "From housing products to partnerships.",
      paragraphs: [
        "Around the home itself, we are exploring project development, standard product sales and supporting systems, working with partners to broaden their applications.",
      ],
    },
  },
  {
    zh: {
      title: "长期商业规划",
      paragraphs: [
        "商业计划围绕成本效率、国内外市场、智能系统搭载和现金流管理四个方向展开。计划提出八年后年营收 1.5 万亿元、年利润 1,200 亿元的目标，属于长期规划。",
      ],
      rows: [
        ["5,250 亿元", "全球联合开发房地产"],
        ["3,750 亿元", "社会性住房建设"],
        ["2,250 亿元", "标准化住宅产品销售"],
        ["2,250 亿元", "智能／光伏系统搭载"],
        ["750 亿元", "粉丝经济"],
        ["750 亿元", "其他"],
      ],
    },
    en: {
      title: "Long-term business planning",
      paragraphs: [
        "The business plan considers production efficiency, domestic and overseas markets, intelligent systems and cash-flow management. Its eight-year targets are RMB 1.5 trillion in annual revenue and RMB 120 billion in annual profit. These are long-term planning targets.",
      ],
      rows: [
        ["RMB 525 billion", "Joint property development"],
        ["RMB 375 billion", "Social housing construction"],
        ["RMB 225 billion", "Standard housing products"],
        ["RMB 225 billion", "Intelligent and photovoltaic systems"],
        ["RMB 75 billion", "Community-based commerce"],
        ["RMB 75 billion", "Other activities"],
      ],
    },
  },
  {
    zh: {
      title: "融资与试产计划",
      paragraphs: [
        "拟融资 3,000 万元人民币，出让 10% 股权，用于核心团队、小型试产线和项目周转。试产线服务于研发、样板与技术验证；量产阶段计划与更大规模的工厂协作。",
      ],
      rows: [
        ["1,200 万元", "25 人核心团队，计划支持三年运转。"],
        ["1,000 万元", "3,000㎡ 单跨厂房与两台立体模具，用于样板和研发打样。"],
        ["800 万元", "项目周转与新技术样板、试验备用金。"],
      ],
    },
    en: {
      title: "Funding and pilot production",
      paragraphs: [
        "The proposal seeks RMB 30 million for a 10% equity stake, allocated to a core team, a small pilot line and working capital. The pilot line is intended for research, prototypes and technical validation, with larger factories envisaged for volume production.",
      ],
      rows: [
        [
          "RMB 12 million",
          "A 25-person core team, with three years of planned operating support.",
        ],
        [
          "RMB 10 million",
          "A 3,000 m² single-span workshop and two three-dimensional moulds for prototypes and development.",
        ],
        [
          "RMB 8 million",
          "Project working capital and reserves for new technology prototypes and trials.",
        ],
      ],
    },
  },
  {
    zh: {
      title: "让制造的空间，抵达更远的地方。",
      paragraphs: [
        "延续工业化建造的探索，把设计、技术与生产连接起来，让中国制造的住宅产品走向更多市场。",
      ],
    },
    en: {
      title: "Made here. Reaching further.",
      paragraphs: [
        "Our ambition is to connect design, technology and production, bringing housing products manufactured in China to more markets.",
      ],
    },
  },
  {
    zh: {
      title: "与半打对话",
      paragraphs: ["了解建造技术、产品与项目合作，欢迎与我们联系。"],
      rows: [
        ["黄昆", "137 0236 3540"],
        ["唐雅婷", "185 0300 5860"],
      ],
    },
    en: {
      title: "Talk to Semi-Six Modular",
      paragraphs: [
        "Contact us to discuss construction technology, products and project collaboration.",
      ],
      rows: [
        ["Huang Kun", "+86 137 0236 3540"],
        ["Tang Yating", "+86 185 0300 5860"],
      ],
    },
  },
];
