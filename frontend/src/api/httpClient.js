const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/$/, '')

function getAccessToken() {
  return localStorage.getItem('accessToken')
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

export async function apiRequest(
  path,
  {
    method = 'GET',
    headers: customHeaders,
    body,
    ...options
  } = {},
) {
  const headers = new Headers(customHeaders)
  const accessToken = getAccessToken()

  if (accessToken) {
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

  if (!response.ok) {
    const errorMessage =
      responseData?.message ||
      responseData?.error ||
      (typeof responseData === 'string'
        ? responseData
        : '') ||
      '요청을 처리하지 못했습니다.'

    throw new Error(errorMessage)
  }

  return responseData
}