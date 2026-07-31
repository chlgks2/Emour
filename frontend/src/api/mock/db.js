// 개발 단계에서 백엔드 없이 화면을 동작시키기 위한 mock 데이터베이스.
// localStorage에 저장해서 새로고침해도 회원가입/로그인 상태가 유지되도록 한다.
//
// 모든 필드명은 백엔드 ERD(DOCS/Emour_SQL_schema.sql) 컬럼명의 camelCase 형태를 따른다.
// (예: user_id -> userId, sent_at -> sentAt) 실제 연동 시 mock 함수 본문만 fetch 로 교체하면
// 컴포넌트는 그대로 동작해야 한다.

import { ANALYSIS_STATUS, MESSAGE_TYPE, ROOM_STATUS, SCHEDULE_TYPE, USER_STATUS } from "../../constants/enums";

const USERS_KEY = "emour_mock_users";
const SESSION_KEY = "emour_mock_session";

// 목업용 고정 식별자 (실제로는 로그인 응답/방 조회 응답에서 내려온다)
export const MY_USER_ID = 1;
export const PARTNER_USER_ID = 2;
export const MOCK_ROOM_ID = 1;

function readUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (raw) return JSON.parse(raw);
  // 데모용 기본 계정 (user 테이블 컬럼 기준)
  const seed = [
    {
      userId: MY_USER_ID,
      email: "demo@emour.app",
      password: "demo1234", // 서버에서는 password_hash 로 저장됨
      nickname: "민희",
      birth: null,
      profileImageUrl: null,
      statusMessage: null,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
      // couple_member 소속 정보 (실제로는 별도 조회 응답)
      roomId: MOCK_ROOM_ID,
      partnerNickname: "윤지",
    },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(seed));
  return seed;
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export const mockUserDB = {
  findByEmail(email) {
    return readUsers().find((u) => u.email === email);
  },
  create(user) {
    const users = readUsers();
    users.push(user);
    writeUsers(users);
    return user;
  },
  nextUserId() {
    return readUsers().reduce((max, u) => Math.max(max, u.userId ?? 0), 0) + 1;
  },
};

export const mockSession = {
  set(user) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        userId: user.userId,
        email: user.email,
        nickname: user.nickname,
        profileImageUrl: user.profileImageUrl ?? null,
        statusMessage: user.statusMessage ?? null,
        roomId: user.roomId ?? null,
        partnerNickname: user.partnerNickname ?? null,
      })
    );
  },
  get() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
  },
};

// ===== couple_room =====
export const mockCoupleRoom = {
  roomId: MOCK_ROOM_ID,
  roomCode: "EMOUR1234",
  roomCodeExpiresAt: null,
  datingStartDate: "2026-01-19",
  status: ROOM_STATUS.ACTIVE,
};

// ===== couple_schedule (오늘 일정) =====
// ⚠️ 기존 목업의 `done`(완료 여부)에 해당하는 컬럼이 ERD에 없어서 제거했다.
//    화면의 흐린 처리는 scheduleTime 이 현재 시각보다 지났는지로 파생 계산한다.
export const mockTodaySchedules = [
  {
    scheduleId: 1,
    roomId: MOCK_ROOM_ID,
    creatorId: MY_USER_ID,
    name: "데이트",
    description: null,
    scheduleDate: "2026-07-30",
    scheduleTime: "13:00",
    scheduleType: SCHEDULE_TYPE.SCHEDULE,
    yearlyRecurring: false,
  },
  {
    scheduleId: 2,
    roomId: MOCK_ROOM_ID,
    creatorId: PARTNER_USER_ID,
    name: "가족 식사",
    description: null,
    scheduleDate: "2026-07-30",
    scheduleTime: "20:00",
    scheduleType: SCHEDULE_TYPE.SCHEDULE,
    yearlyRecurring: false,
  },
];

// ===== album_photo (최근 사진) =====
export const mockAlbumPhotos = [
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&q=80",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80",
  "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80",
  "https://images.unsplash.com/photo-1504198458649-3128b932f49e?w=600&q=80",
  "https://images.unsplash.com/photo-1465146633011-14f8e0781093?w=600&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80",
  "https://images.unsplash.com/photo-1513279922550-250c2129b13a?w=600&q=80",
].map((imageUrl, i) => ({
  photoId: i + 1,
  roomId: MOCK_ROOM_ID,
  uploaderId: i % 2 === 0 ? MY_USER_ID : PARTNER_USER_ID,
  imageUrl,
  memo: null,
  createdAt: `2026-07-${String(22 + (i % 8)).padStart(2, "0")}T12:00:00`,
}));

// ===== dashboard (일별 집계 1행) =====
// emotionSummary / emotionFlow / frequentWords 는 JSON 컬럼이라 아래 형태를 그대로 가정한다.
// ⚠️ emotionFlow("2시간 단위 감정 흐름")는 ERD에 예시 JSON이 없어 아래 구조를 임시로 가정했다.
//    백엔드/AI 확정 후 이 구조와 이를 쓰는 화면을 함께 맞춰야 한다.
export const mockDashboard = {
  dashboardId: 1,
  roomId: MOCK_ROOM_ID,
  userId: MY_USER_ID,
  summaryDate: "2026-07-30",
  messageCount: 128,
  imageCount: 7,
  reactionCount: 12,
  bookmarkCount: 3,
  averageResponseSeconds: 184.5,
  busiestHour: 22,
  emotionSummary: { LOVE: 8, CALM: 6, JOY: 3, SADNESS: 3 },
  emotionFlow: [
    { startHour: 8, emotionSummary: { CALM: 2, JOY: 1 } },
    { startHour: 10, emotionSummary: { CALM: 3 } },
    { startHour: 12, emotionSummary: { JOY: 2, LOVE: 1 } },
    { startHour: 14, emotionSummary: { CALM: 1 } },
    { startHour: 16, emotionSummary: { SADNESS: 2 } },
    { startHour: 18, emotionSummary: { LOVE: 2, SADNESS: 1 } },
    { startHour: 20, emotionSummary: { LOVE: 2, CALM: 1 } },
    { startHour: 22, emotionSummary: { LOVE: 3, JOY: 1 } },
  ],
  frequentWords: [
    { word: "사랑", count: 5 },
    { word: "보고싶어", count: 4 },
    { word: "고마워", count: 3 },
  ],
  calculatedAt: "2026-07-30T23:59:00",
  updatedAt: "2026-07-30T23:59:00",
};

// ===== chat_message (무한 스크롤 테스트를 위해 대량 생성) =====
const SAMPLE_CONTENTS = [
  "오늘 고생 많았어",
  "고마워, 너도!",
  "퇴근길 조심해~",
  "알았어.",
  "오늘 저녁 뭐 먹을까?",
  "나도 보고 싶어 주말에 보자!",
  "응! 나도 너무 보고 싶어 주말에 보자~",
  "오늘 하루 어땠어?",
  "그냥 그랬어, 너는?",
  "나는 좋았어 :)",
];

// chat_analysis.emotion_type — ERD 주석대로 한국어 감정 문자열
const SAMPLE_EMOTION_TYPES = ["따뜻함", "편안함", "설렘", "애정", "서운함"];

// chat_message.client_message_id 는 CHAR(36) UUID (클라이언트 생성, 중복 전송 방지용)
export function createClientMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildMockMessages(total = 120) {
  const messages = [];
  const start = new Date("2026-05-21T19:30:00");
  for (let i = 0; i < total; i += 1) {
    const senderId = i % 2 === 0 ? MY_USER_ID : PARTNER_USER_ID;
    const sentAt = new Date(start.getTime() - (total - i) * 1000 * 60 * 6);
    messages.push({
      messageId: i + 1,
      roomId: MOCK_ROOM_ID,
      senderId,
      clientMessageId: createClientMessageId(),
      messageType: MESSAGE_TYPE.TEXT,
      content: SAMPLE_CONTENTS[i % SAMPLE_CONTENTS.length],
      sentAt: sentAt.toISOString(),
      // chat_message_image 조인 결과 (messageType === IMAGE 일 때 채워짐)
      images: [],
      // chat_analysis 조인 결과
      emotionType: SAMPLE_EMOTION_TYPES[i % SAMPLE_EMOTION_TYPES.length],
      analysisStatus: ANALYSIS_STATUS.COMPLETED,
    });
  }
  return messages;
}

// 오래된 메시지가 배열 앞쪽, 최신 메시지가 뒤쪽에 오도록 정렬
export const mockMessages = buildMockMessages(120);

// ===== chat_read_state =====
// 기존 목업의 message.read(boolean) 대신, 상대방이 어디까지 읽었는지 하나의 값으로 관리한다.
// "읽음" 표시는 내 메시지의 messageId <= partnerLastReadMessageId 로 파생 계산한다.
export const mockPartnerReadState = {
  roomId: MOCK_ROOM_ID,
  userId: PARTNER_USER_ID,
  lastReadMessageId: mockMessages[mockMessages.length - 1]?.messageId ?? null,
  readAt: "2026-05-21T19:30:00",
};

// ===== 채팅 상대 정보 (user + couple_member 조합) =====
export const mockChatPartner = {
  userId: PARTNER_USER_ID,
  nickname: "윤지",
  statusMessage: "오늘도 사랑해",
  profileImageUrl: null,
};

export const mockSuggestions = [
  "오늘 저녁은 뭐가 좋을까?",
  "오늘 메뉴, 뭐가 좋을까?",
  "오늘 저녁 메뉴, 어떤 걸로 할까?",
];
