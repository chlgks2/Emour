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

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

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
