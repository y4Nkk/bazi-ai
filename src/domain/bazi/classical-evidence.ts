/**
 * Public, non-predictive reading map for the deterministic rule chain.
 * It records what a source supports and, equally, what ZP-1 has not encoded.
 */
export interface ClassicalEvidenceEntry {
  area: string;
  source: string;
  section: string;
  url: string;
  implementation: "已接入" | "本轮收紧" | "待逐条审校" | "注记层";
  boundary: string;
}

export const CLASSICAL_EVIDENCE: readonly ClassicalEvidenceEntry[] = [
  {
    area: "月令与格局锚点",
    source: "《子平真诠》",
    section: "论用神",
    url: "https://donglishuzhai.net/chapter/3721.html",
    implementation: "已接入",
    boundary: "以月令本气作为格局锚点；用神候选仍由本项目冻结的证据链裁决。",
  },
  {
    area: "化气与从格",
    source: "《滴天髓》",
    section: "化气、从化",
    url: "https://zh.wikisource.org/zh/%E6%BB%B4%E5%A4%A9%E9%AB%93/07",
    implementation: "本轮收紧",
    boundary: "化气要求指定月令、独相作合与化神得势；从格排除外柱比劫、印星生扶。",
  },
  {
    area: "扶抑与旺衰",
    source: "《滴天髓》",
    section: "衰旺",
    url: "https://zh.wikisource.org/wiki/%E6%BB%B4%E5%A4%A9%E9%AB%93/12",
    implementation: "已接入",
    boundary: "本项目采用可复现整数气账本；数值权重是工程规则，不是古籍原文数值。",
  },
  {
    area: "调候",
    source: "《穷通宝鉴》",
    section: "十干分论",
    url: "https://zh.wikisource.org/wiki/%E7%A9%B7%E9%80%9A%E5%AE%9D%E9%89%B4",
    implementation: "待逐条审校",
    boundary: "现行仅为基础寒暖燥湿层；十日干×十二月令的主取、次取表尚未接入，不能把当前结果称为《穷通宝鉴》全表。",
  },
  {
    area: "神煞查表",
    source: "《三命通会》《五行精纪》等",
    section: "逐条证据目录",
    url: "https://zh.wikisource.org/zh/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%B8%89",
    implementation: "注记层",
    boundary: "逐条标示原典、变体或待核验；神煞绝不参与旺衰、格局、喜忌或趋势指数。",
  },
];
