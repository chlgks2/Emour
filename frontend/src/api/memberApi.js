import { apiRequest } from './httpClient.js'
import { resolveProtectedImageUrl } from '../utils/protectedImageUrl.js'

const MEMBER_ENDPOINTS = {
  myProfile: '/users/me',
  password: '/users/me/password',
  // MemberController 가 제공하는 프로필 이미지 엔드포인트
  profileImages: '/users/profile-img',
  partnerProfileImage: '/users/partner/profile-img',
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

/**
 * 나와 상대방의 프로필 이미지.  GET /users/profile-img
 * -> { myUserId, myProfileImageUrl, partnerUserId, partnerProfileImageUrl }
 *
 * 이미지 주소는 인증이 필요한 /uploads/... 경로라서 화면에 걸 수 있는 형태로 바꿔서 준다.
 * 커플 연결 전이면 partner* 두 값이 null 이다.
 */
export async function getProfileImages() {
  const response = await apiRequest(
    MEMBER_ENDPOINTS.profileImages,
  )
  const data = response?.data ?? response ?? null

  if (!data) {
    return null
  }

  const [myProfileImageUrl, partnerProfileImageUrl] =
    await Promise.all([
      resolveProtectedImageUrl(data.myProfileImageUrl),
      resolveProtectedImageUrl(data.partnerProfileImageUrl),
    ])

  return {
    myUserId: data.myUserId ?? null,
    myProfileImageUrl: myProfileImageUrl ?? null,
    partnerUserId: data.partnerUserId ?? null,
    partnerProfileImageUrl: partnerProfileImageUrl ?? null,
  }
}

/** 상대방 프로필 이미지만.  GET /users/partner/profile-img */
export async function getPartnerProfileImage() {
  const response = await apiRequest(
    MEMBER_ENDPOINTS.partnerProfileImage,
  )
  const data = response?.data ?? response ?? null

  if (!data?.userId) {
    return null
  }

  return {
    userId: data.userId,
    profileImageUrl:
      (await resolveProtectedImageUrl(data.profileImageUrl)) ?? null,
  }
}

/**
 * 내 프로필 이미지 업로드.  POST /users/profile-img (multipart)
 *
 * 예전에는 파일을 FileReader 로 읽어 data URL 로만 들고 있었다.
 * 그 값은 이 브라우저 밖으로 나가지 않아서 상대방에게도, 다른 기기에서도 보이지 않았다.
 * 이제는 서버에 올려 user.profile_image_url 로 저장한다.
 */
export async function uploadMyProfileImage(file) {
  if (!file) {
    throw new Error('업로드할 사진을 선택해주세요.')
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

  return response?.data ?? response ?? null
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
