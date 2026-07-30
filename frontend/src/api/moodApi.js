import { formatDateKey, addDays, parseDateKey } from "../utils/moodEmotion";
import { MOOD_TYPE } from "../constants/enums";
import { MOCK_ROOM_ID, MY_USER_ID, PARTNER_USER_ID } from "./mock/db";

// TODO: 실제 백엔드가 준비되면 이 파일의 함수 내부만 fetch 호출로 교체하면 됩니다.
// 반환 형태(Promise<{ myMood, partnerMood }> 등)는 그대로 유지해주세요.
//
// mood 테이블 기준 필드명:
//   { moodId, roomId, userId, moodDate, moodType, reason, createdAt, updatedAt }
//
// ⚠️ 확인 필요: 감정 등록 화면의 "사유"(reason)에 해당하는 컬럼이 ERD의 mood 테이블에 없습니다.
//    (diary.content 와는 별개로 mood 마다 한 줄 사유를 남기는 UI가 이미 있습니다.)
//    mood 테이블에 reason 컬럼을 추가할지, diary 로 대체할지 백엔드와 확정이 필요합니다.
//    일단 프론트는 reason 을 그대로 유지하고, 서버에 없으면 빈 값으로 동작합니다.

const STORAGE = new Map(); // moodDate -> { myMood: {...} | null, partnerMood: {...} | null }
let seeded = false;
let moodIdSeq = 1;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMoodRecord({ userId, moodDate, moodType, reason }) {
  const now = new Date().toISOString();
  return {
    moodId: moodIdSeq++,
    roomId: MOCK_ROOM_ID,
    userId,
    moodDate,
    moodType,
    reason: reason ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

function seedIfNeeded() {
  if (seeded) return;
  seeded = true;
  const today = new Date();
  const sample = [
    {
      offset: 0,
      myMood: { moodType: MOOD_TYPE.HAPPY, reason: "오늘 날씨가 좋아서 산책했어요" },
      partnerMood: { moodType: MOOD_TYPE.NEUTRAL, reason: "그냥 그런 하루였어요" },
    },
    {
      offset: -1,
      myMood: { moodType: MOOD_TYPE.VERY_HAPPY, reason: "데이트가 즐거웠어요" },
      partnerMood: { moodType: MOOD_TYPE.VERY_HAPPY, reason: "같이 있어서 행복했어요" },
    },
    {
      offset: -2,
      myMood: null,
      partnerMood: { moodType: MOOD_TYPE.SAD, reason: "야근으로 힘들었어요" },
    },
    {
      offset: -3,
      myMood: { moodType: MOOD_TYPE.SAD, reason: "일이 잘 안 풀렸어요" },
      partnerMood: null,
    },
  ];
  sample.forEach(({ offset, myMood, partnerMood }) => {
    const moodDate = formatDateKey(addDays(today, offset));
    STORAGE.set(moodDate, {
      myMood: myMood && buildMoodRecord({ userId: MY_USER_ID, moodDate, ...myMood }),
      partnerMood:
        partnerMood && buildMoodRecord({ userId: PARTNER_USER_ID, moodDate, ...partnerMood }),
    });
  });
}

/**
 * 특정 연/월(0-indexed month)에 해당하는 기록을 조회
 * 백엔드 연동 시: GET /api/moods?year={year}&month={month}
 * 응답: { "2026-07-30": { myMood, partnerMood }, ... }
 */
export async function fetchMoodRecordsForMonth(year, month) {
  seedIfNeeded();
  await delay(150);
  const result = {};
  for (const [moodDate, record] of STORAGE.entries()) {
    const d = parseDateKey(moodDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      result[moodDate] = record;
    }
  }
  return result;
}

/**
 * 내 감정 등록/수정
 * @param {string} moodDate - 'YYYY-MM-DD' (mood.mood_date)
 * @param {{ moodType: string, reason: string }} payload
 * 백엔드 연동 시: PUT /api/moods/{moodDate}  { moodType, reason }
 *   (mood 테이블에 UNIQUE(room_id, user_id, mood_date) 가 있으므로 upsert 로 처리)
 */
export async function saveMyMood(moodDate, { moodType, reason }) {
  await delay(150);
  const existing = STORAGE.get(moodDate) || { myMood: null, partnerMood: null };
  const updated = {
    ...existing,
    myMood: existing.myMood
      ? { ...existing.myMood, moodType, reason: reason ?? "", updatedAt: new Date().toISOString() }
      : buildMoodRecord({ userId: MY_USER_ID, moodDate, moodType, reason }),
  };
  STORAGE.set(moodDate, updated);
  return { moodDate, record: updated };
}

/**
 * 내 감정 삭제
 * 백엔드 연동 시: DELETE /api/moods/{moodDate}
 */
export async function deleteMyMood(moodDate) {
  await delay(150);
  const existing = STORAGE.get(moodDate);
  if (!existing) return { moodDate, record: { myMood: null, partnerMood: null } };
  const updated = { ...existing, myMood: null };
  STORAGE.set(moodDate, updated);
  return { moodDate, record: updated };
}
