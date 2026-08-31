/** Domain types owned by src/domain/bazi. BirthInput itself is owned by normalize.ts. */
import type { Element } from "./constants";
import type { BirthInput } from "./normalize";

export type ChartGender = "male" | "female";
export type TimeStandard = "civil" | "trueSolar";
export type PillarName = "year" | "month" | "day" | "hour";
export type TemporalLayer = "原局" | "大运" | "流年" | "流月" | "流日" | "流时";
/** A visible combination is never implicitly a successful transformation. */
export type RelationState = "formed" | "blocked" | "contested" | "untransformed" | "broken";
export type RootGrade = "residual" | "middle" | "main" | "prosperous";

export interface HiddenStemFact {
  stem: string;
  element: Element;
  tenGod: string;
  /** 本气、中气、余气。 */
  rank: "main" | "middle" | "residual";
  /** Frozen qi-unit from rules.ts; not a public prediction score. */
  qiWeight: number;
}

export interface PillarFact {
  name: PillarName;
  ganzhi: string;
  stem: string;
  branch: string;
  stemElement: Element;
  branchElement: Element;
  /** 十神 of the pillar stem against the day master; the day pillar itself is 日主. */
  stemTenGod: string;
  hiddenStems: string[];
  hiddenTenGods: string[];
  hiddenStemFacts: HiddenStemFact[];
  lifeStage: string;
  nayin: string;
}

export interface CalendarFacts {
  lunarYearInChinese: string;
  lunarMonthLabel: string;
  lunarDayInChinese: string;
  animal: string;
  prevJieQi: { name: string; solar: string };
  nextJieQi: { name: string; solar: string };
}

/** A wall-clock reading of the birth moment under one time standard. */
export interface TimeCandidate {
  standard: TimeStandard;
  /** Evaluated local wall clock (trueSolar is already corrected). */
  localDateTime: string;
  shichen: string;
  /** Minutes added for true solar time; omitted for civil. */
  correctionMinutes: number | null;
  pillars: string[];
  calendar: CalendarFacts;
}

export interface NatalChart {
  pillars: PillarFact[];
  dayMaster: { stem: string; element: Element };
  /** Stems plus branch main qi, eight units total. */
  elementCounts: Record<Element, number>;
  /** Ten-god name → occurrences across pillar stems and hidden stems (day stem excluded). */
  tenGodCounts: Record<string, number>;
  monthCommand: HiddenStemFact;
  /** Position within the enclosing 节 interval, in integer thousandths. */
  seasonalProgressPermille: number;
  voidBranches: string[];
  roots: Array<{ pillar: PillarName; stem: string; grade: RootGrade }>;
  /** Closed traditional annotations; never used by qi, structure, or projection. */
  annotations: Array<{ code: string; label: string; subjects: string[] }>;
}

export interface LuckCycle {
  index: number;
  /** Empty before the first cycle starts. */
  ganzhi: string | null;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  /** Exact local calculation bounds; end is exclusive. */
  startDateTime: string;
  endDateTime: string;
  startAgeDetail: { years: number; months: number; days: number };
}

export interface LuckInfo {
  forward: boolean;
  directionLabel: "顺行" | "逆行";
  startDateTime: string;
  startAgeLabel: string;
  cycles: LuckCycle[];
}

/** Raised when the true-solar correction moves the day or the shichen. */
export interface BoundaryNotice {
  changedDay: boolean;
  changedShichen: boolean;
  civilDay: string;
  trueSolarDay: string;
  civilShichen: string;
  trueSolarShichen: string;
  correctionMinutes: number;
}

/** ZP-1 output vocabulary. A tendency is a rule conclusion, never a probability. */
export type Tendency = "favorable" | "mixed" | "challenging" | "neutral";
export type Intensity = "weak" | "moderate" | "strong" | "extreme";
export type EvidenceConfidence = "low" | "medium" | "high";

export interface RuleHit {
  /** Stable, versioned deterministic rule identifier. */
  id: string;
  code: string;
  label: string;
  polarity: "support" | "pressure" | "context";
  /** Numeric polarity consumed only by the projection formula: -1, 0, or 1. */
  direction: -1 | 0 | 1;
  /** Rule activation strength. The chart projection owns the numeric mapping. */
  severity: 1 | 2 | 3;
  temporalLayer: TemporalLayer;
  domainRelevance: Dimension[];
  subjects: string[];
}

export interface RelationEdge {
  id: string;
  code: string;
  label: string;
  state: RelationState;
  polarity: RuleHit["polarity"];
  severity: RuleHit["severity"];
  temporalLayer: TemporalLayer;
  subjects: string[];
  transformElement: Element | null;
  blockers: string[];
}

export interface QiState {
  /** Month-command element; this is the seasonal anchor, not a score. */
  seasonalElement: Element;
  dayMasterStrength: "extremeStrong" | "strong" | "balanced" | "weak" | "extremeWeak";
  followCandidate: "none" | "followStrong" | "followOutput" | "followWealth" | "followAuthority" | "transform";
  elementStrength: Record<Element, number>;
  supportingElements: Element[];
  drainingElements: Element[];
  climate: { temperature: "cold" | "balanced" | "warm"; moisture: "dry" | "balanced" | "wet" };
  flow: "blocked" | "partial" | "continuous";
  evidence: RuleHit[];
}

export interface NatalJudgment {
  /** One primary structure; special structures take precedence over month-command structures. */
  primaryStructure: string;
  auxiliaryStructure: string | null;
  structureStatus: "formed" | "impaired" | "candidate";
  structureAnchor: string;
  climateNeed: Element | null;
  balanceNeed: Element[];
  remedyElement: Element | null;
  favorableElements: Element[];
  adverseElements: Element[];
  tendency: Tendency;
  intensity: Intensity;
  confidence: EvidenceConfidence;
  evidence: RuleHit[];
}

export interface DomainVerdict {
  domain: Dimension;
  tendency: Tendency;
  intensity: Intensity;
  /** Rule agreement, never a real-world probability. */
  confidence: EvidenceConfidence;
  evidenceFor: RuleHit[];
  evidenceAgainst: RuleHit[];
  /** Non-directional evidence, including an explicit insufficient-evidence result. */
  evidenceContext: RuleHit[];
  ruleIds: string[];
  activePeriods: TemporalLayer[];
}

export const DIMENSION_KEYS = [
  "overall",
  "career",
  "wealth",
  "relationship",
  "children",
  "family",
  "health",
  "study",
  "personality",
  "mobility",
] as const;

export type Dimension = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  overall: "综合",
  career: "事业",
  wealth: "财运",
  relationship: "感情",
  children: "子女",
  family: "家庭",
  health: "健康",
  study: "学业",
  personality: "性格",
  mobility: "迁移",
};

export type Resolution = "day" | "month" | "year";

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  day: "日",
  month: "月",
  year: "年",
};

export interface TrendRange {
  start: string;
  end: string;
}

export interface TransitPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
  /** The active ten-year luck pillar, omitted before 起运. */
  luck: string | null;
}

export type DimensionScores = Record<Dimension, number>;

/** Smallest deterministic trend point: one shichen of one civil day. */
export interface SeriesPoint {
  timestamp: string;
  scores: DimensionScores;
  reasons: RuleHit[];
  verdicts: Record<Dimension, DomainVerdict>;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  reasons: RuleHit[];
  intensity: number;
}

export interface TrendSeries {
  resolution: Resolution;
  dimension: Dimension;
  range: TrendRange;
  candles: Candle[];
  underlyingPoints: SeriesPoint[];
}

/** Single public result of the deterministic engine. */
export interface ChartSnapshot {
  algorithmVersion: string;
  snapshotKey: string;
  input: BirthInput;
  civilCandidate: TimeCandidate;
  trueSolarCandidate: TimeCandidate;
  selectedStandard: TimeStandard;
  natal: NatalChart;
  qi: QiState;
  judgment: NatalJudgment;
  relations: RelationEdge[];
  luck: LuckInfo;
  verdicts: Record<Dimension, DomainVerdict>;
  series: TrendSeries;
  boundary: BoundaryNotice | null;
}
