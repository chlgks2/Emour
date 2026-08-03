import { apiRequest } from './httpClient.js'

const AUTH_ENDPOINTS = {
  signUp: '/auth/signup',
  login: '/auth/login',
  logout: '/auth/logout',
  emailCheck: '/auth/email-check',
  sendEmailCode: '/auth/email/send',
  verifyEmailCode: '/auth/email/verify',
  sendPasswordResetCode:
    '/auth/password/email',
  verifyPasswordResetCode:
    '/auth/password/verify',
  resetPassword: '/auth/password',
}

export async function signUp({
  email,
  password,
  nickname,
}) {
  const response = await apiRequest(
    AUTH_ENDPOINTS.signUp,
    {
      method: 'POST',
      body: {
        email,
        password,
        nickname,
      },
      skipAuth: true,
    },
  )

  return response?.data ?? null
}

export async function login({
  email,
  password,
}) {
  const query = new URLSearchParams({
    email: email.trim(),
    password,
  })

  const response = await apiRequest(
    `${AUTH_ENDPOINTS.login}?${query.toString()}`,
    {
      method: 'POST',
      skipAuth: true,
    },
  )

  const loginData = response?.data

  if (
    !loginData?.accessToken ||
    !loginData?.refreshToken
  ) {
    throw new Error(
      '로그인 응답에 인증 토큰이 없습니다.',
    )
  }

  localStorage.setItem(
    'accessToken',
    loginData.accessToken,
  )
  localStorage.setItem(
    'refreshToken',
    loginData.refreshToken,
  )
  localStorage.setItem(
    'currentUser',
    JSON.stringify(loginData),
  )

  return loginData
}

export async function logout() {
  try {
    await apiRequest(
      AUTH_ENDPOINTS.logout,
      {
        method: 'POST',
      },
    )
  } finally {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('currentUser')
  }
}

export async function checkEmailDuplicate(email) {
  const available =
    await checkEmailAvailability(email)

  return { available }
}

export function isAuthenticated() {
  return Boolean(
    localStorage.getItem('accessToken'),
  )
}

export function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem('currentUser'),
    )
  } catch {
    return null
  }
}

/**
 * 로그인 시점에 받아둔 세션 캐시를 최신 값으로 덮어쓴다.
 *
 * 이 캐시는 로그인할 때 한 번 저장되고 끝이라, 마이페이지에서 닉네임이나
 * 프로필 사진을 바꿔도 예전 값이 그대로 남아 있었다.
 * 프로필을 수정한 쪽에서 이 함수를 불러 서버 값과 맞춰준다.
 */
export function updateCurrentUserCache(changes) {
  const currentUser = getCurrentUser()

  if (!currentUser || !changes) {
    return currentUser
  }

  const nextUser = { ...currentUser, ...changes }

  localStorage.setItem(
    'currentUser',
    JSON.stringify(nextUser),
  )

  return nextUser
}

export async function loginWithSocial() {
  throw new Error(
    '소셜 로그인은 아직 지원하지 않습니다.',
  )
}

export async function checkEmailAvailability(
  email,
) {
  const query = new URLSearchParams({
    email: email.trim(),
  })

  const response = await apiRequest(
    `${AUTH_ENDPOINTS.emailCheck}?${query.toString()}`,
    {
      skipAuth: true,
    },
  )

  return Boolean(response?.data?.available)
}

export async function sendEmailCode(email) {
  return apiRequest(
    AUTH_ENDPOINTS.sendEmailCode,
    {
      method: 'POST',
      body: {
        email: email.trim(),
      },
      skipAuth: true,
    },
  )
}

export async function verifyEmailCode({
  email,
  code,
}) {
  return apiRequest(
    AUTH_ENDPOINTS.verifyEmailCode,
    {
      method: 'POST',
      body: {
        email: email.trim(),
        code: code.trim(),
      },
      skipAuth: true,
    },
  )
}

export async function sendPasswordResetCode(
  email,
) {
  return apiRequest(
    AUTH_ENDPOINTS.sendPasswordResetCode,
    {
      method: 'POST',
      body: {
        email: email.trim(),
      },
      skipAuth: true,
    },
  )
}

export async function verifyPasswordResetCode({
  email,
  code,
}) {
  return apiRequest(
    AUTH_ENDPOINTS.verifyPasswordResetCode,
    {
      method: 'POST',
      body: {
        email: email.trim(),
        code: code.trim(),
      },
      skipAuth: true,
    },
  )
}

export async function resetPassword({
  email,
  code,
  newPassword,
}) {
  return apiRequest(
    AUTH_ENDPOINTS.resetPassword,
    {
      method: 'PATCH',
      body: {
        email: email.trim(),
        code: code.trim(),
        newPassword,
      },
      skipAuth: true,
    },
  )
}
