function getFirstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null,
  )
}

function checkRoomCodeExpired(
  roomCodeExpiresAt,
) {
  if (!roomCodeExpiresAt) {
    return false
  }

  const expirationTime =
    new Date(roomCodeExpiresAt).getTime()

  if (Number.isNaN(expirationTime)) {
    return false
  }

  return expirationTime <= Date.now()
}

export function mapMyPageResponse({
  userResponse,
  roomResponse = null,
  memberResponse = null,
}) {
  const userId = getFirstValue(
    userResponse.userId,
    userResponse.user_id,
  )

  const userStatus = getFirstValue(
    userResponse.status,
    'ACTIVE',
  )

  const roomId = roomResponse
    ? getFirstValue(
        roomResponse.roomId,
        roomResponse.room_id,
      )
    : null

  const roomStatus = roomResponse
    ? getFirstValue(
        roomResponse.roomStatus,
        roomResponse.status,
        null,
      )
    : null

  const memberStatus = memberResponse
    ? getFirstValue(
        memberResponse.memberStatus,
        memberResponse.status,
        null,
      )
    : null

  const roomCodeExpiresAt = roomResponse
    ? getFirstValue(
        roomResponse.roomCodeExpiresAt,
        roomResponse.room_code_expires_at,
        null,
      )
    : null

  const hasRoom =
    Boolean(roomId) &&
    memberStatus === 'ACTIVE'

  const isCoupleConnected =
    hasRoom && roomStatus === 'ACTIVE'

  const isWaitingForPartner =
    hasRoom &&
    (roomStatus === 'WAITING' || roomStatus === 'INACTIVE')

  return {
    userId,

    email: userResponse.email ?? '',

    nickname: getFirstValue(
      userResponse.nickname,
      '사용자',
    ),

    birth: getFirstValue(
      userResponse.birth,
      null,
    ),

    profileImageUrl: getFirstValue(
      userResponse.profileImageUrl,
      userResponse.profile_image_url,
      '',
    ),

    statusMessage: getFirstValue(
      userResponse.statusMessage,
      userResponse.status_message,
      '',
    ),

    userStatus,

    createdAt: getFirstValue(
      userResponse.createdAt,
      userResponse.created_at,
      null,
    ),

    updatedAt: getFirstValue(
      userResponse.updatedAt,
      userResponse.updated_at,
      null,
    ),

    deletedAt: getFirstValue(
      userResponse.deletedAt,
      userResponse.deleted_at,
      null,
    ),

    isEmailVerified: Boolean(
      getFirstValue(
        userResponse.isEmailVerified,
        userResponse.is_email_verified,
        false,
      ),
    ),

    roomId,

    roomCode: roomResponse
      ? getFirstValue(
          roomResponse.roomCode,
          roomResponse.room_code,
          '',
        )
      : '',

    roomCodeExpiresAt,

    roomStartedAt: roomResponse
      ? getFirstValue(
          roomResponse.datingStartDate,
          roomResponse.dating_start_date,
          roomResponse.startedAt,
          roomResponse.started_at,
          null,
        )
      : null,

    roomStatus,

    roomCreatedAt: roomResponse
      ? getFirstValue(
          roomResponse.createdAt,
          roomResponse.created_at,
          null,
        )
      : null,

    roomUpdatedAt: roomResponse
      ? getFirstValue(
          roomResponse.updatedAt,
          roomResponse.updated_at,
          null,
        )
      : null,

    roomEndedAt: roomResponse
      ? getFirstValue(
          roomResponse.endedAt,
          roomResponse.ended_at,
          null,
        )
      : null,

    partnerNickname: memberResponse
      ? getFirstValue(
          memberResponse.partnerNickname,
          memberResponse.partner_nickname,
          '',
        )
      : '',

    alarmTime: memberResponse
      ? getFirstValue(
          memberResponse.alarmTime,
          memberResponse.alarm_time,
          null,
        )
      : null,

    memberStatus,

    joinedAt: memberResponse
      ? getFirstValue(
          memberResponse.joinedAt,
          memberResponse.joined_at,
          null,
        )
      : null,

    leftAt: memberResponse
      ? getFirstValue(
          memberResponse.leftAt,
          memberResponse.left_at,
          null,
        )
      : null,

    hasRoom,
    isCoupleConnected,
    isWaitingForPartner,

    isRoomCodeExpired:
      checkRoomCodeExpired(
        roomCodeExpiresAt,
      ),
  }
}

/*
 * Spring 응답 구조를 화면 데이터로 변환합니다.
 *
 * 다음 응답 구조를 모두 지원합니다.
 *
 * {
 *   user: {},
 *   room: {},
 *   member: {}
 * }
 *
 * 또는
 *
 * {
 *   data: {
 *     user: {},
 *     room: {},
 *     member: {}
 *   }
 * }
 */
export function mapMyPageApiPayload(payload) {
  const responseData =
    payload?.data ?? payload ?? {}

  return mapMyPageResponse({
    userResponse:
      responseData.user ??
      responseData.appUser ??
      responseData.app_user ??
      responseData.profile ??
      {},

    roomResponse:
      responseData.room ??
      responseData.coupleRoom ??
      responseData.couple_room ??
      null,

    memberResponse:
      responseData.member ??
      responseData.coupleMember ??
      responseData.couple_member ??
      null,
  })
}
