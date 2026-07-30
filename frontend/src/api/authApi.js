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
