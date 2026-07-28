function getFirstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null,
  )
}

function checkCoupleConnection(
  coupleRoomId,
  coupleStatus,
) {
  if (!coupleRoomId) {
    return false
  }

  const disconnectedStatuses = [
    'DISCONNECTED',
    'LEFT',
    'INACTIVE',
    'DELETED',
  ]

  return !disconnectedStatuses.includes(
    coupleStatus,
  )
}

export function mapMyPageResponse({
  userResponse,
  coupleMemberResponse = null,
}) {
  const userId = getFirstValue(
    userResponse.userId,
    userResponse.user_id,
  )

  const coupleRoomId = coupleMemberResponse
    ? getFirstValue(
        coupleMemberResponse.coupleRoomId,
        coupleMemberResponse.couple_room_id,
      )
    : null

  const coupleStatus = coupleMemberResponse
    ? getFirstValue(
        coupleMemberResponse.status,
        null,
      )
    : null

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
      userResponse.profile_img_url,
      '',
    ),

    statusMessage: getFirstValue(
      userResponse.statusMessage,
      userResponse.status_msg,
      '',
    ),

    userStatus: getFirstValue(
      userResponse.status,
      'ACTIVE',
    ),

    createdAt: getFirstValue(
      userResponse.createdAt,
      userResponse.created_at,
    ),

    updatedAt: getFirstValue(
      userResponse.updatedAt,
      userResponse.updated_at,
    ),

    coupleRoomId,

    partnerNickname: coupleMemberResponse
      ? getFirstValue(
          coupleMemberResponse.partnerNickname,
          coupleMemberResponse.partner_nick,
          '',
        )
      : '',

    coupleStatus,

    matchedAt: coupleMemberResponse
      ? getFirstValue(
          coupleMemberResponse.matchedAt,
          coupleMemberResponse.matched_at,
        )
      : null,

    isCoupleConnected:
      checkCoupleConnection(
        coupleRoomId,
        coupleStatus,
      ),
  }
}