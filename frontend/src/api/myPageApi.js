import {
  MOCK_MY_PAGE_MEMBER_RESPONSE,
  MOCK_MY_PAGE_ROOM_RESPONSE,
  MOCK_MY_PAGE_USER_RESPONSE,
} from '../data/myPageMockData.js'

import {
  mapMyPageResponse,
} from '../mappers/myPageMapper.js'

import {
  createCoupleInvitation,
  disconnectCouple,
  getMyCoupleRoom,
} from './coupleApi.js'

import {
  logout,
} from './authApi.js'

import {
  getMyProfile,
  updateMyProfile,
  withdrawMyAccount,
} from './memberApi.js'

import {
  clearPendingCoupleRoom,
  getPendingCoupleRoom,
  saveCurrentCoupleRoom,
  savePendingCoupleRoom,
} from '../utils/pendingCoupleRoom.js'

/*
 * 기본값은 Mock API입니다.
 *
 * 백엔드 연결 후 .env에서
 * VITE_USE_MOCK_API=false로 바꾸면
 * 실제 Spring API를 호출합니다.
 */
const USE_MOCK_API =
  import.meta.env
    .VITE_USE_MYPAGE_MOCK_API === 'true'

const MOCK_DELAY = 250

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
  const pendingRoom =
    getPendingCoupleRoom()

  return mapMyPageResponse({
    userResponse: mockUserResponse,
    roomResponse:
      pendingRoom ?? mockRoomResponse,
    memberResponse: pendingRoom
      ? {
          roomId: pendingRoom.roomId,
          userId:
            mockUserResponse.user_id,
          status: 'ACTIVE',
        }
      : mockMemberResponse,
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

  const [
    userResponse,
    serverRoom,
  ] = await Promise.all([
    getMyProfile(),
    getMyCoupleRoom(),
  ])

  const storedRoom =
    getPendingCoupleRoom()

  if (!serverRoom) {
    clearPendingCoupleRoom()
  }

  const currentRoom = serverRoom
    ? saveCurrentCoupleRoom(
        {
          ...storedRoom,
          ...serverRoom,
        },
        userResponse.userId,
      )
    : null

  return mapMyPageResponse({
    userResponse,
    roomResponse: currentRoom,
    memberResponse: currentRoom
      ? {
          roomId: currentRoom.roomId,
          userId: userResponse.userId,
          status: 'ACTIVE',
        }
      : null,
  })
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

  if (profileImageFile) {
    throw new Error(
      '프로필 이미지 업로드 API는 아직 제공되지 않습니다.',
    )
  }

  await updateMyProfile({
    nickname: trimmedNickname,
    statusMessage:
      trimmedStatusMessage,
  })

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

  throw new Error(
    '연인 애칭 수정 API는 아직 제공되지 않습니다.',
  )
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

  const invitation =
    await createCoupleInvitation()

  savePendingCoupleRoom(invitation)

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

  await disconnectCouple()
  clearPendingCoupleRoom()

  return null
}

export async function logoutCurrentUser() {
  if (USE_MOCK_API) {
    await wait()
    return
  }

  await logout()
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

  await withdrawMyAccount()
  clearPendingCoupleRoom()

  return null
}
