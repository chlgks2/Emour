import { buildEmotionReport } from "../../utils/emotions";
import styles from "./EmotionReport.module.css";

/**
 * 감정 리포트 본문(도넛 + 범례).
 *
 * 제목과 기간 선택은 이 컴포넌트를 감싸는 섹션(DashboardPage)이 갖는다.
 * 기간을 바꾸는 조작과 그 결과가 한 상자 안에 있어야 무엇의 기간인지 분명해진다.
 *
 * @param {Array|Record<string, number>} emotionSummary
 *   GET /dashboards/main-emotions 의 emotions 배열 [{ emotionType, label, count }]
 *   또는 레거시 JSON 맵 { "JOY": 3, "NEUTRAL": 5 }.
 *   개수(count)로 내려오므로 비율/색상은 buildEmotionReport 에서 계산한다.
 */
export default function EmotionReport({ emotionSummary }) {
  const report = buildEmotionReport(emotionSummary);

  if (report.length === 0) {
    return (
      <p className={`empty-note ${styles.emptyText}`}>
        아직 분석된 대화가 없어요.
        <br />
        대화를 나누면 감정이 채워져요.
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
          <li key={item.emotionCode} className={styles.legendItem}>
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
