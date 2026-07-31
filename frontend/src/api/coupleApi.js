import { apiRequest } from './httpClient.js'

const COUPLE_ENDPOINTS = {
  invitation: '/couples/invitation',
  connect: '/couples/connect',
  roomId: '/couples/room-id',
  status: '/couples/status',
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
      await apiRequest(
        COUPLE_ENDPOINTS.status,
      )

    return {
      roomId,
      status:
        statusResponse?.data?.status ??
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
