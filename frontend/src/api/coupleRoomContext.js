// 커플방 식별자(roomId)를 한 곳에서 해결한다.
//
// ── 왜 필요한가 ────────────────────────────────────────────────────
// 예전에는 화면마다 localStorage('pendingCoupleRoom')에서 roomId 를 직접 꺼내 썼다.
// 그 값은 커플 연결/해제 시점에만 갱신되므로
//   · 상대가 연결을 끊어 방이 INACTIVE 가 돼도 프론트는 옛 방을 계속 조회하고
//   · 같은 브라우저에서 다른 계정으로 로그인하면 이전 사용자의 방을 그대로 보게 되고
//     (한쪽 창과 다른 쪽 창의 데이터가 달라 보이던 원인 중 하나)
//   · 시크릿 창처럼 localStorage 가 빈 환경에서는 아예 roomId 를 못 구했다.
//
// 이제 진짜 값은 항상 서버(GET /couples/room-id + /couples/status)에서 온다.
// localStorage 는 서버를 못 부를 때만 쓰는 폴백이고, 그때도 저장해 둔 ownerUserId 가
// 지금 로그인한 사용자와 같을 때만 쓴다.
import { getCurrentUser } from './authApi.js'
import { getMyCoupleRoom } from './coupleApi.js'
import {
  getCurrentCoupleRoom,
  hasCurrentCoupleRoom,
  saveCurrentCoupleRoom,
} from '../utils/pendingCoupleRoom.js'

// { userId, room } — 로그인한 사용자가 바뀌면 자동으로 무효가 된다.
let cachedEntry = null
// 같은 순간에 여러 화면이 물어봐도 요청은 한 번만 나가게 묶는다.
let inflightRequest = null

function currentUserId() {
  return getCurrentUser()?.userId ?? null
}

/** 커플 연결/해제처럼 방이 바뀌는 동작 뒤에 호출한다. */
export function invalidateCoupleRoom() {
  cachedEntry = null
  inflightRequest = null
}

async function fetchCoupleRoom(userId) {
  try {
    const room = await getMyCoupleRoom()

    /*
     * 서버가 "방 없음"이라고 하면 로컬에 남아 있는 방은 이미 끝난 방이다.
     * 되살리지 않고 그대로 없는 것으로 둔다.
     */
    const resolvedRoom = room?.roomId
      ? saveCurrentCoupleRoom(room, userId)
      : null

    // 방 조회가 잠깐 실패하거나 연결 직후 아직 null을 반환한 값을 계속 캐시하면
    // 채팅 화면은 이후에도 roomId 없이 전송을 시도하게 된다. 실제 방이 확인된
    // 경우만 캐시하고, null은 다음 호출에서 서버에 다시 확인한다.
    cachedEntry = resolvedRoom
      ? { userId, room: resolvedRoom }
      : null

    return resolvedRoom
  } catch {
    /*
     * 서버를 못 부르는 동안에만 로컬 값을 쓴다.
     * 캐시에는 넣지 않으므로 다음 호출에서 다시 서버에 물어본다.
     */
    return hasCurrentCoupleRoom(userId) ? getCurrentCoupleRoom() : null
  } finally {
    inflightRequest = null
  }
}

/**
 * 현재 커플방. 없으면 null.
 * @returns {Promise<{roomId: number, status: string}|null>}
 */
export async function resolveCoupleRoom() {
  const userId = currentUserId()

  if (cachedEntry && cachedEntry.userId === userId) {
    return cachedEntry.room
  }

  // 사용자가 바뀌었으면 진행 중이던 요청의 결과도 믿을 수 없다.
  if (!inflightRequest || inflightRequest.userId !== userId) {
    inflightRequest = { userId, promise: fetchCoupleRoom(userId) }
  }

  return inflightRequest.promise
}

/** 현재 커플방 id. 없으면 null. */
export async function resolveRoomId() {
  return (await resolveCoupleRoom())?.roomId ?? null
}
