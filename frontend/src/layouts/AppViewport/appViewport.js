/**
 * 앱 뷰포트 좌표 헬퍼.
 *
 * 뷰포트가 transform: scale() 로 확대돼 있어서, 브라우저 화면 좌표
 * (getBoundingClientRect 의 결과)와 뷰포트 안쪽의 CSS 좌표가 서로 다르다.
 * position:fixed 요소를 말풍선 옆에 붙이는 것처럼 좌표를 직접 다루는 코드는
 * 여기를 거쳐 변환해야 한다.
 *
 * 컴포넌트 파일이 아니라 별도 모듈에 두어야 Fast Refresh 가 깨지지 않는다.
 */

/* 화면 설계 기준 크기. AppViewport.css 의 --app-frame-* 와 같은 값이어야 한다. */
export const APP_DESIGN_WIDTH = 412
export const APP_DESIGN_HEIGHT = 892

/**
 * 현재 뷰포트의 위치·배율.
 * @returns {{rect: DOMRect, scale: number, width: number, height: number}|null}
 */
export function getAppViewportMetrics() {
  const element = document.querySelector(
    '[data-app-viewport]',
  )

  if (!element) return null

  const rect = element.getBoundingClientRect()

  /*
   * offsetWidth 는 배율이 적용되지 않은 레이아웃 폭,
   * rect.width 는 화면에 실제로 보이는 폭이다. 둘의 비가 곧 배율이라
   * 확대를 끄는 좁은 화면에서도 자동으로 1 이 된다.
   */
  const scale = element.offsetWidth
    ? rect.width / element.offsetWidth
    : 1

  return {
    rect,
    scale,
    width: element.offsetWidth,
    height: element.offsetHeight,
  }
}

/**
 * 브라우저 화면 좌표(DOMRect) -> 뷰포트 내부 CSS 좌표.
 * 뷰포트를 못 찾으면 원본을 그대로 돌려주어 확대가 없던 때와 같게 동작한다.
 */
export function toAppViewportRect(rect) {
  const metrics = getAppViewportMetrics()

  if (!rect) return null

  if (!metrics) {
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      boundsWidth: window.innerWidth,
      boundsHeight: window.innerHeight,
    }
  }

  const { rect: box, scale } = metrics

  return {
    top: (rect.top - box.top) / scale,
    bottom: (rect.bottom - box.top) / scale,
    left: (rect.left - box.left) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
    boundsWidth: metrics.width,
    boundsHeight: metrics.height,
  }
}
