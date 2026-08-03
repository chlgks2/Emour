import { apiRequest } from './httpClient.js'

const MEMBER_ENDPOINTS = {
  myProfile: '/users/me',
  password: '/users/me/password',
  partnerNickname: '/users/partner-nickname',
}

export async function getMyProfile() {
  const response = await apiRequest(
    MEMBER_ENDPOINTS.myProfile,
  )

  return response?.data ?? null
}

export async function updateMyProfile({
  nickname,
  birth,
  profileImageUrl,
  statusMessage,
}) {
  const response = await apiRequest(
    MEMBER_ENDPOINTS.myProfile,
    {
      method: 'PATCH',
      body: {
        nickname,
        birth,
        profileImageUrl,
        statusMessage,
      },
    },
  )

  return response?.data ?? null
}

export async function changeMyPassword({
  currentPassword,
  newPassword,
}) {
  await apiRequest(
    MEMBER_ENDPOINTS.password,
    {
      method: 'PATCH',
      body: {
        currentPassword,
        newPassword,
      },
    },
  )
}

export async function getPartnerNickname() {
  const response = await apiRequest(
    MEMBER_ENDPOINTS.partnerNickname,
  )

  return response?.data ?? null
}

export async function savePartnerNickname(
  partnerNickname,
) {
  const response = await apiRequest(
    MEMBER_ENDPOINTS.partnerNickname,
    {
      method: 'PATCH',
      body: {
        partnerNickname,
      },
    },
  )

  return response?.data ?? null
}

export async function withdrawMyAccount() {
  await apiRequest(
    MEMBER_ENDPOINTS.myProfile,
    {
      method: 'DELETE',
    },
  )
}
