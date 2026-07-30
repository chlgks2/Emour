import {
  mockAlbumPhotos,
  mockCoupleRoom,
  mockDashboard,
  mockTodaySchedules,
} from "./mock/db";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 사귄 날짜(couple_room.dating_start_date)로부터 D+N 계산.
 * daysTogether 는 DB 컬럼이 아니라 프론트 파생값이다.
 * (서버가 계산해서 내려주기로 하면 이 함수는 지우고 응답값을 그대로 쓰면 된다.)
 */
export function calcDaysTogether(datingStartDate, today = new Date()) {
  if (!datingStartDate) return null;
  const start = new Date(`${datingStartDate}T00:00:00`);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 만난 날을 1일로 계산
}

/**
 * 홈 대시보드 데이터 조회
 * 백엔드 연동 시: GET /api/dashboard?summaryDate={YYYY-MM-DD}
 *
 * 응답 구성(테이블별)
 * - room       : couple_room (roomId, datingStartDate, ...)
 * - dashboard  : dashboard 1행 (summaryDate, messageCount, imageCount, reactionCount,
 *                bookmarkCount, averageResponseSeconds, busiestHour,
 *                emotionSummary, emotionFlow, frequentWords)
 * - todaySchedules : couple_schedule (오늘 날짜)
 * - recentPhotos   : album_photo (최근순)
 *
 * 참고: 감정 캘린더(mood)는 moodApi 에서 따로 조회한다.
 */
export async function fetchDashboard() {
  await delay();
  return {
    room: mockCoupleRoom,
    daysTogether: calcDaysTogether(mockCoupleRoom.datingStartDate),
    dashboard: mockDashboard,
    todaySchedules: mockTodaySchedules,
    recentPhotos: mockAlbumPhotos,
  };
}
