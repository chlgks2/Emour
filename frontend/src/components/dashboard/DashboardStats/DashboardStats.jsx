import { useState } from "react";
import EmotionReport from "../EmotionReport/EmotionReport";
import HelpHint from "../../common/HelpHint/HelpHint";
import { useAuth } from "../../../hooks/useAuth";
import styles from "./DashboardStats.module.css";

// 카드가 길어지지 않도록 상위 5개만 노출한다.
const FREQUENT_WORD_DISPLAY_COUNT = 5;

/**
 * 대화 기록 카드. **커플 합산** 기준이다.
 *   메시지 / 사진 / 가장 활발했던 시간 / 평균 답장 시간 / 자주 쓴 말 : 두 사람 합산
 *   사진 / 공감 : 커플방에서 두 사람이 주고받은 합산 개수
 *   채팅 감정 도넛 : 로그인 사용자와 상대방을 각각 집계
 *
 * 위쪽 무드트래커 리포트는 반대로 나/상대를 갈라 그린다. 그쪽은 각자 자기 기분을
 * 고른 기록이라 합치면 뜻이 사라진다. (utils/moodReport 주석 참고)
 *
 * 시간대별 꺾은선은 두지 않는다. '언제'를 시간 축에 놓고 보는 일은 위
 * 무드트래커 리포트의 기분 흐름이 이미 하고 있고, 여기서는 이 기간의 대화가
 * 어떤 감정이었는지(비율)와 얼마나 오갔는지(개수)만 본다.
 *
 * @param {object} dashboard - dashboardApi.fetchDashboard().dashboard
 * @param {import('react').ReactNode} periodControl 제목 아래에 놓을 기간 선택 UI
 */
export default function DashboardStats({
  dashboard,
  title = "오늘의 대화 기록",
  emotionLabel = "오늘의 채팅 감정 분포 비율",
  periodControl = null,
}) {
  const { user } = useAuth();
  const emotionFilterStorageKey = `dashboardEmotionFilter:${user?.userId ?? "guest"}`;
  const [excludedEmotionCodes, setExcludedEmotionCodes] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(emotionFilterStorageKey) ?? "[]"));
    } catch {
      return new Set();
    }
  });

  if (!dashboard) return null;

  const {
    messageCount = 0,
    imageCount = 0,
    reactionCount = 0,
    busiestHour,
    averageResponseSeconds,
    frequentWords = [],
    emotionSummary = [],
    myEmotionSummary = emotionSummary,
    partnerEmotionSummary = [],
  } = dashboard;

  /*
   * 아이콘은 더 이상 붙이지 않는다. 항목마다 아이콘을 달면 장식이 수치를 이기고,
   * 같은 크기 아이콘이 반복되면서 화면이 산만해진다. 위계는 셀 크기로 만든다.
   */
  const counts = [
    { key: "message", label: "메시지", value: messageCount },
    { key: "image", label: "사진", value: imageCount },
    { key: "reaction", label: "공감", value: reactionCount },
  ];

  /*
   * 두 칸은 값이 없어도 자리를 지킨다.
   * 예전에는 null 이면 통째로 감췄는데, 서버 집계가 아직 안 돌았을 뿐인 상황과
   * "그런 항목이 없는" 상황이 구분되지 않아 사라진 것처럼 보였다.
   */
  const highlights = [
    {
      key: "busiest",
      label: "가장 활발했던 시간",
      value: busiestHour != null ? formatHourRange(busiestHour) : null,
    },
    {
      key: "response",
      label: "평균 답장 시간",
      value:
        averageResponseSeconds != null
          ? formatResponseTime(averageResponseSeconds)
          : null,
    },
  ];

  const updateExcludedEmotionCodes = (next) => {
    localStorage.setItem(emotionFilterStorageKey, JSON.stringify([...next]));
    setExcludedEmotionCodes(next);
  };

  return (
    <section className="surface-plain" aria-labelledby="dashboard-stats-title">
      <header className="section-head section-head-inline">
        <h2 id="dashboard-stats-title" className="section-title">
          {title}
        </h2>

        {/*
          집계 기준은 제목 옆 물음표에 숨긴다.
          한 번 알면 되는 규칙이라 늘 펼쳐 두면 수치보다 각주가 길어진다.
        */}
        <HelpHint label="대화 기록 리포트 집계 기준">
          하루는 한국 시간 0시부터 24시까지를 기준으로 모아요.
        </HelpHint>
      </header>

      {periodControl}

      {/*
        메시지·사진·공감은 같은 성격의 "개수"라서 한 행에 나란히 둔다.
        칸 수에 맞춰 열이 늘어나므로 월/연간(메시지 하나)에서도 빈칸이 남지 않는다.
      */}
      <ul
        className={styles.countRow}
        style={{ "--count-columns": counts.length }}
      >
        {counts.map(({ key, label, value }) => (
          <li key={key} className={styles.countCell}>
            <span className={styles.cellLabel}>{label}</span>
            <span className={styles.countValue}>
              {(Number(value) || 0).toLocaleString("ko-KR")}
            </span>
          </li>
        ))}
      </ul>

      {/*
        나눈 대화가 어떤 감정이었는지.
        개수(무엇을 얼마나 주고받았나) 다음, 흐름(언제·얼마나 빨리) 앞에 둔다.
        면은 흰색으로 두고 옅은 로즈 헤어라인만 둘러, 위의 로즈 개수 행과
        아래 회색 벤토 셀 사이에서 따로 놀지 않게 한다.

        비율(도넛)과 시간대별 흐름(꺾은선)을 같은 상자에 담는다. 둘 다 같은
        대화를 재료로 삼고, 하나는 '무엇이 얼마나'를 다른 하나는 '언제'를 말한다.
      */}
      <section className={styles.emotionPanel} aria-labelledby="dashboard-emotion-mix">
        <p id="dashboard-emotion-mix" className="panel-title">
          {emotionLabel}
          <span>어떤 감정이 얼마나 오갔는지 모아봤어요</span>
        </p>

        <div className={styles.commonEmotionFilter}>
          <EmotionReport
            emotionSummary={[...myEmotionSummary, ...partnerEmotionSummary]}
            excludedEmotionCodes={excludedEmotionCodes}
            onExcludedEmotionCodesChange={updateExcludedEmotionCodes}
            filterOnly
          />
        </div>

        <div className={styles.emotionSide}>
          <p className={styles.emotionSideLabel}>나</p>
          <EmotionReport
            emotionSummary={myEmotionSummary}
            excludedEmotionCodes={excludedEmotionCodes}
            showFilter={false}
            emptyText="이 기간에 분석된 내 대화가 아직 없어요."
          />
        </div>

        <div className={styles.emotionSide}>
          <p className={styles.emotionSideLabel}>상대방</p>
          <EmotionReport
            emotionSummary={partnerEmotionSummary}
            excludedEmotionCodes={excludedEmotionCodes}
            showFilter={false}
            emptyText="이 기간에 분석된 상대방 대화가 아직 없어요."
          />
        </div>
      </section>


      <div className={`bento ${styles.detailGrid}`}>
        {highlights.map(({ key, label, value }) => (
          <div key={key} className="bento-cell">
            <p className={styles.cellLabel}>{label}</p>
            <p className={value ? styles.cellText : `empty-note ${styles.cellTextEmpty}`}>
              {value ?? "아직 없어요"}
            </p>
          </div>
        ))}

        {frequentWords.length > 0 && (
          <div className="bento-cell bento-wide">
            <p className={styles.cellLabel}>자주 쓴 말</p>
            <ul className={styles.wordRow}>
              {frequentWords.slice(0, FREQUENT_WORD_DISPLAY_COUNT).map(({ word, count }) => (
                <li key={word} className={styles.wordChip}>
                  {word}
                  <span className={styles.wordCount}>
                    {Number(count).toLocaleString("ko-KR")}회
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// busiest_hour(0~23) -> "오후 2시~오후 3시"
function formatHourRange(hour) {
  return `${formatHourLabel(hour)}~${formatHourLabel(
    (hour + 1) % 24,
  )}`;
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
