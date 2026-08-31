export const TEXT = {
  display1:
    "text-display-md sm:text-display-lg lg:text-display-xl font-semibold tracking-[-0.2px] sm:tracking-[-0.28px] lg:tracking-[-0.36px] leading-[1.05]",
  display2:
    "text-display-sm sm:text-display-md lg:text-display-lg font-semibold tracking-[-0.17px] sm:tracking-[-0.2px] lg:tracking-[-0.28px] leading-[1.1]",
  display3:
    "text-title-lg sm:text-display-sm lg:text-display-md font-semibold tracking-[-0.15px] sm:tracking-[-0.17px] lg:tracking-[-0.2px] leading-[1.14]",
  pageTitle: "text-title-md sm:text-title-lg font-semibold tracking-tight leading-[1.2]",
  sectionTitle: "text-title-sm sm:text-title-md font-semibold tracking-tight leading-[1.25]",
  cardTitle: "text-title-sm font-semibold tracking-tight leading-[1.3]",
  panelTitle: "text-body-lg font-semibold leading-[1.35]",
  dialogTitle: "text-title-md font-semibold tracking-tight leading-[1.22]",
  dialogDescription: "text-body-sm leading-relaxed text-bazi-ink-muted",
  bodyLg: "text-body-lg leading-[1.6]",
  body: "text-body leading-[1.65]",
  contentBody: "text-body leading-[1.65]",
  bodySm: "text-body-sm leading-[1.55]",
  meta: "text-meta leading-[1.45] text-bazi-ink-muted",
  label: "text-caption font-medium",
  caption: "text-caption leading-[1.45] text-bazi-ink-muted",
  overline: "text-mini font-semibold uppercase tracking-[0.18em] text-bazi-ink-muted/72",
  micro: "text-micro font-medium tracking-[0.04em] text-bazi-ink-muted/72",
  kpiValueLg: "text-metric-lg font-semibold tracking-tight leading-none tabular-nums",
  kpiValueMd: "text-metric-md font-semibold tracking-tight leading-none tabular-nums",
  kpiLabel: "text-meta font-medium tracking-[0.12em] text-bazi-ink-muted/72",
  tableHeader: "text-caption font-medium text-bazi-ink-muted",
  tableCell: "text-body-sm tabular-nums",
  codeInline: "text-body-sm font-mono",
  codeBlock: "text-body-sm font-mono leading-relaxed",
} as const;

export type TextToken = keyof typeof TEXT;

export const TEXT_SHOWCASE = {
  displayHero:
    "text-display-md sm:text-display-lg lg:text-display-xl font-bold tracking-[-0.2px] sm:tracking-[-0.28px] lg:tracking-[-0.36px] leading-[1.1]",
  displayPage:
    "text-display-sm sm:text-display-md lg:text-display-lg font-bold tracking-[-0.17px] sm:tracking-[-0.2px] lg:tracking-[-0.28px] leading-[1.08]",
  displaySection:
    "text-title-md sm:text-title-lg lg:text-display-sm font-bold tracking-[-0.12px] sm:tracking-[-0.15px] lg:tracking-[-0.17px] leading-[1.14]",
  cardTitle: "text-title-sm sm:text-title-md font-bold tracking-tight leading-[1.2]",
  eyebrow: "text-caption font-bold uppercase tracking-[0.24em]",
  body: TEXT.body,
  bodySm: TEXT.bodySm,
  metricLg: "text-metric-lg font-extrabold tracking-tight leading-none tabular-nums",
  metricMd: "text-metric-md sm:text-metric-lg font-extrabold tracking-tight leading-none tabular-nums",
} as const;

export type ShowcaseTextToken = keyof typeof TEXT_SHOWCASE;

export const TEXT_RICH = {
  container: [
    "text-body leading-[1.65] break-words",
    "[&_h1]:text-title-md [&_h1]:sm:text-title-lg [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:leading-[1.22]",
    "[&_h2]:text-title-sm [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:leading-[1.3]",
    "[&_h3]:text-body-lg [&_h3]:font-semibold [&_h3]:leading-[1.35]",
    "[&_h4]:text-body-lg [&_h4]:font-medium [&_h4]:leading-[1.35]",
    "[&_p]:text-body [&_p]:leading-[1.65]",
    "[&_li]:text-body [&_li]:leading-[1.65]",
    "[&_code]:text-body-sm [&_code]:font-mono",
    "[&_pre_code]:text-body-sm [&_pre_code]:font-mono [&_pre_code]:leading-relaxed",
    "[&_th]:text-caption [&_th]:font-medium [&_th]:text-bazi-ink-muted",
    "[&_td]:text-body-sm [&_td]:tabular-nums",
  ].join(" "),
  compactSpacing: [
    "[&_p]:mb-1 [&_p]:last:mb-0",
    "[&_ul]:my-1 [&_ul]:space-y-0.5",
    "[&_ol]:my-1 [&_ol]:space-y-0.5",
  ].join(" "),
  defaultSpacing: [
    "[&_p]:mb-3 [&_p]:last:mb-0",
    "[&_ul]:my-3 [&_ul]:space-y-1.5",
    "[&_ol]:my-3 [&_ol]:space-y-1.5",
  ].join(" "),
} as const;

export type RichTextToken = keyof typeof TEXT_RICH;
