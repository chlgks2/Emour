import { ChartColumn, MessageSquare, Image, Bookmark, Clock, Timer } from "lucide-react";
import styles from "./DashboardStats.module.css";

// 카드가 길어지지 않도록 상위 5개만 노출한다.
const FREQUENT_WORD_DISPLAY_COUNT = 5;

/**
 * 오늘의 대화 기록 카드. **커플 합산** 기준이다.
 *   메시지 / 사진 / 가장 활발했던 시간 / 평균 답장 시간 / 자주 쓴 말 : 두 사람 합산
 *   북마크 : 내 개수만. 북마크는 백엔드에서 roomId+userId 로 묶여 있어
 *            커플 합산이 불가능하므로 라벨도 '내 북마크' 로 구분한다.
 *   (reaction_count 는 화면에 노출하지 않는다)
 *
 * @param {object} dashboard - dashboardApi.fetchDashboard().dashboard
 */
export default function DashboardStats({ dashboard }) {
  if (!dashboard) return null;

  const {
    messageCount = 0,
    imageCount = 0,
    bookmarkCount = 0,
    busiestHour,
    averageResponseSeconds,
    frequentWords = [],
  } = dashboard;

  const counts = [
    { key: "message", label: "메시지", value: messageCount, Icon: MessageSquare },
    { key: "image", label: "사진", value: imageCount, Icon: Image },
    { key: "bookmark", label: "내 북마크", value: bookmarkCount, Icon: Bookmark },
  ];

  const highlights = [
    busiestHour != null && {
      key: "busiest",
      Icon: Clock,
      label: "가장 활발했던 시간",
      value: formatHourRange(busiestHour),
    },
    averageResponseSeconds != null && {
      key: "response",
      Icon: Timer,
      label: "평균 답장 시간",
      value: formatResponseTime(averageResponseSeconds),
    },
  ].filter(Boolean);

  return (
    <section className={styles.card} aria-labelledby="dashboard-stats-title">
      <p id="dashboard-stats-title" className={styles.title}>
        <ChartColumn size={14} aria-hidden="true" />
        오늘의 대화 기록
      </p>

      <ul className={styles.countRow}>
        {counts.map(({ key, label, value, Icon }) => (
          <li key={key} className={styles.countItem}>
            <span className={styles.countIcon} aria-hidden="true">
              <Icon size={15} />
            </span>
            <span className={styles.countValue}>{value.toLocaleString("ko-KR")}</span>
            <span className={styles.countLabel}>{label}</span>
          </li>
        ))}
      </ul>

      {highlights.length > 0 && (
        <ul className={styles.highlightList}>
          {highlights.map(({ key, Icon, label, value }) => (
            <li key={key} className={styles.highlightItem}>
              <Icon size={13} aria-hidden="true" />
              <span className={styles.highlightLabel}>{label}</span>
              <span className={styles.highlightValue}>{value}</span>
            </li>
          ))}
        </ul>
      )}

      {frequentWords.length > 0 && (
        <div className={styles.wordSection}>
          <p className={styles.wordTitle}>자주 쓴 말</p>
          <ul className={styles.wordRow}>
            {frequentWords.slice(0, FREQUENT_WORD_DISPLAY_COUNT).map(({ word, count }) => (
              <li key={word} className={styles.wordChip}>
                {word}
                <span className={styles.wordCount}>{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// busiest_hour(0~23) -> "밤 10시~11시"
function formatHourRange(hour) {
  return `${formatHourLabel(hour)}~${(hour + 1) % 24}시`;
}

function formatHourLabel(hour) {
  const period = hour < 6 ? "새벽" : hour < 12 ? "오전" : hour < 18 ? "오후" : "밤";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${display}시`;
}

// average_response_seconds(DECIMAL) -> "3분 5초" / "1시간 2분"
function formatResponseTime(seconds) {
  const total = Math.round(Number(seconds));
  if (!Number.isFinite(total) || total < 0) return "-";
  if (total < 60) return `${total}초`;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;

  const restSeconds = total % 60;
  return restSeconds > 0 ? `${minutes}분 ${restSeconds}초` : `${minutes}분`;
}
