import {
  notifyLiveSync,
} from '../utils/liveSync.js'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/$/, '')

function getAccessToken() {
  return localStorage.getItem('accessToken')
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

/**
 * 세션을 끝낸다.
 *
 * 예전에는 토큰 두 개만 지웠다. 그런데 로그인 여부는 accessToken 이 있는지로
 * 판단하면서(authApi.isAuthenticated) 화면에 보이는 사용자 정보는 currentUser
 * 에서 읽는다. 토큰만 지우면 currentUser 가 남아 어중간한 상태가 된다.
 *
 * 더 중요한 건 React 쪽이다. AuthProvider 는 첫 렌더에 localStorage 를 한 번만
 * 읽고 그 값을 상태로 들고 있어서, 여기서 저장소를 비워도 앱은 여전히
 * "로그인됨" 으로 동작했다. 토큰이 죽은 뒤에도 로그인 전용 기능(무드 알림 등)이
 * 계속 돌던 이유다. 그래서 비운 뒤 알려준다.
 */
function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('currentUser')

  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT),
  )
}

export const SESSION_EXPIRED_EVENT =
  'emour:session-expired'

async function parseResponse(response) {
  if (response.status === 204) {
    return null
  }

  const contentType =
    response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    /*
     * 갱신할 방법이 없는데 accessToken 만 남아 있는 상태.
     * 그대로 두면 isAuthenticated() 가 계속 true 라 로그인한 것처럼 동작한다.
     */
    clearTokens()
    return null
  }

  const response = await fetch(
    `${API_BASE_URL}/auth/refresh`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    },
  )

  const responseData =
    await parseResponse(response)

  if (!response.ok) {
    clearTokens()
    return null
  }

  const tokenData = responseData?.data

  if (!tokenData?.accessToken) {
    clearTokens()
    return null
  }

  localStorage.setItem(
    'accessToken',
    tokenData.accessToken,
  )

  if (tokenData.refreshToken) {
    localStorage.setItem(
      'refreshToken',
      tokenData.refreshToken,
    )
  }

  return tokenData.accessToken
}

export async function apiRequest(
  path,
  {
    method = 'GET',
    headers: customHeaders,
    body,
    skipAuth = false,
    retryOnUnauthorized = true,
    ...options
  } = {},
) {
  const headers = new Headers(customHeaders)
  const accessToken = getAccessToken()

  if (accessToken && !skipAuth) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    )
  }

  let requestBody = body

  const isFormData =
    typeof FormData !== 'undefined' &&
    body instanceof FormData

  if (
    body !== undefined &&
    body !== null &&
    !isFormData &&
    typeof body !== 'string'
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    )

    requestBody = JSON.stringify(body)
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      method,
      headers,
      body: requestBody,
      credentials: 'include',
      ...options,
    },
  )

  const responseData =
    await parseResponse(response)

  if (
    response.status === 401 &&
    !skipAuth &&
    retryOnUnauthorized
  ) {
    const refreshedAccessToken =
      await refreshAccessToken()

    if (refreshedAccessToken) {
      return apiRequest(path, {
        method,
        headers: customHeaders,
        body,
        skipAuth,
        retryOnUnauthorized: false,
        ...options,
      })
    }
  }

  if (!response.ok) {
    const errorMessage =
      responseData?.message ||
      responseData?.error ||
      (typeof responseData === 'string'
        ? responseData
        : '') ||
      '요청을 처리하지 못했습니다.'

    const requestError =
      new Error(errorMessage)

    requestError.status = response.status
    requestError.response = responseData

    throw requestError
  }

  if (
    ![
      'GET',
      'HEAD',
      'OPTIONS',
    ].includes(method.toUpperCase())
  ) {
    window.setTimeout(() => {
      notifyLiveSync(path)
    }, 0)
  }

  return responseData
}

export async function apiBlobRequest(
  path,
  {
    headers: customHeaders,
    skipAuth = false,
    retryOnUnauthorized = true,
    ...options
  } = {},
) {
  const headers = new Headers(customHeaders)
  const accessToken = getAccessToken()

  if (accessToken && !skipAuth) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    )
  }

  const requestUrl =
    /^https?:\/\//i.test(path)
      ? path
      : `${API_BASE_URL}${path}`

  const response = await fetch(
    requestUrl,
    {
      method: 'GET',
      headers,
      credentials: 'include',
      ...options,
    },
  )

  if (
    response.status === 401 &&
    !skipAuth &&
    retryOnUnauthorized
  ) {
    const refreshedAccessToken =
      await refreshAccessToken()

    if (refreshedAccessToken) {
      return apiBlobRequest(path, {
        headers: customHeaders,
        skipAuth,
        retryOnUnauthorized: false,
        ...options,
      })
    }
  }

  if (!response.ok) {
    const responseData =
      await parseResponse(response)

    const errorMessage =
      responseData?.message ||
      responseData?.error ||
      (typeof responseData === 'string'
        ? responseData
        : '') ||
      '이미지를 불러오지 못했습니다.'

    const requestError =
      new Error(errorMessage)

    requestError.status = response.status
    requestError.response = responseData

    throw requestError
  }

  return response.blob()
}
