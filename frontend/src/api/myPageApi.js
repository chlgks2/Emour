import {
  MOCK_MY_PAGE_MEMBER_RESPONSE,
  MOCK_MY_PAGE_ROOM_RESPONSE,
  MOCK_MY_PAGE_USER_RESPONSE,
} from '../data/myPageMockData.js'

import {
  mapMyPageApiPayload,
  mapMyPageResponse,
} from '../mappers/myPageMapper.js'

import {
  apiRequest,
} from './httpClient.js'

/*
 * 기본값은 Mock API입니다.
 *
 * 백엔드 연결 후 .env에서
 * VITE_USE_MOCK_API=false로 바꾸면
 * 실제 Spring API를 호출합니다.
 */
const USE_MOCK_API =
  import.meta.env.VITE_USE_MOCK_API !==
  'false'

const MOCK_DELAY = 250

/*
 * 백엔드의 실제 주소가 달라지면
 * 이 부분만 수정하면 됩니다.
 */
const ENDPOINTS = {
  myPage: '/api/users/me/mypage',

  profile:
    '/api/users/me/profile',

  partnerNickname:
    '/api/couple-members/me/partner-nickname',

  regenerateRoomCode:
    '/api/couple-rooms/me/room-code',

  leaveRoom:
    '/api/couple-rooms/me/members/me',

  logout:
    '/api/auth/logout',

  withdraw:
    '/api/users/me',
}

let mockUserResponse = {
  ...MOCK_MY_PAGE_USER_RESPONSE,
}

let mockRoomResponse = {
  ...MOCK_MY_PAGE_ROOM_RESPONSE,
}

let mockMemberResponse = {
  ...MOCK_MY_PAGE_MEMBER_RESPONSE,
}

function wait(milliseconds = MOCK_DELAY) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(
        new Error(
          '프로필 사진을 불러오지 못했습니다.',
        ),
      )
    }

    reader.readAsDataURL(file)
  })
}

function createMappedMockResponse() {
  return mapMyPageResponse({
    userResponse: mockUserResponse,
    roomResponse: mockRoomResponse,
    memberResponse:
      mockMemberResponse,
  })
}

function createMockRoomCode() {
  const characters =
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  let randomCode = ''

  for (
    let index = 0;
    index < 8;
    index += 1
  ) {
    const randomIndex = Math.floor(
      Math.random() *
        characters.length,
    )

    randomCode +=
      characters[randomIndex]
  }

  return `${randomCode.slice(
    0,
    4,
  )}-${randomCode.slice(4)}`
}

function createFutureExpirationDate(
  days = 7,
) {
  const expirationDate = new Date()

  expirationDate.setDate(
    expirationDate.getDate() + days,
  )

  return expirationDate.toISOString()
}

export async function getMyPageProfile() {
  if (USE_MOCK_API) {
    await wait()

    return createMappedMockResponse()
  }

  const response = await apiRequest(
    ENDPOINTS.myPage,
  )

  return mapMyPageApiPayload(response)
}

export async function updateMyPageProfile({
  nickname,
  statusMessage,
  profileImageFile,
}) {
  const trimmedNickname =
    nickname.trim()

  const trimmedStatusMessage =
    statusMessage.trim()

  if (!trimmedNickname) {
    throw new Error(
      '닉네임을 입력해주세요.',
    )
  }

  if (USE_MOCK_API) {
    await wait()

    let profileImageUrl =
      mockUserResponse.profile_image_url

    if (profileImageFile) {
      profileImageUrl =
        await readFileAsDataUrl(
          profileImageFile,
        )
    }

    mockUserResponse = {
      ...mockUserResponse,
      nickname: trimmedNickname,
      status_message:
        trimmedStatusMessage,
      profile_image_url:
        profileImageUrl,
      updated_at:
        new Date().toISOString(),
    }

    return createMappedMockResponse()
  }

  const formData = new FormData()

  formData.append(
    'nickname',
    trimmedNickname,
  )

  formData.append(
    'statusMessage',
    trimmedStatusMessage,
  )

  if (profileImageFile) {
    formData.append(
      'profileImage',
      profileImageFile,
    )
  }

  await apiRequest(
    ENDPOINTS.profile,
    {
      method: 'PATCH',
      body: formData,
    },
  )

  return getMyPageProfile()
}

export async function updatePartnerNickname({
  partnerNickname,
}) {
  const trimmedPartnerNickname =
    partnerNickname.trim()

  if (!trimmedPartnerNickname) {
    throw new Error(
      '연인 애칭을 입력해주세요.',
    )
  }

  if (
    trimmedPartnerNickname.length > 20
  ) {
    throw new Error(
      '연인 애칭은 20자 이하로 입력해주세요.',
    )
  }

  if (USE_MOCK_API) {
    await wait()

    if (
      !mockMemberResponse ||
      mockMemberResponse.status !==
        'ACTIVE' ||
      mockRoomResponse?.status !==
        'ACTIVE'
    ) {
      throw new Error(
        '현재 연결된 연인이 없습니다.',
      )
    }

    mockMemberResponse = {
      ...mockMemberResponse,
      partner_nickname:
        trimmedPartnerNickname,
    }

    return createMappedMockResponse()
  }

  await apiRequest(
    ENDPOINTS.partnerNickname,
    {
      method: 'PATCH',
      body: {
        partnerNickname:
          trimmedPartnerNickname,
      },
    },
  )

  /*
   * 수정 API가 응답 본문을 보내지 않아도
   * 마이페이지를 다시 조회하므로
   * 화면 데이터가 최신 상태로 유지됩니다.
   */
  return getMyPageProfile()
}

export async function regenerateRoomCode() {
  if (USE_MOCK_API) {
    await wait()

    if (
      !mockRoomResponse ||
      !mockMemberResponse ||
      mockMemberResponse.status !==
        'ACTIVE'
    ) {
      throw new Error(
        '현재 참여 중인 방이 없습니다.',
      )
    }

    if (
      mockRoomResponse.status ===
      'INACTIVE'
    ) {
      throw new Error(
        '종료된 방의 코드는 재발급할 수 없습니다.',
      )
    }

    mockRoomResponse = {
      ...mockRoomResponse,
      room_code:
        createMockRoomCode(),
      room_code_expires_at:
        createFutureExpirationDate(7),
      updated_at:
        new Date().toISOString(),
    }

    return createMappedMockResponse()
  }

  await apiRequest(
    ENDPOINTS.regenerateRoomCode,
    {
      method: 'POST',
    },
  )

  return getMyPageProfile()
}

export async function leaveCoupleRoom() {
  if (USE_MOCK_API) {
    await wait()

    if (
      !mockRoomResponse ||
      !mockMemberResponse ||
      mockMemberResponse.status !==
        'ACTIVE'
    ) {
      throw new Error(
        '현재 참여 중인 방이 없습니다.',
      )
    }

    mockMemberResponse = {
      ...mockMemberResponse,
      status: 'LEFT',
      left_at:
        new Date().toISOString(),
    }

    mockRoomResponse = {
      ...mockRoomResponse,
      status: 'WAITING',
      updated_at:
        new Date().toISOString(),
    }

    return createMappedMockResponse()
  }

  await apiRequest(
    ENDPOINTS.leaveRoom,
    {
      method: 'DELETE',
    },
  )

  return getMyPageProfile()
}

export async function logoutCurrentUser() {
  if (USE_MOCK_API) {
    await wait()
    return
  }

  await apiRequest(
    ENDPOINTS.logout,
    {
      method: 'POST',
    },
  )
}

export async function withdrawCurrentUser() {
  if (USE_MOCK_API) {
    await wait()

    const withdrawalTime =
      new Date().toISOString()

    mockUserResponse = {
      ...mockUserResponse,
      status: 'WITHDRAWN',
      updated_at: withdrawalTime,
      deleted_at: withdrawalTime,
    }

    if (
      mockMemberResponse?.status ===
      'ACTIVE'
    ) {
      mockMemberResponse = {
        ...mockMemberResponse,
        status: 'LEFT',
        left_at: withdrawalTime,
      }

      mockRoomResponse = {
        ...mockRoomResponse,
        status: 'WAITING',
        updated_at: withdrawalTime,
      }
    }

    return createMappedMockResponse()
  }

  await apiRequest(
    ENDPOINTS.withdraw,
    {
      method: 'DELETE',
    },
  )

  return null
}