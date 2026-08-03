import { apiRequest } from './httpClient.js'

const MEMBER_ENDPOINTS = {
  myProfile: '/users/me',
  password: '/users/me/password',
  profileImages: '/users/profile-img',
}

export async function getProfileImages() {
  const response = await apiRequest(
    MEMBER_ENDPOINTS.profileImages,
  )

  return response?.data ?? null
}

export async function uploadMyProfileImage(file) {
  if (!file) {
    throw new Error('업로드할 프로필 이미지를 선택해주세요.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await apiRequest(
    MEMBER_ENDPOINTS.profileImages,
    {
      method: 'POST',
      body: formData,
    },
  )

  return response?.data ?? null
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

export async function withdrawMyAccount() {
  await apiRequest(
    MEMBER_ENDPOINTS.myProfile,
    {
      method: 'DELETE',
    },
  )
}
