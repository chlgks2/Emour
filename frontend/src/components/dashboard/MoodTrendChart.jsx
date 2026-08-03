import { useId } from "react";
import { MOOD_AXIS } from "../../utils/moodTrendSeries";
import styles from "./MoodTrendChart.module.css";

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
 * 시간대별 감정 변화 꺾은선. **데이터 소스를 모른다.**
 *
 * 지금은 무드트래커 슬롯을 받지만(utils/moodTrendSeries.buildMoodTrendSeries),
 * 대화 감정 기반으로 바꾸려면 호출부에서 series/axis 만 다른 어댑터로 넘기면 된다.
 * 차트 코드는 건드릴 필요가 없다.
 *
 * - 기록이 없는 구간은 어댑터가 점을 만들지 않으므로 자동으로 건너뛰고 다음 점과 이어진다.
 * - 선은 Catmull-Rom 을 3차 베지어로 변환해 부드럽게 그린다.
 *
 * @param {Array} series  utils/moodTrendSeries 참고
 * @param {object} axis   { min, max, minLabel, maxLabel, formatX }
 * @param {string} title
 * @param {boolean} bare  제목·바깥 여백 없이 차트만. 이미 상자 안에 놓을 때 쓴다.
 */
export default function MoodTrendChart({
  series = [],
  axis = MOOD_AXIS,
  title = "시간대별 감정 변화",
  emptyText = "아직 기록된 감정이 없어요.\n기분을 기록하면 하루의 흐름이 그려져요.",
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

  // 여러 시리즈를 한 축에 놓기 위해 X 범위를 공유한다.
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));

  const scaleX = (x) =>
    PADDING.left + (maxX === minX ? PLOT_WIDTH / 2 : ((x - minX) / (maxX - minX)) * PLOT_WIDTH);

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

        <text className={styles.axisLabel} x={PADDING.left} y={VIEW_HEIGHT - 8}>
          {axis.formatX(minX)}
        </text>
        <text
          className={styles.axisLabel}
          x={VIEW_WIDTH - PADDING.right}
          y={VIEW_HEIGHT - 8}
          textAnchor="end"
        >
          {axis.formatX(maxX)}
        </text>
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
  return `시간대별 감정 변화. ${parts.join(". ")}.`;
}
