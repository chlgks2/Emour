import { useId } from "react";
import styles from "./MoodTrendChart.module.css";

/* 축을 안 넘겼을 때의 최소한의 뼈대. 실제 축은 어댑터가 만들어 넘긴다. */
const DEFAULT_AXIS = {
  min: 1,
  max: 5,
  minLabel: "나쁨",
  maxLabel: "좋음",
  formatX: (value) => String(value),
};

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 150;
const PADDING = { top: 14, right: 12, bottom: 26, left: 30 };

const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

const GRID_LINE_COUNT = 5;

/**
 * 차트를 감싸는 껍데기.
 * 단독 섹션으로 놓일 때는 제목과 바깥 여백을 갖고,
 * 이미 상자 안(감정 리포트 패널)에 들어갈 때는 아무것도 두르지 않는다.
 */
function ChartFrame({ bare, titleId, title, children }) {
  if (bare) {
    return <div>{children}</div>;
  }

  return (
    <section className="surface-plain" aria-labelledby={titleId}>
      <header className="section-head">
        <h2 id={titleId} className="section-title">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}

/**
 * 꺾은선 그래프. **데이터 소스를 모른다.**
 *
 * 지금 쓰는 곳은 대시보드의 '기록된 기분 흐름' 하나이고, 재료는 무드트래커다
 * (utils/moodReport.buildMoodReportTrend). 다른 자료로 그리고 싶으면 호출부에서
 * 같은 모양의 series/axis 만 만들어 넘기면 된다. 차트 코드는 건드릴 필요가 없다.
 *
 * - 기록이 없는 구간은 어댑터가 점을 만들지 않으므로 자동으로 건너뛰고 다음 점과 이어진다.
 * - 선은 Catmull-Rom 을 3차 베지어로 변환해 부드럽게 그린다.
 *
 * @param {Array} series [{ key, label, color, dashed?, points: [{x, y, label?}] }]
 * @param {object} axis  { min, max, minLabel, maxLabel, formatX, domain?, ticks? }
 * @param {string} title
 * @param {boolean} bare 제목·바깥 여백 없이 차트만. 이미 상자 안에 놓을 때 쓴다.
 */
export default function MoodTrendChart({
  series = [],
  axis = DEFAULT_AXIS,
  title = "기분 흐름",
  emptyText = "아직 기록된 기분이 없어요.\n기분을 기록하면 하루의 흐름이 그려져요.",
  bare = false,
}) {
  const gradientId = useId();

  const drawable = series.filter((s) => s.points?.length > 0);
  const allPoints = drawable.flatMap((s) => s.points);

  const frameProps = { bare, titleId: `${gradientId}-title`, title };

  if (allPoints.length === 0) {
    return (
      <ChartFrame {...frameProps}>
        <p className={`empty-note ${styles.emptyText}`}>
          {emptyText.split("\n").map((line, i) => (
            <span key={line}>
              {i > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      </ChartFrame>
    );
  }

  /*
   * X 범위.
   *
   * axis.domain 이 있으면 그것이 우선이다. 축의 폭은 데이터가 아니라 기간이
   * 정해야 한다. 주간 그래프는 기록이 이틀치뿐이어도 일요일부터 토요일까지
   * 그대로 있어야 "이 주에 이틀만 기록했다"가 보인다. 데이터 범위로 늘리면
   * 그 이틀이 화면 전체로 벌어져 한 주를 꽉 채운 것처럼 읽힌다.
   *
   * domain 을 주지 않으면 예전처럼 데이터가 놓인 범위만큼만 그린다.
   */
  const dataMinX = Math.min(...allPoints.map((p) => p.x));
  const dataMaxX = Math.max(...allPoints.map((p) => p.x));
  const [minX, maxX] = axis.domain ?? [dataMinX, dataMaxX];

  const scaleX = (x) =>
    PADDING.left + (maxX === minX ? PLOT_WIDTH / 2 : ((x - minX) / (maxX - minX)) * PLOT_WIDTH);

  /*
   * 가로 눈금.
   * 예전에는 양 끝 두 개뿐이라, 하루 그래프에서 '16시' 하나만 덩그러니 남아
   * 가운데 점들이 몇 시인지 셀 수가 없었다. 축을 만든 쪽(utils/moodReport)이
   * 기간에 맞는 눈금을 함께 넘겨주면 그대로 그린다.
   */
  const ticks =
    axis.ticks ??
    [dataMinX, dataMaxX].map((x) => ({ x, label: axis.formatX(x) }));

  const scaleY = (y) =>
    PADDING.top + ((axis.max - y) / (axis.max - axis.min)) * PLOT_HEIGHT;

  const projected = drawable.map((s) => ({
    ...s,
    points: s.points.map((p) => ({ ...p, cx: scaleX(p.x), cy: scaleY(p.y) })),
  }));

  const gridValues = Array.from(
    { length: GRID_LINE_COUNT },
    (_, i) => axis.min + ((axis.max - axis.min) * i) / (GRID_LINE_COUNT - 1)
  );

  // 면(그라데이션)은 첫 번째 시리즈에만 깐다. 둘 다 채우면 서로 가린다.
  const [primary] = projected;

  return (
    <ChartFrame {...frameProps}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={describe(projected, axis)}
      >
        <defs>
          <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primary.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={primary.color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridValues.map((value) => (
          <line
            key={value}
            className={styles.gridLine}
            x1={PADDING.left}
            x2={VIEW_WIDTH - PADDING.right}
            y1={scaleY(value)}
            y2={scaleY(value)}
          />
        ))}

        <text className={styles.axisLabel} x={4} y={scaleY(axis.max) + 4}>
          {axis.maxLabel}
        </text>
        <text className={styles.axisLabel} x={4} y={scaleY(axis.min) + 4}>
          {axis.minLabel}
        </text>

        {primary.points.length > 1 && (
          <path
            d={`${buildSmoothPath(primary.points)} L ${primary.points.at(-1).cx} ${
              PADDING.top + PLOT_HEIGHT
            } L ${primary.points[0].cx} ${PADDING.top + PLOT_HEIGHT} Z`}
            fill={`url(#${gradientId}-area)`}
            stroke="none"
          />
        )}

        {/* 뒤 시리즈부터 그려서 첫 번째(주 시리즈)가 위에 오게 한다 */}
        {[...projected].reverse().map((s) =>
          s.points.length > 1 ? (
            <path
              key={s.key}
              className={styles.line}
              d={buildSmoothPath(s.points)}
              stroke={s.color}
              strokeDasharray={s.dashed ? "4 3" : undefined}
            />
          ) : null
        )}

        {[...projected].reverse().map((s) =>
          s.points.map((p) => (
            <circle
              key={`${s.key}-${p.x}`}
              className={styles.dot}
              cx={p.cx}
              cy={p.cy}
              r={3.2}
              fill={s.color}
            />
          ))
        )}

        {/* 양 끝 눈금만 안쪽으로 당겨 잘리지 않게 한다 */}
        {ticks.map((tick, index) => (
          <text
            key={tick.x}
            className={styles.axisLabel}
            x={scaleX(tick.x)}
            y={VIEW_HEIGHT - 8}
            textAnchor={
              index === 0
                ? "start"
                : index === ticks.length - 1
                  ? "end"
                  : "middle"
            }
          >
            {tick.label}
          </text>
        ))}
      </svg>

      <ul className={styles.legend}>
        {series.map((s) => (
          <li key={s.key} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: s.color }}
              aria-hidden="true"
            />
            {s.label}
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}

/**
 * Catmull-Rom 스플라인을 3차 베지어로 변환해 부드러운 곡선을 만든다.
 * 장력 1/6 이라 점을 그대로 지나면서도 과하게 출렁이지 않는다.
 */
function buildSmoothPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].cx} ${points[0].cy}`;

  let path = `M ${round(points[0].cx)} ${round(points[0].cy)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.cx + (p2.cx - p0.cx) / 6;
    const c1y = p1.cy + (p2.cy - p0.cy) / 6;
    const c2x = p2.cx - (p3.cx - p1.cx) / 6;
    const c2y = p2.cy - (p3.cy - p1.cy) / 6;

    path += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(
      p2.cx
    )} ${round(p2.cy)}`;
  }

  return path;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function describe(series, axis) {
  const parts = series.map((s) =>
    s.points.length === 0
      ? `${s.label} 기록 없음`
      : `${s.label} ${s.points
          .map((p) => `${axis.formatX(p.x)} ${p.label ?? p.y}`)
          .join(", ")}`
  );
  return `기분 흐름. ${parts.join(". ")}.`;
}
