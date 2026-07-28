import {
  MOCK_MY_PAGE_COUPLE_MEMBER_RESPONSE,
  MOCK_MY_PAGE_USER_RESPONSE,
} from '../data/myPageMockData.js'

import {
  mapMyPageResponse,
} from '../mappers/myPageMapper.js'

const MOCK_DELAY = 250

let mockUserResponse = {
  ...MOCK_MY_PAGE_USER_RESPONSE,
}

let mockCoupleMemberResponse = {
  ...MOCK_MY_PAGE_COUPLE_MEMBER_RESPONSE,
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

function createMappedMyPageResponse() {
  return mapMyPageResponse({
    userResponse: mockUserResponse,
    coupleMemberResponse:
      mockCoupleMemberResponse,
  })
}

export async function getMyPageProfile() {
  await wait()

  return createMappedMyPageResponse()
}

export async function updateMyPageProfile({
  nickname,
  statusMessage,
  profileImageFile,
}) {
  await wait()

  const trimmedNickname = nickname.trim()
  const trimmedStatusMessage =
    statusMessage.trim()

  if (!trimmedNickname) {
    throw new Error(
      '닉네임을 입력해주세요.',
    )
  }

  let profileImageUrl =
    mockUserResponse.profile_img_url

  if (profileImageFile) {
    profileImageUrl =
      await readFileAsDataUrl(
        profileImageFile,
      )
  }

  mockUserResponse = {
    ...mockUserResponse,
    nickname: trimmedNickname,
    status_msg: trimmedStatusMessage,
    profile_img_url: profileImageUrl,
    updated_at: new Date().toISOString(),
  }

  return createMappedMyPageResponse()
}

export async function logoutCurrentUser() {
  await wait()

  /*
   * 실제 백엔드 연결 후:
   *
   * POST /api/auth/logout
   *
   * 로그아웃 성공 후
   * access token과 사용자 상태를 제거하고
   * 로그인 화면으로 이동합니다.
   */
}

export async function disconnectCouple() {
  await wait()

  if (
    !mockCoupleMemberResponse ||
    mockCoupleMemberResponse.status !==
      'MATCHED'
  ) {
    throw new Error(
      '현재 연결된 연인이 없습니다.',
    )
  }

  mockCoupleMemberResponse = {
    ...mockCoupleMemberResponse,
    status: 'DISCONNECTED',
  }

  return createMappedMyPageResponse()
}

export async function deleteCurrentUser() {
  await wait()

  mockUserResponse = {
    ...mockUserResponse,
    status: 'DELETED',
    updated_at: new Date().toISOString(),
  }

  if (mockCoupleMemberResponse) {
    mockCoupleMemberResponse = {
      ...mockCoupleMemberResponse,
      status: 'DISCONNECTED',
    }
  }

  return createMappedMyPageResponse()
}