import {
  MOCK_ALBUM_PHOTO_RESPONSES,
  MOCK_CHAT_PHOTO_RESPONSES,
} from '../data/albumMockData.js'

import {
  mapAlbumPhotoResponse,
  mapAlbumPhotoResponses,
  mapChatPhotoResponses,
} from '../mappers/albumMapper.js'

const MOCK_DELAY = 250
const MOCK_CURRENT_USER_ID = 1

let mockAlbumPhotos = [
  ...MOCK_ALBUM_PHOTO_RESPONSES,
]

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
          '사진 파일을 불러오지 못했습니다.',
        ),
      )
    }

    reader.readAsDataURL(file)
  })
}

export async function getAlbumPhotos(
  coupleRoomId,
) {
  await wait()

  const responses = mockAlbumPhotos
    .filter(
      (photo) =>
        photo.couple_room_id === coupleRoomId,
    )
    .sort(
      (firstPhoto, secondPhoto) =>
        new Date(secondPhoto.created_at) -
        new Date(firstPhoto.created_at),
    )

  return mapAlbumPhotoResponses(responses)
}

export async function getChatPhotos(
  coupleRoomId,
) {
  await wait()

  const responses = MOCK_CHAT_PHOTO_RESPONSES
    .filter(
      (message) =>
        message.couple_room_id ===
          coupleRoomId &&
        message.message_type === 'IMAGE',
    )
    .sort(
      (firstMessage, secondMessage) =>
        new Date(secondMessage.send_at) -
        new Date(firstMessage.send_at),
    )

  return mapChatPhotoResponses(responses)
}

export async function uploadAlbumPhoto({
  coupleRoomId,
  file,
  memo = '',
}) {
  await wait()

  if (!file) {
    throw new Error(
      '업로드할 사진을 선택해주세요.',
    )
  }

  const imageUrl = await readFileAsDataUrl(file)
  const now = new Date().toISOString()

  const response = {
    photo_id: Date.now(),
    user_id: MOCK_CURRENT_USER_ID,
    couple_room_id: coupleRoomId,
    image_url: imageUrl,
    memo: memo.trim(),
    created_at: now,
    updated_at: now,
  }

  mockAlbumPhotos = [
    response,
    ...mockAlbumPhotos,
  ]

  return mapAlbumPhotoResponse(response)
}

export async function updateAlbumPhotoMemo(
  photoId,
  memo,
) {
  await wait()

  let updatedResponse = null

  mockAlbumPhotos = mockAlbumPhotos.map(
    (photo) => {
      if (photo.photo_id !== photoId) {
        return photo
      }

      updatedResponse = {
        ...photo,
        memo: memo.trim(),
        updated_at: new Date().toISOString(),
      }

      return updatedResponse
    },
  )

  if (!updatedResponse) {
    throw new Error(
      '수정할 사진을 찾을 수 없습니다.',
    )
  }

  return mapAlbumPhotoResponse(updatedResponse)
}

export async function deleteAlbumPhoto(photoId) {
  await wait()

  const hasPhoto = mockAlbumPhotos.some(
    (photo) => photo.photo_id === photoId,
  )

  if (!hasPhoto) {
    throw new Error(
      '삭제할 사진을 찾을 수 없습니다.',
    )
  }

  mockAlbumPhotos = mockAlbumPhotos.filter(
    (photo) => photo.photo_id !== photoId,
  )
}