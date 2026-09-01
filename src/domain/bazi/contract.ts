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
  /** Annotation-only traditional stars attached to this exact pillar. */
  shensha: ShenshaFact[];
}

export interface ShenshaFact {
  code: string;
  label: string;
  /** Natal value that activated the lookup, such as 日干甲 or 月支寅. */
  reference: string;
  /** Matching stem, branch, or pillar value on the annotated column. */
  target: string;
}

export interface AuxiliaryPillarFact {
  name: "胎元" | "胎息" | "命宫" | "身宫";
  ganzhi: string;
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
  annotations: ShenshaFact[];
  /** Auxiliary pillars calculated from the selected natal clock. */
  auxiliaryPillars: AuxiliaryPillarFact[];
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
  /** Exact IANA-resolved bounds consumed by temporal activation. */
  startInstant: string;
  endInstant: string;
  startAgeDetail: { years: number; months: number; days: number };
}

export interface LuckInfo {
  forward: boolean;
  directionLabel: "顺行" | "逆行";
  startDateTime: string;
  startInstant: string;
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

/** The only selectable evidence-chart grains. 时辰 is an atomic point; the rest are OHLC aggregates. */
export const RESOLUTION_KEYS = ["shichen", "day", "month", "year"] as const;
export type Resolution = typeof RESOLUTION_KEYS[number];

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  shichen: "时辰",
  day: "日",
  month: "月",
  year: "年",
};

/** Public scale for every deterministic evidence-chart value. */
export const TREND_INDEX_RANGE = { min: 0, max: 100 } as const;

/** Maximum selectable calendar span at each aggregation grain. */
export const TREND_RANGE_LIMITS: Record<Resolution, { maxDays: number; label: string }> = {
  shichen: { maxDays: 7, label: "时辰视图最多 7 天" },
  day: { maxDays: 62, label: "日视图最多 62 天" },
  month: { maxDays: 732, label: "月视图最多 24 个月" },
  year: { maxDays: 4400, label: "年视图最多 12 年" },
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

/** Full per-dimension shichen evaluation used inside the domain to form public TrendPoint and aggregate candles. */
export interface SeriesPoint {
  timestamp: string;
  /** Exact IANA-resolved instant; preserves the two occurrences in a DST overlap. */
  instant: string;
  transit: TransitPillars;
  scores: DimensionScores;
  reasons: RuleHit[];
  verdicts: Record<Dimension, DomainVerdict>;
}

export interface Candle {
  /** Aggregate periods only. A shichen is represented by TrendPoint, never fabricated as OHLC. */
  kind: "candle";
  /** Stable selection identity: `${resolution}:${timestamp}`. */
  id: string;
  timestamp: string;
  /** Exact endpoint represented by close and by the professional-detail view. */
  closeInstant: string;
  transit: TransitPillars;
  open: number;
  high: number;
  low: number;
  close: number;
  reasons: RuleHit[];
  /** Absolute movement from the preceding displayed period close; first requested period is zero. */
  intensity: number;
}

/** One exact shichen observation for the selected dimension, without an invented OHLC interval. */
export interface TrendPoint {
  kind: "point";
  /** Stable, exact selection identity. The offset-bearing instant distinguishes a DST overlap. */
  id: string;
  /** Civil clock label of this shichen boundary in the selected chart range. */
  timestamp: string;
  /** IANA-resolved, offset-bearing instant used by the deterministic transit calculation. */
  instant: string;
  transit: TransitPillars;
  /** Deterministic selected-dimension index at this one instant. */
  value: number;
  reasons: RuleHit[];
  /** Absolute change from the preceding displayed shichen; the first requested point is zero. */
  intensity: number;
}

export type TrendPeriod = Candle | TrendPoint;

/** A quiet, deterministic chart overlay/pane package; renderers consume it without recomputation. */
export interface TrendIndicators {
  /** Trailing window size used for trendCenter. */
  trendCenterWindow: number;
  /** Trailing mean of each period's close (or atomic value), rounded to the display tenth. */
  trendCenter: number[];
  /** One exact period-change magnitude per period, aligned with TrendSeries.periods. */
  intensity: number[];
}

export interface TrendSeries {
  resolution: Resolution;
  dimension: Dimension;
  range: TrendRange;
  /** The single renderer/selection sequence. It is points at 时辰 and candles at all aggregate grains. */
  periods: TrendPeriod[];
  /** Domain-owned auxiliary data; UI must not derive these arrays. */
  indicators: TrendIndicators;
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
