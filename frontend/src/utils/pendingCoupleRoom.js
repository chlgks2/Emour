const PENDING_COUPLE_ROOM_KEY =
  'pendingCoupleRoom'

export function savePendingCoupleRoom(
  invitation,
  ownerUserId = null,
) {
  const pendingRoom = {
    roomId: invitation.roomId,
    ownerUserId,
    roomCode: invitation.invitationCode,
    roomCodeExpiresAt:
      invitation.expiresAt,
    roomStatus: 'WAITING',
  }

  localStorage.setItem(
    PENDING_COUPLE_ROOM_KEY,
    JSON.stringify(pendingRoom),
  )

  return pendingRoom
}

export function saveCurrentCoupleRoom(
  room,
  ownerUserId = null,
) {
  const currentRoom = {
    roomId: room.roomId,
    ownerUserId,
    roomCode:
      room.invitationCode ??
      room.roomCode ??
      null,
    roomCodeExpiresAt:
      room.expiresAt ??
      room.roomCodeExpiresAt ??
      null,
    roomStatus:
      room.status ??
      room.roomStatus ??
      'WAITING',
  }

  localStorage.setItem(
    PENDING_COUPLE_ROOM_KEY,
    JSON.stringify(currentRoom),
  )

  return currentRoom
}

export function getPendingCoupleRoom() {
  const storedValue = localStorage.getItem(
    PENDING_COUPLE_ROOM_KEY,
  )

  if (!storedValue) {
    return null
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    localStorage.removeItem(
      PENDING_COUPLE_ROOM_KEY,
    )

    return null
  }
}

export const getCurrentCoupleRoom =
  getPendingCoupleRoom

export function hasCurrentCoupleRoom(
  userId,
) {
  const room = getCurrentCoupleRoom()

  if (!room?.roomId) {
    return false
  }

  if (
    room.ownerUserId !== undefined &&
    room.ownerUserId !== null &&
    userId !== undefined &&
    userId !== null
  ) {
    return (
      Number(room.ownerUserId) ===
      Number(userId)
    )
  }

  return true
}

export function clearPendingCoupleRoom() {
  localStorage.removeItem(
    PENDING_COUPLE_ROOM_KEY,
  )
}
