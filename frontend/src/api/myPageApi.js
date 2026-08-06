import {
  mapMyPageResponse,
} from '../mappers/myPageMapper.js'

import {
  createCoupleInvitation,
  disconnectCouple,
  getCoupleStartDate,
  getMyCoupleRoom,
} from './coupleApi.js'

import {
  logout,
  updateCurrentUserCache,
} from './authApi.js'

import {
  getMyProfile,
  getPartnerNickname,
  getPartnerStatusMessage,
  getProfileImages,
  updateMyProfile,
  updatePartnerNickname as updatePartnerNicknameOnServer,
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

/**
 * 재결합 초대 코드 발급.
 *
 * ⚠️ 상대방이 나간 뒤(방 INACTIVE, 나는 아직 ACTIVE 멤버)에는 이 요청이
 *    409 ALREADY_COUPLED 로 떨어진다. CoupleService.createInvitation 이
 *    맨 앞에서 validateCanStartNewRelationship 으로 "유지 중인 INACTIVE 방이
 *    있으면 거절"하는데, 정작 그 아래에는 INACTIVE 방을 찾아 재결합 코드를
 *    새로 발급하는 분기가 들어 있다. 앞의 검사가 항상 먼저 던지므로 그 분기는
 *    도달하지 못한다.
 *
 *    그래서 코드는 못 받는 게 정상이고, 그것 때문에 마이페이지 전체가
 *    "이미 연결된 커플이 있습니다." 한 줄로 덮이면 안 된다.
 *    실패를 삼켜서 나머지 화면(내 프로필·방 상태·방 나가기)은 살린다.
 *
 *    ↳ 백엔드에서 풀려면 validateCanStartNewRelationship 이 hasActiveCouple 만
 *      보게 하면 된다. (INACTIVE 방 재발급 분기가 이미 그 아래에 있다)
 */
async function requestReconnectInvitation() {
  try {
    return await createCoupleInvitation()
  } catch (error) {
    console.error(
      '재결합 초대 코드를 발급하지 못했습니다:',
      error,
    )

    return null
  }
}

/**
 * 재연결 코드.
 *
 * 상대가 나가면 방은 INACTIVE 로 남지만 room_code 는 그대로 살아 있고,
 * 나간 쪽이 POST /couples/reconnect 에 그 코드를 넣으면 이 방으로 돌아온다.
 * (그 경로는 만료도 보지 않는다)
 *
 * 코드를 얻는 순서
 *   1) 이 기기에 보관해 둔 값 — 방을 만들었거나 코드로 참여했다면 여기 있다
 *   2) 없으면 서버에 발급을 요청한다
 *
 * 2번은 지금 백엔드에서 409 로 떨어진다. (requestReconnectInvitation 주석 참고)
 * 그래도 이 경로를 남겨두는 이유는, 백엔드가 풀리는 순간 프론트를 고치지 않아도
 * 버튼이 그대로 동작하기 때문이다. 실패하면 null 을 돌려주고 호출한 쪽이 안내한다.
 *
 * @param {number|null} ownerUserId 발급받은 코드를 이 계정 것으로 표시해 둔다
 * @returns {Promise<string|null>}
 */
export async function resolveReconnectRoomCode(
  ownerUserId = null,
) {
  const storedRoom =
    getPendingCoupleRoom()

  if (storedRoom?.roomCode) {
    return storedRoom.roomCode
  }

  const invitation =
    await requestReconnectInvitation()

  if (!invitation?.invitationCode) {
    return null
  }

  savePendingCoupleRoom(
    invitation,
    ownerUserId,
  )

  return invitation.invitationCode
}

export async function getMyPageProfile() {
  const [
    userResponse,
    fetchedServerRoom,
    profileImages,
  ] = await Promise.all([
    getMyProfile(),
    getMyCoupleRoom(),
    /*
     * 커플 연결 화면에 두 사람의 프로필 원을 나란히 보여주려면
     * 상대방 사진이 필요하다. 연결 전이면 partner* 가 비어 오고,
     * 이 요청이 실패해도 마이페이지 전체가 막히면 안 되므로 삼킨다.
     */
    getProfileImages().catch(() => null),
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
   * INACTIVE 방을 보유한 사용자는 이미 기존 커플방에 속해 있다.
   * 여기서 신규 초대 API를 자동 호출하면 백엔드의 중복 커플 방지
   * 정책에 의해 ALREADY_COUPLED 오류가 발생하므로, 조회된 기존 방을
   * 그대로 사용한다. 로컬에 보관된 기존 방 정보는 아래 병합 과정에서
   * 유지된다.
   *
   * 보관 중인 방 코드를 지우지 않는 것이 중요하다.
   * CoupleRoom.deactivate() 는 room_code 를 건드리지 않아 방이 만들어질 때
   * 쓰던 코드가 서버에 그대로 남아 있고, 나간 연인은 POST /couples/reconnect
   * 에 그 코드를 넣어 이 방으로 돌아온다. 이 코드가 재연결 수단이다.
   * (다른 방의 코드가 남아 있는 경우는 saveCurrentCoupleRoom 이 roomId 를
   *  비교해서 걸러낸다)
   */

  /*
   * 연결된 두 사람 중 상대방이 나가면 백엔드는 기존 방을 INACTIVE로
   * 전환하여 room-id/status 조회에서 제외합니다. 남은 사용자는 기존
   * ACTIVE 방을 로컬에 보관하고 있으므로 새 초대 코드를 자동 발급해
   * WAITING 화면으로 전환합니다.
   */
  if (
    !serverRoom &&
    storedRoomBelongsToUser &&
    storedRoom?.roomStatus === 'ACTIVE'
  ) {
    const invitation =
      await requestReconnectInvitation()

    if (invitation) {
      serverRoom =
        savePendingCoupleRoom(
          invitation,
          userResponse.userId,
        )
    }
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

  let coupleStartDate = null
  if (currentRoom) {
    try {
      coupleStartDate =
        await getCoupleStartDate()
    } catch {
      // 시작일 조회 실패만으로 마이페이지 전체를 오류 화면으로 바꾸지 않는다.
    }
  }

  const profile = mapMyPageResponse({
    userResponse,
    roomResponse: currentRoom
      ? {
          ...currentRoom,
          datingStartDate:
            coupleStartDate?.datingStartDate ??
            null,
        }
      : null,
    memberResponse: currentRoom
      ? {
          roomId: currentRoom.roomId,
          userId: userResponse.userId,
          status: 'ACTIVE',
        }
      : null,
  })

  let partner = null
  let partnerStatus = null
  if (profile.isCoupleConnected) {
    const [partnerResult, statusResult] = await Promise.allSettled([
      getPartnerNickname(),
      getPartnerStatusMessage(),
    ])
    if (partnerResult.status === 'fulfilled') partner = partnerResult.value
    if (statusResult.status === 'fulfilled') partnerStatus = statusResult.value
  }

  /*
   * user.profile_image_url 은 인증이 필요한 /uploads/... 경로다.
   * <img src> 에 그대로 걸면 401 이 나므로 화면에 걸 수 있는 형태로 바꿔서 넘긴다.
   */
  return {
    ...profile,
    partnerNickname:
      partner?.partnerNickname ??
      profile.partnerNickname,
    partnerStatusMessage:
      partnerStatus?.statusMessage ?? '',
    profileImageUrl:
      profileImages?.myProfileImageUrl ??
      (await resolveProtectedImageUrl(
        profile.profileImageUrl,
      )) ??
      '',
    partnerProfileImageUrl:
      profileImages?.partnerProfileImageUrl ??
      '',
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

  if (trimmedNickname.length > 8) {
    throw new Error(
      '닉네임은 8자 이하로 입력해주세요.',
    )
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
    trimmedPartnerNickname.length > 8
  ) {
    throw new Error(
      '연인 애칭은 8자 이하로 입력해주세요.',
    )
  }

  await updatePartnerNicknameOnServer(
    trimmedPartnerNickname,
  )

  return getMyPageProfile()
}

export async function regenerateRoomCode() {
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
  await disconnectCouple()
  clearPendingCoupleRoom()
  // 방이 바뀌었으니 캐시해 둔 roomId 를 버린다. (안 그러면 끝난 방을 계속 조회한다)
  invalidateCoupleRoom()

  return null
}

export async function logoutCurrentUser() {
  await logout()
}

export async function withdrawCurrentUser() {
  await withdrawMyAccount()
  clearPendingCoupleRoom()
  invalidateCoupleRoom()

  return null
}
