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
  updateCurrentUserCache,
} from './authApi.js'

import {
  getMyProfile,
  updateMyProfile,
  uploadMyProfileImage,
  withdrawMyAccount,
} from './memberApi.js'

import {
  invalidateCoupleRoom,
} from './coupleRoomContext.js'

import {
  resolveProtectedImageUrl,
} from '../utils/protectedImageUrl.js'

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
    fetchedServerRoom,
  ] = await Promise.all([
    getMyProfile(),
    getMyCoupleRoom(),
  ])

  const storedRoom =
    getPendingCoupleRoom()

  const storedRoomBelongsToUser =
    storedRoom?.roomId &&
    (storedRoom.ownerUserId === null ||
      storedRoom.ownerUserId ===
        undefined ||
      Number(storedRoom.ownerUserId) ===
        Number(userResponse.userId))

  let serverRoom = fetchedServerRoom

  /*
   * 연결된 두 사람 중 상대방이 나가면 백엔드는 기존 방을 INACTIVE로
   * 전환하여 room-id/status 조회에서 제외합니다. 남은 사용자는 기존
   * ACTIVE 방을 로컬에 보관하고 있으므로 새 초대 코드를 자동 발급해
   * WAITING 화면으로 전환합니다.
   */
  if (
    !serverRoom &&
    storedRoomBelongsToUser &&
    storedRoom.roomStatus === 'ACTIVE'
  ) {
    const invitation =
      await createCoupleInvitation()

    serverRoom =
      savePendingCoupleRoom(
        invitation,
        userResponse.userId,
      )
  }

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

  const profile = mapMyPageResponse({
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

  /*
   * user.profile_image_url 은 인증이 필요한 /uploads/... 경로다.
   * <img src> 에 그대로 걸면 401 이 나므로 화면에 걸 수 있는 형태로 바꿔서 넘긴다.
   */
  return {
    ...profile,
    profileImageUrl:
      (await resolveProtectedImageUrl(
        profile.profileImageUrl,
      )) ?? '',
  }
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

  /*
   * 사진은 POST /users/profile-img 로 올려 user.profile_image_url 에 저장한다.
   * 예전에는 이 자리에서 막아두고 목업만 data URL 을 들고 있어서,
   * 바꾼 사진이 이 브라우저 밖으로 나가지 않았다.
   */
  if (profileImageFile) {
    await uploadMyProfileImage(profileImageFile)
  }

  const updatedProfile = await updateMyProfile({
    nickname: trimmedNickname,
    statusMessage:
      trimmedStatusMessage,
  })

  // 로그인할 때 저장해 둔 세션 캐시도 같이 갱신한다. (안 하면 옛 닉네임이 남는다)
  updateCurrentUserCache({
    nickname:
      updatedProfile?.nickname ??
      trimmedNickname,
    statusMessage:
      updatedProfile?.statusMessage ??
      trimmedStatusMessage,
    profileImageUrl:
      updatedProfile?.profileImageUrl ??
      null,
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

  const [invitation, profile] =
    await Promise.all([
      createCoupleInvitation(),
      getMyProfile(),
    ])

  // ownerUserId 를 같이 남겨야 다른 계정으로 로그인했을 때 이 방을 걸러낼 수 있다.
  savePendingCoupleRoom(
    invitation,
    profile?.userId ?? null,
  )
  invalidateCoupleRoom()

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
  // 방이 바뀌었으니 캐시해 둔 roomId 를 버린다. (안 그러면 끝난 방을 계속 조회한다)
  invalidateCoupleRoom()

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
  invalidateCoupleRoom()

  return null
}
