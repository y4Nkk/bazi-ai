/**
 * Citation owner for the closed shensha annotation catalog. A source record
 * documents a lookup only; it cannot affect Qi, structure, verdicts, or trend
 * projection. "待原典核验" is deliberately visible and is not evidence of a
 * traditional conclusion.
 */
import type { ShenshaEvidence } from "./contract";

const SAN_MING_TONG_HUI_VOLUME_THREE = "https://zh.wikisource.org/zh/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%B8%89";
const SAN_MING_TONG_HUI_VOLUME_FIVE = "https://upload.wikimedia.org/wikipedia/commons/d/dd/NLC416-13jh000624-42998_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83.pdf";
const XING_XUE_DA_CHENG_HONG_LUAN = "https://www.shidianguji.com/book/SK1609/chapter/1m1qptylcjho2";
const WU_XING_JING_JI = "https://zh.wikisource.org/zh-hant/%E4%BA%94%E8%A1%8C%E7%B2%BE%E7%B4%80";
const GU_JIN_TU_SHU_JI_CHENG = "https://zh.wikisource.org/zh-hans/%E6%AC%BD%E5%AE%9A%E5%8F%A4%E4%BB%8A%E5%9C%96%E6%9B%B8%E9%9B%86%E6%88%90/%E5%8D%9A%E7%89%A9%E5%BD%99%E7%B7%A8/%E8%97%9D%E8%A1%93%E5%85%B8/%E7%AC%AC598%E5%8D%B7#论将星华盖";

export const SHENSHA_CODES = {
  tianYi: "SHENSHA_TIAN_YI",
  taiJi: "SHENSHA_TAI_JI",
  wenChang: "SHENSHA_WEN_CHANG",
  fuXing: "SHENSHA_FU_XING",
  guoYin: "SHENSHA_GUO_YIN",
  tianChu: "SHENSHA_TIAN_CHU",
  lu: "SHENSHA_LU",
  yangRen: "SHENSHA_YANG_REN",
  feiRen: "SHENSHA_FEI_REN",
  hongYan: "SHENSHA_HONG_YAN",
  jinYu: "SHENSHA_JIN_YU",
  tianDe: "SHENSHA_TIAN_DE",
  tianDeHe: "SHENSHA_TIAN_DE_HE",
  yueDe: "SHENSHA_YUE_DE",
  yueDeHe: "SHENSHA_YUE_DE_HE",
  deXiu: "SHENSHA_DE_XIU",
  tianYiMedical: "SHENSHA_TIAN_YI_MEDICAL",
  yiMa: "SHENSHA_YI_MA",
  taoHua: "SHENSHA_TAO_HUA",
  huaGai: "SHENSHA_HUA_GAI",
  jiangXing: "SHENSHA_JIANG_XING",
  jieSha: "SHENSHA_JIE_SHA",
  zaiSha: "SHENSHA_ZAI_SHA",
  wangShen: "SHENSHA_WANG_SHEN",
  liuE: "SHENSHA_LIU_E",
  guChen: "SHENSHA_GU_CHEN",
  guaSu: "SHENSHA_GUA_SU",
  hongLuan: "SHENSHA_HONG_LUAN",
  tianXi: "SHENSHA_TIAN_XI",
  kongWang: "SHENSHA_KONG_WANG",
} as const;

const direct = (section: string, basis: string): ShenshaEvidence => ({
  grade: "原典直引",
  work: "《三命通会》",
  section: `卷三·${section}`,
  url: SAN_MING_TONG_HUI_VOLUME_THREE,
  basis,
});

const pending = (basis: string): ShenshaEvidence => ({
  grade: "待原典核验",
  work: "待补原典",
  section: "当前冻结查表尚未完成逐字定位",
  url: null,
  basis,
});

export const SHENSHA_EVIDENCE: Record<string, ShenshaEvidence> = {
  [SHENSHA_CODES.tianYi]: direct("论天乙贵人", "以日干取贵人支位"),
  [SHENSHA_CODES.taiJi]: direct("论太极贵", "以日干取太极支位"),
  [SHENSHA_CODES.wenChang]: direct("论太极贵", "文昌歌按日干取支位"),
  [SHENSHA_CODES.fuXing]: {
    grade: "流派变体",
    work: "《三命通会》",
    section: "卷五·福星贵人",
    url: SAN_MING_TONG_HUI_VOLUME_FIVE,
    basis: "原文以年柱干支论；当前日干取支为项目冻结变体，未把断语自动化",
  },
  [SHENSHA_CODES.guoYin]: pending("以日干取支位"),
  [SHENSHA_CODES.tianChu]: {
    grade: "原典直引",
    work: "《五行精纪》",
    section: "天厨格",
    url: WU_XING_JING_JI,
    basis: "以日干食神见禄推天厨支位",
  },
  [SHENSHA_CODES.lu]: direct("论十干禄", "十干就支神为禄"),
  [SHENSHA_CODES.yangRen]: {
    ...direct("论羊刃", "禄前一辰的羊刃取法"),
    grade: "流派变体",
    basis: "当前十干表采用项目冻结变体；原文对阴干取法另有分歧，未把断语自动化",
  },
  [SHENSHA_CODES.feiRen]: {
    ...direct("论羊刃", "羊刃对冲为飞刃"),
    grade: "流派变体",
    basis: "阳干支位可由原文羊刃表推出；阴干部分随项目冻结羊刃变体，未把断语自动化",
  },
  [SHENSHA_CODES.hongYan]: direct("总论诸神煞", "红艳煞歌按日干取支位"),
  [SHENSHA_CODES.jinYu]: direct("论金舆", "禄前二辰取金舆"),
  [SHENSHA_CODES.tianDe]: direct("论天月德", "按月支取天德"),
  [SHENSHA_CODES.tianDeHe]: direct("论天月德", "按月支取天德合"),
  [SHENSHA_CODES.yueDe]: direct("论天月德", "按三合月令取月德"),
  [SHENSHA_CODES.yueDeHe]: direct("论天月德", "按月德干合取月德合"),
  [SHENSHA_CODES.deXiu]: direct("论德秀", "按月支三合局取德、秀天干"),
  [SHENSHA_CODES.tianYiMedical]: pending("以月支取天医支位"),
  [SHENSHA_CODES.yiMa]: direct("论驿马", "以三合局取驿马"),
  [SHENSHA_CODES.taoHua]: direct("总论诸神煞", "桃花煞按三合局取支位"),
  [SHENSHA_CODES.huaGai]: {
    grade: "原典直引",
    work: "《五行精纪》",
    section: "论华盖",
    url: WU_XING_JING_JI,
    basis: "以三合局墓支取华盖",
  },
  [SHENSHA_CODES.jiangXing]: {
    grade: "原典直引",
    work: "《钦定古今图书集成》",
    section: "艺术典第598卷·论将星华盖",
    url: GU_JIN_TU_SHU_JI_CHENG,
    basis: "以三合局中位取将星",
  },
  [SHENSHA_CODES.jieSha]: direct("论劫煞亡神", "以三合局五行绝处取劫煞"),
  [SHENSHA_CODES.zaiSha]: direct("论灾煞", "冲破将星之支为灾煞"),
  [SHENSHA_CODES.wangShen]: direct("论劫煞亡神", "以三合局五行临官处取亡神"),
  [SHENSHA_CODES.liuE]: direct("论六厄", "以三合局五行死处取六厄"),
  [SHENSHA_CODES.guChen]: direct("论孤辰寡宿", "三方支位进一辰取孤辰"),
  [SHENSHA_CODES.guaSu]: direct("论孤辰寡宿", "三方支位退一辰取寡宿"),
  [SHENSHA_CODES.hongLuan]: {
    grade: "原典直引",
    work: "《星学大成》",
    section: "论红鸾天喜",
    url: XING_XUE_DA_CHENG_HONG_LUAN,
    basis: "子年加卯逆数取红鸾",
  },
  [SHENSHA_CODES.tianXi]: {
    grade: "原典直引",
    work: "《星学大成》",
    section: "论红鸾天喜",
    url: XING_XUE_DA_CHENG_HONG_LUAN,
    basis: "子年加酉逆数取天喜",
  },
  [SHENSHA_CODES.kongWang]: direct("论空亡", "以日柱所属甲旬尽处取空亡"),
};

export function shenshaEvidenceOf(code: string): ShenshaEvidence {
  const evidence = SHENSHA_EVIDENCE[code];
  if (!evidence) throw new Error(`神煞证据目录缺少条目: ${code}`);
  return evidence;
}
