import { buildEmotionReport } from "../../../utils/emotions";
import styles from "./EmotionReport.module.css";

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
}) {
  const report = segments ?? buildEmotionReport(emotionSummary);

  if (report.length === 0) {
    return (
      <p className={`empty-note ${styles.emptyText}`}>
        {emptyText.split("\n").map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
    );
  }

  // 도넛(conic-gradient)용 구간 문자열: 앞 항목들의 ratio 누적값을 시작점으로 사용
  const stops = report
    .map((item, i) => {
      const start = report.slice(0, i).reduce((sum, prev) => sum + prev.ratio, 0);
      return `${item.color} ${start}% ${start + item.ratio}%`;
    })
    .join(", ");

  return (
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
  );
}
