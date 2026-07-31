// 개발 단계에서 백엔드 없이 화면을 동작시키기 위한 mock 데이터베이스.
// localStorage에 저장해서 새로고침해도 회원가입/로그인 상태가 유지되도록 한다.
//
// 모든 필드명은 백엔드 ERD(DOCS/Emour_SQL_schema.sql) 컬럼명의 camelCase 형태를 따른다.
// (예: user_id -> userId, sent_at -> sentAt) 실제 연동 시 mock 함수 본문만 fetch 로 교체하면
// 컴포넌트는 그대로 동작해야 한다.

import { ANALYSIS_STATUS, MESSAGE_TYPE, USER_STATUS } from "../../constants/enums";

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

export const mockSuggestions = [
  "오늘 저녁은 뭐가 좋을까?",
  "오늘 메뉴, 뭐가 좋을까?",
  "오늘 저녁 메뉴, 어떤 걸로 할까?",
];
