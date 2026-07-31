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
  const storedRoom =
    getPendingCoupleRoom()

  const isSameRoom =
    storedRoom?.roomId &&
    Number(storedRoom.roomId) ===
      Number(room.roomId)

  const hasSameOwner =
    storedRoom?.ownerUserId === null ||
    storedRoom?.ownerUserId ===
      undefined ||
    ownerUserId === null ||
    ownerUserId === undefined ||
    Number(storedRoom.ownerUserId) ===
      Number(ownerUserId)

  const previousRoom =
    isSameRoom && hasSameOwner
      ? storedRoom
      : null

  const currentRoom = {
    roomId: room.roomId,
    ownerUserId,
    roomCode:
      room.invitationCode ??
      room.roomCode ??
      previousRoom?.roomCode ??
      null,
    roomCodeExpiresAt:
      room.expiresAt ??
      room.roomCodeExpiresAt ??
      previousRoom?.roomCodeExpiresAt ??
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
