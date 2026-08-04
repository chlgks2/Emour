import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { buildEmotionReport, EMOTION_TYPES } from "../../../utils/emotions";
import styles from "./EmotionReport.module.css";

function recalculateRatios(items) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (!total) return [];

  const recalculated = items.map((item) => ({
    ...item,
    ratio: Math.round((item.count / total) * 100),
  }));
  const difference = 100 - recalculated.reduce((sum, item) => sum + item.ratio, 0);
  if (difference) recalculated[0].ratio += difference;
  return recalculated;
}

/**
 * 도넛 + 범례.
 *
 * 제목과 기간 선택은 이 컴포넌트를 감싸는 섹션(DashboardPage)이 갖는다.
 * 기간을 바꾸는 조작과 그 결과가 한 상자 안에 있어야 무엇의 기간인지 분명해진다.
 *
 * 두 가지 재료를 받는다. 어느 쪽이든 그리는 방법은 같아서 컴포넌트를 나누지 않았다.
 *   · emotionSummary — 채팅 감정 집계 (GET /dashboards/main-emotions). 여기서 비율을 계산한다.
 *   · segments       — 이미 비율까지 계산된 구간 배열 (utils/moodReport 의 기분 분포)
 *
 * @param {Array|Record<string, number>} emotionSummary
 *   [{ emotionType, label, count }] 또는 레거시 JSON 맵 { "JOY": 3 }
 * @param {Array<{key, label, ratio, color}>} segments emotionSummary 대신 넘기는 완성된 구간
 * @param {string} emptyText 그릴 것이 없을 때의 안내. 줄바꿈은 '\n'
 */
export default function EmotionReport({
  emotionSummary,
  segments,
  emptyText = "아직 분석된 대화가 없어요.\n대화를 나누면 감정이 채워져요.",
  excludedEmotionCodes,
  onExcludedEmotionCodesChange,
  showFilter = true,
  filterOnly = false,
}) {
  const { user } = useAuth();
  const filterEnabled = !segments;
  const storageKey = `dashboardEmotionFilter:${user?.userId ?? "guest"}`;
  const [excludedEmotions, setExcludedEmotions] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const activeExcludedEmotions = excludedEmotionCodes ?? excludedEmotions;
  const fullReport = [...(segments ?? buildEmotionReport(emotionSummary))]
    .sort((first, second) => second.ratio - first.ratio);
  const report = filterEnabled
    ? recalculateRatios(
        fullReport.filter((item) => !activeExcludedEmotions.has(item.emotionCode)),
      ).sort((first, second) => second.ratio - first.ratio)
    : fullReport;

  const toggleEmotion = (emotionCode) => {
    const next = new Set(activeExcludedEmotions);
    if (next.has(emotionCode)) next.delete(emotionCode);
    else next.add(emotionCode);

    if (onExcludedEmotionCodesChange) {
      onExcludedEmotionCodesChange(next);
    } else {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      setExcludedEmotions(next);
    }
  };

  // 도넛(conic-gradient)용 구간 문자열: 앞 항목들의 ratio 누적값을 시작점으로 사용
  const stops = report
    .map((item, i) => {
      const start = report.slice(0, i).reduce((sum, prev) => sum + prev.ratio, 0);
      return `${item.color} ${start}% ${start + item.ratio}%`;
    })
    .join(", ");

  return (
    <div className={styles.reportWrapper}>
      {filterEnabled && showFilter && (
        <details className={styles.filterPanel}>
          <summary>
            <SlidersHorizontal size={14} aria-hidden="true" />
            집계할 감정 선택
          </summary>
          <div className={styles.filterOptions}>
            {EMOTION_TYPES.map((emotion) => {
              const included = !activeExcludedEmotions.has(emotion.code);
              return (
                <button
                  key={emotion.code}
                  type="button"
                  role="switch"
                  aria-checked={included}
                  className={`${styles.filterChip} ${included ? styles.filterChipActive : ""}`}
                  style={{ "--filter-emotion-color": emotion.color }}
                  onClick={() => toggleEmotion(emotion.code)}
                >
                  <emotion.Icon size={13} aria-hidden="true" />
                  {emotion.label}
                </button>
              );
            })}
          </div>
        </details>
      )}

      {filterOnly ? null : report.length === 0 ? (
        <p className={`empty-note ${styles.emptyText}`}>
          {(fullReport.length > 0 ? "집계할 감정을 하나 이상 선택해주세요." : emptyText)
            .split("\n")
            .map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
        </p>
      ) : (
        <div className={styles.body}>
          <div
            className={styles.donut}
            style={{ background: `conic-gradient(${stops})` }}
            role="img"
            aria-label={report.map((item) => `${item.label} ${item.ratio}%`).join(", ")}
          >
            <div className={styles.donutHole} />
          </div>
          <ul className={styles.legend}>
            {report.map((item) => (
              <li key={item.emotionCode ?? item.key} className={styles.legendItem}>
                <span
                  className={styles.dot}
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                {item.label} {item.ratio}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
