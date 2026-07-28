export const PHOTO_SOURCE = {
  ALBUM: 'ALBUM',
  CHAT: 'CHAT',
}

export function mapAlbumPhotoResponse(response) {
  const photoId =
    response.photoId ??
    response.photo_id

  return {
    id: `album-${photoId}`,
    resourceId: photoId,
    source: PHOTO_SOURCE.ALBUM,

    coupleRoomId:
      response.coupleRoomId ??
      response.couple_room_id,

    imageUrl:
      response.imageUrl ??
      response.image_url ??
      response.image,

    memo: response.memo ?? '',

    takenAt:
      response.takenAt ??
      response.taken_at,

    createdAt:
      response.createdAt ??
      response.created_at,

    updatedAt:
      response.updatedAt ??
      response.updated_at,

    canEditMemo: true,
    canDelete: true,
  }
}

export function mapChatPhotoResponse(response) {
  const messageId =
    response.messageId ??
    response.message_id

  return {
    id: `chat-${messageId}`,
    resourceId: messageId,
    source: PHOTO_SOURCE.CHAT,

    coupleRoomId:
      response.coupleRoomId ??
      response.couple_room_id,

    userId:
      response.userId ??
      response.user_id,

    imageUrl:
      response.imageUrl ??
      response.image_url ??
      response.content,

    memo: '',

    takenAt:
      response.sendAt ??
      response.send_at,

    createdAt:
      response.sendAt ??
      response.send_at,

    updatedAt:
      response.updatedAt ??
      response.updated_at,

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