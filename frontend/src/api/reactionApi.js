// ─────────────────────────────────────────────────────────
// 메시지 리액션 목업 API (chat_reaction 테이블 기준)
// 지금은 localStorage로 흉내내지만, 실제로는 메시지 자체의 속성이라
// 양쪽(나/상대) 모두에게 보여야 하는 "공유" 데이터입니다.
//
// 리액션 아이템 형태:
//   { reactionId, roomId, userId, messageId, reactionType, createdAt, updatedAt }
//
// ⚠️ ERD의 UNIQUE 제약이 (user_id, message_id) 이므로 "한 사용자가 메시지당 하나"이고,
//    한 메시지에는 나/상대 각각의 리액션이 최대 2개 달릴 수 있습니다.
//    그래서 조회 결과를 messageId -> 리액션 "배열" 로 모델링했습니다.
//    (기존 목업은 메시지당 1개만 가정하고 있어서 상대 리액션이 덮어써지는 구조였습니다.)
//
// ⚠️ 지금 구현은 한 브라우저 안에서만 상태가 유지됩니다.
//    실서비스에서 상대방 화면에 실시간으로 반영하려면
//    백엔드 연동 시 WebSocket(STOMP) 또는 폴링으로 교체해야 합니다.
// ─────────────────────────────────────────────────────────

import { MOCK_ROOM_ID, MY_USER_ID } from "./mock/db";

const STORAGE_KEY = "mock_reactions_v2";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextReactionId(list) {
  return list.reduce((max, r) => Math.max(max, r.reactionId ?? 0), 0) + 1;
}

// 평면 배열 -> { [messageId]: reaction[] }
function groupByMessageId(list) {
  return list.reduce((acc, reaction) => {
    (acc[reaction.messageId] ??= []).push(reaction);
    return acc;
  }, {});
}

/**
 * 채팅방 진입 시, 현재 방의 리액션을 한 번에 조회
 * 반환 형태: { [messageId]: Array<{ reactionId, userId, messageId, reactionType, ... }> }
 * TODO: 백엔드 연동 시 -> GET /api/chat/rooms/{roomId}/reactions
 *       (또는 메시지 목록 조회 응답에 reactions 배열을 함께 내려주는 방식을 권장)
 */
export async function fetchReactions() {
  await delay(50);
  return groupByMessageId(readAll());
}

/**
 * 내 리액션 설정. 이미 같은 reactionType 이 달려 있으면 다시 눌렀을 때 해제(토글)됨.
 * @param {number} messageId
 * @param {'HEART'|'CHECK'|'GREAT'} reactionType - chat_reaction.reaction_type
 * @returns {Promise<Array>} 해당 메시지의 갱신된 리액션 목록
 * TODO: 백엔드 연동 시 -> PUT /api/messages/{messageId}/reaction { reactionType }
 *       해제 시 -> DELETE /api/messages/{messageId}/reaction
 *       상대방 화면 반영은 WebSocket 이벤트 브로드캐스트로 처리 예정
 */
export async function setMyReaction(messageId, reactionType) {
  await delay();
  const all = readAll();
  const mineIndex = all.findIndex((r) => r.messageId === messageId && r.userId === MY_USER_ID);
  const now = new Date().toISOString();

  if (mineIndex !== -1 && all[mineIndex].reactionType === reactionType) {
    all.splice(mineIndex, 1); // 같은 걸 다시 누르면 해제
  } else if (mineIndex !== -1) {
    all[mineIndex] = { ...all[mineIndex], reactionType, updatedAt: now };
  } else {
    all.push({
      reactionId: nextReactionId(all),
      roomId: MOCK_ROOM_ID,
      userId: MY_USER_ID,
      messageId,
      reactionType,
      createdAt: now,
      updatedAt: now,
    });
  }

  writeAll(all);
  return all.filter((r) => r.messageId === messageId);
}
