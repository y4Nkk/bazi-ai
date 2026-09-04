import { ELEMENTS, type Element } from "@/domain/bazi/constants";
import { TEXT } from "@/lib/typography";
import { ELEMENT_TEXT } from "./bazi-presentation";

const VIEWBOX_SIZE = 320;
const CENTER = VIEWBOX_SIZE / 2;
const OUTER_RADIUS = 96;
const LABEL_RADIUS = 130;
const RING_RATIOS = [0.25, 0.5, 0.75, 1];

function pointAt(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / ELEMENTS.length;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function pointList(radiusFor: (index: number) => number): string {
  return ELEMENTS.map((_, index) => {
    const point = pointAt(index, radiusFor(index));
    return `${point.x},${point.y}`;
  }).join(" ");
}

/** Renders existing natal element counts without deriving any BaZi facts. */
export function FiveElementRadar({ counts }: { counts: Record<Element, number> }) {
  const total = ELEMENTS.reduce((sum, element) => sum + counts[element], 0);
  const description = ELEMENTS.map((element) => `${element}${counts[element]}`).join("，");
  const dataPolygon = pointList((index) => total === 0 ? 0 : (counts[ELEMENTS[index]] / total) * OUTER_RADIUS);

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        className="w-full max-w-sm overflow-visible"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        role="img"
        aria-labelledby="five-element-radar-title five-element-radar-description"
      >
        <title id="five-element-radar-title">五行分布雷达图</title>
        <desc id="five-element-radar-description">{description}</desc>
        <g aria-hidden="true" className="fill-none stroke-bazi-border-soft">
          {RING_RATIOS.map((ratio) => (
            <polygon key={ratio} points={pointList(() => OUTER_RADIUS * ratio)} strokeWidth="1" />
          ))}
          {ELEMENTS.map((element, index) => {
            const point = pointAt(index, OUTER_RADIUS);
            return <line key={element} x1={CENTER} y1={CENTER} x2={point.x} y2={point.y} strokeWidth="1" />;
          })}
        </g>
        <polygon
          points={dataPolygon}
          className="fill-bazi-surface-tinted stroke-bazi-primary"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {ELEMENTS.map((element, index) => {
          const count = counts[element];
          const marker = pointAt(index, total === 0 ? 0 : (count / total) * OUTER_RADIUS);
          const label = pointAt(index, LABEL_RADIUS);
          const top = index === 0;
          const bottom = index === 2 || index === 3;
          return (
            <g key={element} className={ELEMENT_TEXT[element]}>
              <circle cx={marker.x} cy={marker.y} r="4" fill="currentColor" />
              <text
                x={label.x}
                y={label.y}
                fill="currentColor"
                textAnchor="middle"
                dominantBaseline={top ? "auto" : bottom ? "hanging" : "middle"}
                className={`${TEXT.tableCell} font-medium`}
              >
                {element} {count}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className={TEXT.caption}>四柱天干与地支本气，共 {total} 位。</figcaption>
    </figure>
  );
}
