export const PHOTO_SOURCE = {
  ALBUM: 'ALBUM',
  CHAT: 'CHAT',
}

function getFirstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null,
  )
}

export function mapAlbumPhotoResponse(response) {
  const photoId = getFirstValue(
    response.photoId,
    response.photo_id,
  )

  return {
    id: `album-${photoId}`,
    resourceId: photoId,
    source: PHOTO_SOURCE.ALBUM,

    userId: getFirstValue(
      response.userId,
      response.user_id,
    ),

    coupleRoomId: getFirstValue(
      response.coupleRoomId,
      response.couple_room_id,
    ),

    imageUrl: getFirstValue(
      response.imageUrl,
      response.image_url,
    ),

    memo: response.memo ?? '',

    createdAt: getFirstValue(
      response.createdAt,
      response.created_at,
    ),

    updatedAt: getFirstValue(
      response.updatedAt,
      response.updated_at,
    ),

    canEditMemo: getFirstValue(
      response.canEditMemo,
      response.can_edit_memo,
      true,
    ),

    canDelete: getFirstValue(
      response.canDelete,
      response.can_delete,
      true,
    ),
  }
}

export function mapChatPhotoResponse(response) {
  const messageId = getFirstValue(
    response.messageId,
    response.message_id,
  )

  return {
    id: `chat-${messageId}`,
    resourceId: messageId,
    source: PHOTO_SOURCE.CHAT,

    userId: getFirstValue(
      response.userId,
      response.user_id,
    ),

    coupleRoomId: getFirstValue(
      response.coupleRoomId,
      response.couple_room_id,
    ),

    imageUrl: getFirstValue(
      response.imageUrl,
      response.image_url,
      response.content,
    ),

    memo: '',

    createdAt: getFirstValue(
      response.sendAt,
      response.send_at,
    ),

    updatedAt: null,

    canEditMemo: false,
    canDelete: false,
  }
}

export function mapAlbumPhotoResponses(
  responses = [],
) {
  return responses.map(mapAlbumPhotoResponse)
}

export function mapChatPhotoResponses(
  responses = [],
) {
  return responses.map(mapChatPhotoResponse)
}