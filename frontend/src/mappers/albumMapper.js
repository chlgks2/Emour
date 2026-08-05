function getFirstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null,
  )
}

function convertDateToTime(value) {
  if (!value) {
    return 0
  }

  const time = new Date(value).getTime()

  return Number.isNaN(time)
    ? 0
    : time
}

export function mapAlbumPhoto(
  response = {},
) {
  const photoId = getFirstValue(
    response.photoId,
    response.photo_id,
  )

  const imageUrl = getFirstValue(
    response.imageUrl,
    response.image_url,
    '',
  )

  return {
    id: `ALBUM-${photoId}`,
    resourceId: photoId,
    source: 'ALBUM',

    photoId,

    roomId: getFirstValue(
      response.roomId,
      response.room_id,
      null,
    ),

    uploaderId: getFirstValue(
      response.uploaderId,
      response.uploader_id,
      null,
    ),

    imageUrl,

    memo: getFirstValue(
      response.memo,
      '',
    ),

    createdAt: getFirstValue(
      response.createdAt,
      response.created_at,
      null,
    ),

    updatedAt: getFirstValue(
      response.updatedAt,
      response.updated_at,
      null,
    ),

    isDeleted:
      Boolean(
        getFirstValue(
          response.deleted,
          response.isDeleted,
          response.is_deleted,
          false,
        ),
      ) ||
      !imageUrl,
  }
}

export function mapChatPhoto(
  response = {},
) {
  const imageId = getFirstValue(
    response.imageId,
    response.image_id,
  )

  const imageUrl = getFirstValue(
    response.imageUrl,
    response.image_url,
    '',
  )

  const deletedAt = getFirstValue(
    response.deletedAt,
    response.deleted_at,
    null,
  )

  return {
    id: `CHAT-${imageId}`,
    resourceId: imageId,
    source: 'CHAT',

    imageId,

    messageId: getFirstValue(
      response.messageId,
      response.message_id,
      null,
    ),

    senderId: getFirstValue(
      response.senderId,
      response.sender_id,
      null,
    ),

    imageUrl,

    displayOrder: Number(
      getFirstValue(
        response.displayOrder,
        response.display_order,
        0,
      ),
    ),

    createdAt: getFirstValue(
      response.createdAt,
      response.created_at,
      null,
    ),

    deletedAt,

    isDeleted:
      Boolean(
        getFirstValue(
          response.deleted,
          response.isDeleted,
          response.is_deleted,
          false,
        ),
      ) ||
      Boolean(deletedAt) ||
      !imageUrl,
  }
}

export function mapAlbumPageResponse({
  albumPhotosResponse = [],
  chatPhotosResponse = [],
}) {
  const albumPhotos =
    albumPhotosResponse
      .map(mapAlbumPhoto)
      .filter(
        (photo) =>
          !photo.isDeleted &&
          Boolean(photo.imageUrl),
      )
      .sort(
        (firstPhoto, secondPhoto) =>
          convertDateToTime(
            secondPhoto.createdAt,
          ) -
          convertDateToTime(
            firstPhoto.createdAt,
          ),
      )

  const chatPhotos =
    chatPhotosResponse
      .map(mapChatPhoto)
      .filter(
        (photo) =>
          !photo.isDeleted &&
          Boolean(photo.imageUrl),
      )
      .sort(
        (firstPhoto, secondPhoto) =>
          convertDateToTime(
            secondPhoto.createdAt,
          ) -
          convertDateToTime(
            firstPhoto.createdAt,
          ),
      )

  return {
    albumPhotos,
    chatPhotos,
  }
}
