import { ChartPie } from "lucide-react";
import { buildEmotionReport } from "../../utils/emotions";
import styles from "./EmotionReport.module.css";

/**
 * @param {Array|Record<string, number>} emotionSummary
 *   GET /dashboards/main-emotions 의 emotions 배열 [{ emotionType, label, count }]
 *   또는 레거시 JSON 맵 { "JOY": 3, "NEUTRAL": 5 }.
 *   개수(count)로 내려오므로 비율/색상은 buildEmotionReport 에서 계산한다.
 */
export default function EmotionReport({ emotionSummary, title = "오늘의 감정 리포트" }) {
  const report = buildEmotionReport(emotionSummary);

  if (report.length === 0) {
    return (
      <section className={styles.card} aria-labelledby="emotion-report-title">
        <p id="emotion-report-title" className={styles.title}>
          <ChartPie size={14} aria-hidden="true" />
          {title}
        </p>
        <p className={styles.emptyText}>
          아직 분석된 대화가 없어요.
          <br />
          대화를 나누면 감정이 채워져요.
        </p>
      </section>
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
    <section className={styles.card} aria-labelledby="emotion-report-title">
      <p id="emotion-report-title" className={styles.title}>
        <ChartPie size={14} aria-hidden="true" />
        {title}
      </p>
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
    </section>
  );
}
