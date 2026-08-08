import { apiRequest } from './httpClient.js'

const COUPLE_ENDPOINTS = {
  invitation: '/couples/invitation',
  regenerateInvitation: '/couples/invitation/regenerate',
  connect: '/couples/connect',
  reconnect: '/couples/reconnect',
  roomId: '/couples/room-id',
  status: '/couples/status',
  startDate: '/couples/startDate',
  disconnect: '/couples',
}

const COUPLE_NOT_FOUND_STATUS = 404

export async function createCoupleInvitation() {
  const response = await apiRequest(
    COUPLE_ENDPOINTS.invitation,
    {
      method: 'POST',
    },
  )

  return response?.data ?? null
}

export async function regenerateCoupleInvitation() {
  const response = await apiRequest(
    COUPLE_ENDPOINTS.regenerateInvitation,
    {
      method: 'POST',
    },
  )

  return response?.data ?? null
}

export async function connectCouple(
  invitationCode,
) {
  const response = await apiRequest(
    COUPLE_ENDPOINTS.connect,
    {
      method: 'POST',
      body: {
        invitationCode:
          invitationCode.trim(),
      },
    },
  )

  return response?.data ?? null
}

export async function joinOrReconnectCouple(invitationCode) {
  const normalizedCode = invitationCode.trim()

  try {
    const response = await apiRequest(
      COUPLE_ENDPOINTS.reconnect,
      {
        method: 'POST',
        body: { invitationCode: normalizedCode },
      },
    )
    return response?.data ?? null
  } catch {
    return connectCouple(normalizedCode)
  }
}

export async function getCoupleStatus() {
  const response = await apiRequest(
    COUPLE_ENDPOINTS.status,
  )

  return response?.data ?? null
}

export async function getCoupleStartDate() {
  const response = await apiRequest(
    COUPLE_ENDPOINTS.startDate,
  )

  return response?.data ?? null
}

export async function getMyCoupleRoom() {
  try {
    const roomIdResponse =
      await apiRequest(
        COUPLE_ENDPOINTS.roomId,
      )

    const roomId =
      roomIdResponse?.data?.roomId

    if (!roomId) {
      return null
    }

    const statusResponse =
      await getCoupleStatus()

    return {
      roomId,
      status:
        statusResponse?.status ??
        'WAITING',
    }
  } catch (error) {
    if (
      error.status ===
      COUPLE_NOT_FOUND_STATUS
    ) {
      return null
    }

    throw error
  }
}

export async function disconnectCouple() {
  const response = await apiRequest(
    COUPLE_ENDPOINTS.disconnect,
    {
      method: 'DELETE',
    },
  )

  return response?.data ?? null
}
