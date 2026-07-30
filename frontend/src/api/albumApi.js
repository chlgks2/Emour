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

const USE_MOCK_API =
  import.meta.env.VITE_USE_MOCK_API !==
  'false'

const MOCK_DELAY = 250

/*
 * 실제 Spring API 주소가 정해지면
 * ENDPOINTS만 수정하면 됩니다.
 */
const ENDPOINTS = {
  albumPhotos:
    '/api/albums/me/photos',

  chatPhotos:
    '/api/albums/me/chat-images',

  uploadAlbumPhoto:
    '/api/album-photos',

  deleteAlbumPhoto:
    (photoId) =>
      `/api/album-photos/${photoId}`,

  deleteChatPhoto:
    (imageId) =>
      `/api/chat-images/${imageId}`,
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

export async function getAlbumPhotos() {
  if (USE_MOCK_API) {
    await wait()

    return createMappedMockResponse()
  }

  const [
    albumPhotoPayload,
    chatPhotoPayload,
  ] = await Promise.all([
    apiRequest(
      ENDPOINTS.albumPhotos,
    ),

    apiRequest(
      ENDPOINTS.chatPhotos,
    ),
  ])

  return mapAlbumPageResponse({
    albumPhotosResponse:
      extractArray(
        albumPhotoPayload,
        [
          'photos',
          'albumPhotos',
          'album_photos',
        ],
      ),

    chatPhotosResponse:
      extractArray(
        chatPhotoPayload,
        [
          'images',
          'chatPhotos',
          'chatImages',
          'chat_images',
        ],
      ),
  })
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
    'image',
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

  return mapAlbumPhoto(
    responseData,
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

  await apiRequest(
    ENDPOINTS.deleteChatPhoto(
      imageId,
    ),
    {
      method: 'DELETE',
    },
  )
}