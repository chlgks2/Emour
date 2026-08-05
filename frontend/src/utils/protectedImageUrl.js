/*
 * 백엔드가 내려주는 이미지 주소는 인증이 필요한 /uploads/... 경로다.
 * <img src> 로 바로 걸면 Authorization 헤더가 붙지 않아 401 이 나므로,
 * 토큰을 실어 blob 으로 받아온 뒤 objectURL 로 바꿔 쓴다.
 *
 * 앨범·프로필 등 여러 화면이 같은 처리를 필요로 해서 공용 유틸로 뺐다.
 */
import { apiBlobRequest } from '../api/httpClient.js'

/**
 * 인증이 필요한 이미지 주소를 화면에 바로 걸 수 있는 주소로 바꾼다.
 * 이미 blob:/data: 인 주소나 변환에 실패한 주소는 그대로 돌려준다.
 *
 * @param {string|null|undefined} imageUrl
 * @returns {Promise<string|null|undefined>}
 */
export async function resolveProtectedImageUrl(imageUrl) {
  if (
    !imageUrl ||
    imageUrl.startsWith('blob:') ||
    imageUrl.startsWith('data:')
  ) {
    return imageUrl
  }

  let requestUrl = imageUrl

  try {
    const parsedUrl = new URL(imageUrl, window.location.origin)

    /*
     * 로컬 백엔드는 이미지 주소를 http://localhost:8080/uploads/... 로 반환한다.
     * 같은 출처의 Vite 프록시를 타도록 상대 경로로 바꾼다.
     */
    if (parsedUrl.pathname.startsWith('/uploads/')) {
      requestUrl = `${parsedUrl.pathname}${parsedUrl.search}`
    }
  } catch {
    requestUrl = imageUrl
  }

  try {
    return URL.createObjectURL(await apiBlobRequest(requestUrl))
  } catch {
    return imageUrl
  }
}
