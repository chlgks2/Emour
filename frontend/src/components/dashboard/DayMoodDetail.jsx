import { getMoodColor, getMoodLabel } from "../../utils/moodEmotion";
import styles from "./DayMoodDetail.module.css";

/**
 * @param {string} dateLabel 예: "7월 30일"
 * @param {{moodType:string, reason:string}|null} myMood      - 내 mood 레코드
 * @param {{moodType:string, reason:string}|null} partnerMood - 상대방 mood 레코드
 * @param {() => void} onEditMyMood
 */
export default function DayMoodDetail({ dateLabel, myMood, partnerMood, onEditMyMood }) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>{dateLabel}</div>

      <div className={styles.personRow}>
        <PersonMood label="나" mood={myMood} />
        <PersonMood label="상대방" mood={partnerMood} />
      </div>

      <button type="button" className={styles.editBtn} onClick={onEditMyMood}>
        {myMood ? "내 감정 수정" : "내 감정 등록"}
      </button>
    </div>
  );
}

function PersonMood({ label, mood }) {
  return (
    <div className={styles.personCard}>
      <span className={styles.personLabel}>{label}</span>
      {mood ? (
        <>
          <span className={styles.moodBadge} style={{ background: getMoodColor(mood.moodType) }}>
            {getMoodLabel(mood.moodType)}
          </span>
          {mood.reason ? (
            <p className={styles.reasonText}>{mood.reason}</p>
          ) : (
            <p className={styles.reasonTextMuted}>작성한 사유가 없어요</p>
          )}
        </>
      ) : (
        <span className={`empty-note ${styles.emptyText}`}>기록 없음</span>
      )}
    </div>
  );
}
