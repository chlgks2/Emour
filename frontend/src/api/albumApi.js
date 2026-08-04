import {
  MOCK_ALBUM_PHOTO_RESPONSE,
  MOCK_CHAT_IMAGE_RESPONSE,
} from '../data/albumMockData.js'

import {
  mapAlbumPageResponse,
  mapAlbumPhoto,
} from '../mappers/albumMapper.js'

import {
  apiRequest,
} from './httpClient.js'

import {
  resolveProtectedImageUrl,
} from '../utils/protectedImageUrl.js'

import {
  getChatMessages,
} from './chatApi.js'

import {
  resolveRoomId,
} from './coupleRoomContext.js'

const USE_MOCK_API =
  import.meta.env
    .VITE_USE_ALBUM_MOCK_API === 'true'

const MOCK_DELAY = 250

/*
 * 실제 Spring API 주소가 정해지면
 * ENDPOINTS만 수정하면 됩니다.
 */
const ENDPOINTS = {
  albumPhotos: '/photos',

  uploadAlbumPhoto: '/photos',

  deleteAlbumPhoto:
    (photoId) =>
      `/photos/${photoId}`,

  deleteChatPhoto:
    (imageId) =>
      `/chats/images/${imageId}`,

  updateAlbumPhotoMemo:
    (photoId) =>
      `/photos/${photoId}/memo`,
}

let mockAlbumPhotoResponse =
  MOCK_ALBUM_PHOTO_RESPONSE.map(
    (photo) => ({
      ...photo,
    }),
  )

let mockChatImageResponse =
  MOCK_CHAT_IMAGE_RESPONSE.map(
    (photo) => ({
      ...photo,
    }),
  )

function wait(
  milliseconds = MOCK_DELAY,
) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function readFileAsDataUrl(file) {
  return new Promise(
    (resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        resolve(reader.result)
      }

      reader.onerror = () => {
        reject(
          new Error(
            '사진을 불러오지 못했습니다.',
          ),
        )
      }

      reader.readAsDataURL(file)
    },
  )
}

function extractArray(
  payload,
  candidateKeys,
) {
  const responseData =
    payload?.data ?? payload ?? []

  if (Array.isArray(responseData)) {
    return responseData
  }

  for (const key of candidateKeys) {
    if (
      Array.isArray(
        responseData[key],
      )
    ) {
      return responseData[key]
    }
  }

  return []
}

function createMappedMockResponse() {
  return mapAlbumPageResponse({
    albumPhotosResponse:
      mockAlbumPhotoResponse,

    chatPhotosResponse:
      mockChatImageResponse,
  })
}

async function attachProtectedImageUrl(
  photo,
) {
  if (!photo?.imageUrl) {
    return photo
  }

  return {
    ...photo,
    imageUrl:
      await resolveProtectedImageUrl(
        photo.imageUrl,
      ),
  }
}

async function attachProtectedImageUrls(
  response,
) {
  // 채팅 사진도 같은 /uploads/ 경로라 앨범 사진과 같은 변환이 필요하다.
  const [albumPhotos, chatPhotos] =
    await Promise.all([
      Promise.all(
        (response.albumPhotos ?? []).map(
          attachProtectedImageUrl,
        ),
      ),
      Promise.all(
        (response.chatPhotos ?? []).map(
          attachProtectedImageUrl,
        ),
      ),
    ])

  return {
    ...response,
    albumPhotos,
    chatPhotos,
  }
}

/*
 * 채팅으로 주고받은 사진.
 *
 * ⚠️ 이 사진들을 한 번에 주는 엔드포인트가 없다.
 *    ChatImageController(/chats/images)는 POST(업로드)만 있고 목록 조회가 없다.
 *    (backend .../chat/controller/ChatImageController.java)
 *    그래서 대화 목록(GET /chats)을 커서로 거슬러 올라가며 message.images 를 모은다.
 *
 *    앨범은 "지금까지 주고받은 사진 전부"를 보여주는 곳이라 끝까지 거슬러 올라간다.
 *    대화가 길면 그만큼 요청이 늘어난다. (100건씩)
 *    CHAT_IMAGE_PAGE_LIMIT 은 커서가 고장 났을 때 무한히 도는 것만 막는 안전장치이고,
 *    정상 동작에서는 hasNext 가 false 가 되는 지점에서 멈춘다.
 *    ↳ 백엔드에 GET /chats/images 가 생기면 이 함수만 갈아끼우면 된다.
 */
const CHAT_IMAGE_PAGE_SIZE = 100
const CHAT_IMAGE_PAGE_LIMIT = 500

/** 채팅 메시지 한 건 -> 앨범 매퍼가 아는 채팅 사진 배열 */
function toChatPhotoResponses(message) {
  const images = Array.isArray(message?.images)
    ? message.images
    : []

  return images
    .map((image, order) => {
      const imageUrl =
        typeof image === 'string'
          ? image
          : image?.imageUrl ??
            image?.image_url

      if (!imageUrl) {
        return null
      }

      return {
        // imageId 가 없으면 메시지+순번으로 고유 키를 만든다
        imageId:
          image?.imageId ??
          image?.image_id ??
          `${message.messageId}-${order}`,
        messageId: message.messageId,
        senderId: message.senderId,
        imageUrl,
        displayOrder:
          image?.displayOrder ??
          image?.display_order ??
          order,
        createdAt: message.sentAt,
        deletedAt:
          image?.deletedAt ??
          image?.deleted_at ??
          null,
      }
    })
    .filter(Boolean)
}

/**
 * 대화에서 사진을 모은다.
 * @param {number} maxPages 거슬러 올라갈 페이지 수 (기본: 끝까지)
 */
export async function collectChatPhotos(
  maxPages = CHAT_IMAGE_PAGE_LIMIT,
) {
  const roomId = await resolveRoomId()

  if (!roomId) {
    return []
  }

  const collected = []
  const visitedCursors = new Set()
  let beforeMessageId = null

  const pageLimit = Math.min(
    maxPages,
    CHAT_IMAGE_PAGE_LIMIT,
  )

  for (
    let page = 0;
    page < pageLimit;
    page += 1
  ) {
    let response

    try {
      response = await getChatMessages({
        roomId,
        beforeMessageId,
        size: CHAT_IMAGE_PAGE_SIZE,
      })
    } catch {
      // 한 페이지가 실패해도 지금까지 모은 것은 보여준다.
      break
    }

    const messages =
      response?.messages ?? []

    messages.forEach((message) => {
      collected.push(
        ...toChatPhotoResponses(message),
      )
    })

    const nextCursor = response?.hasNext
      ? response.nextCursor
      : null

    if (
      !nextCursor ||
      visitedCursors.has(nextCursor)
    ) {
      break
    }

    visitedCursors.add(nextCursor)
    beforeMessageId = nextCursor
  }

  return collected
}

/**
 * @param {object} [options]
 * @param {number} [options.chatPhotoPages]
 *   대화를 몇 페이지까지 거슬러 올라가 사진을 모을지.
 *   앨범(전체 목록)은 기본값(끝까지)을 그대로 쓰고, 최근 몇 장만 필요한 화면
 *   (대시보드 '최근에 찍은 사진')은 1 을 넘겨 요청을 한 번으로 줄인다.
 */
export async function getAlbumPhotos({
  chatPhotoPages = CHAT_IMAGE_PAGE_LIMIT,
} = {}) {
  if (USE_MOCK_API) {
    await wait()

    return createMappedMockResponse()
  }

  const [
    albumPhotoPayload,
    chatPhotosResponse,
  ] = await Promise.all([
    apiRequest(ENDPOINTS.albumPhotos),
    // 채팅 사진이 없어도 앨범은 떠야 한다.
    collectChatPhotos(
      chatPhotoPages,
    ).catch(() => []),
  ])

  const mappedResponse =
    mapAlbumPageResponse({
    albumPhotosResponse:
      extractArray(
        albumPhotoPayload,
        [
          'photos',
          'albumPhotos',
          'album_photos',
        ],
      ),

    chatPhotosResponse,
  })

  return attachProtectedImageUrls(
    mappedResponse,
  )
}

export async function uploadAlbumPhoto({
  file,
  memo = '',
}) {
  if (!file) {
    throw new Error(
      '추가할 사진을 선택해주세요.',
    )
  }

  if (USE_MOCK_API) {
    await wait()

    const imageUrl =
      await readFileAsDataUrl(file)

    const nextPhotoId =
      mockAlbumPhotoResponse.reduce(
        (largestId, photo) =>
          Math.max(
            largestId,
            Number(photo.photo_id),
          ),
        0,
      ) + 1

    const now =
      new Date().toISOString()

    const createdPhoto = {
      photo_id: nextPhotoId,
      room_id: 1,
      uploader_id: 1,
      image_url: imageUrl,
      memo: memo.trim(),
      created_at: now,
      updated_at: now,
    }

    mockAlbumPhotoResponse = [
      createdPhoto,
      ...mockAlbumPhotoResponse,
    ]

    return mapAlbumPhoto(
      createdPhoto,
    )
  }

  const formData = new FormData()

  formData.append(
    'file',
    file,
  )

  formData.append(
    'memo',
    memo.trim(),
  )

  const response = await apiRequest(
    ENDPOINTS.uploadAlbumPhoto,
    {
      method: 'POST',
      body: formData,
    },
  )

  const responseData =
    response?.data ??
    response?.photo ??
    response

  return attachProtectedImageUrl(
    mapAlbumPhoto(
      responseData,
    ),
  )
}

export async function deleteAlbumPhoto(
  photoId,
) {
  if (!photoId) {
    throw new Error(
      '삭제할 앨범 사진 정보가 없습니다.',
    )
  }

  if (USE_MOCK_API) {
    await wait()

    const exists =
      mockAlbumPhotoResponse.some(
        (photo) =>
          Number(photo.photo_id) ===
          Number(photoId),
      )

    if (!exists) {
      throw new Error(
        '앨범 사진을 찾을 수 없습니다.',
      )
    }

    mockAlbumPhotoResponse =
      mockAlbumPhotoResponse.filter(
        (photo) =>
          Number(photo.photo_id) !==
          Number(photoId),
      )

    return
  }

  await apiRequest(
    ENDPOINTS.deleteAlbumPhoto(
      photoId,
    ),
    {
      method: 'DELETE',
    },
  )
}

export async function deleteChatPhoto(
  imageId,
) {
  if (!imageId) {
    throw new Error(
      '삭제할 채팅 사진 정보가 없습니다.',
    )
  }

  if (USE_MOCK_API) {
    await wait()

    const exists =
      mockChatImageResponse.some(
        (photo) =>
          Number(photo.image_id) ===
          Number(imageId),
      )

    if (!exists) {
      throw new Error(
        '채팅 사진을 찾을 수 없습니다.',
      )
    }

    /*
     * 실제 DB 행처럼 삭제 상태를 남깁니다.
     * 앨범 Mapper에서는 삭제된 사진을 제외합니다.
     */
    mockChatImageResponse =
      mockChatImageResponse.map(
        (photo) => {
          if (
            Number(photo.image_id) !==
            Number(imageId)
          ) {
            return photo
          }

          return {
            ...photo,
            image_url: null,
            deleted_at:
              new Date().toISOString(),
          }
        },
      )

    return
  }

  return apiRequest(
    ENDPOINTS.deleteChatPhoto(
      imageId,
    ),
    {
      method: 'DELETE',
    },
  )
}

export async function updateAlbumPhotoMemo({
  photoId,
  memo = '',
}) {
  if (!photoId) {
    throw new Error(
      '수정할 앨범 사진 정보가 없습니다.',
    )
  }

  const response = await apiRequest(
    ENDPOINTS.updateAlbumPhotoMemo(
      photoId,
    ),
    {
      method: 'PATCH',
      body: {
        memo: memo.trim(),
      },
    },
  )

  return mapAlbumPhoto(
    response?.data ?? response,
  )
}
