import { apiRequest } from './httpClient.js'

const COUPLE_ENDPOINTS = {
  invitation: '/couples/invitation',
  connect: '/couples/connect',
  disconnect: '/couples',
}

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

export async function disconnectCouple() {
  const response = await apiRequest(
    COUPLE_ENDPOINTS.disconnect,
    {
      method: 'DELETE',
    },
  )

  return response?.data ?? null
}
