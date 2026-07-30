import {
  mockMessages,
  mockChatPartner,
  mockSuggestions,
  mockPartnerReadState,
  createClientMessageId,
  MY_USER_ID,
  MOCK_ROOM_ID,
} from "./mock/db";
import { ANALYSIS_STATUS, MESSAGE_TYPE } from "../constants/enums";

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

const PAGE_SIZE = 20;

/**
 * 채팅방 상대 정보 조회
 * 백엔드 연동 시: GET /chat/rooms/{roomId}
 * 응답: { userId, nickname, statusMessage, profileImageUrl }
 */
export async function fetchChatPartner() {
  await delay(200);
  return mockChatPartner;
}

/**
 * 상대방이 어디까지 읽었는지 조회 (chat_read_state)
 * 백엔드 연동 시: GET /chat/rooms/{roomId}/read-state
 * 응답: { userId, lastReadMessageId, readAt }
 */
export async function fetchPartnerReadState() {
  await delay(100);
  return mockPartnerReadState;
}

/**
 * 메시지 목록 조회 (무한 스크롤 - 위로 스크롤 시 이전 메시지 로드)
 * @param {number|null} beforeMessageId - 이 messageId 보다 이전(과거) 메시지를 요청. null이면 최신 페이지.
 * @param {number} size
 * 백엔드 연동 시: GET /chat/rooms/{roomId}/messages?beforeMessageId={messageId}&size=20
 * 응답: { messages: [...], nextBeforeMessageId } (null 이면 더 불러올 과거 메시지 없음)
 */
export async function fetchMessages({ beforeMessageId = null, size = PAGE_SIZE } = {}) {
  await delay(500);
  const cursorIndex =
    beforeMessageId === null ? -1 : mockMessages.findIndex((m) => m.messageId === beforeMessageId);
  // 커서를 못 찾으면(=최신 페이지 요청) 배열 끝에서부터 잘라온다.
  const endIndex = cursorIndex === -1 ? mockMessages.length : cursorIndex;
  const startIndex = Math.max(0, endIndex - size);
  const page = mockMessages.slice(startIndex, endIndex);
  return {
    messages: page,
    nextBeforeMessageId: startIndex > 0 ? page[0]?.messageId ?? null : null,
  };
}

/**
 * 메시지 전송
 * @param {{ content: string, clientMessageId?: string }} payload
 * 백엔드 연동 시: WebSocket(STOMP) publish 또는 POST /chat/rooms/{roomId}/messages
 *   요청 바디: { clientMessageId, messageType, content }
 *   clientMessageId 는 중복 전송 방지용으로 클라이언트가 만들어 보내고, 서버 응답의
 *   messageId 로 낙관적 렌더링한 메시지를 교체한다.
 */
export async function sendMessage({ content, clientMessageId = createClientMessageId() }) {
  await delay(300);

  // clientMessageId 로 중복 전송을 막는다 (서버의 UNIQUE(sender_id, client_message_id) 와 동일한 역할)
  const alreadySent = mockMessages.find((m) => m.clientMessageId === clientMessageId);
  if (alreadySent) return alreadySent;

  const newMessage = {
    messageId: (mockMessages[mockMessages.length - 1]?.messageId ?? 0) + 1,
    roomId: MOCK_ROOM_ID,
    senderId: MY_USER_ID,
    clientMessageId,
    messageType: MESSAGE_TYPE.TEXT,
    content,
    sentAt: new Date().toISOString(),
    images: [],
    emotionType: null, // AI 분석 결과는 서버 연동 후 채워짐
    analysisStatus: ANALYSIS_STATUS.PENDING,
  };
  // 목업 저장소에 실제로 append 해야 messageId 가 매번 증가하고(=키 충돌 방지)
  // 재조회 시에도 보낸 메시지가 남는다.
  mockMessages.push(newMessage);
  return newMessage;
}

/**
 * AI 문장 다듬기 추천
 * 백엔드 연동 시: POST /ai/suggest-rephrase  { content }
 */
export async function fetchSuggestions(content) {
  await delay(400);
  if (!content?.trim()) return [];
  return mockSuggestions;
}
