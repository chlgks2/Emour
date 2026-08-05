import { useEffect, useState } from 'react'
import {
  APP_DESIGN_HEIGHT,
  APP_DESIGN_WIDTH,
} from './appViewport.js'
import {
  applyHomeBackground,
  cacheHomeBackgroundPreview,
  getCachedHomeBackground,
  getHomeBackgroundUrl,
  refreshHomeBackground,
  resetHomeBackground,
  subscribeHomeBackground,
} from '../../api/homeApi.js'
import { useAuth } from '../../hooks/useAuth.js'
import './AppViewport.css'

/*
 * 화면 위/아래는 창 끝에 붙인다. 그래서 세로 여백은 0.
 * (가로는 비율상 남는 만큼 무대 배경이 보인다)
 */
const STAGE_PADDING = 0

/**
 * 서비스 화면을 담는 직사각형 뷰포트.
 *
 * 화면은 412x892 로 설계돼 있고, 이 컴포넌트는 그 비율을 유지한 채
 * transform: scale() 로 "그대로 확대"만 한다. 폰트·아이콘·여백이 전부 같은
 * 배율로 커지므로 레이아웃이 재배치되지 않는다.
 *
 * ⚠️ transform 이 걸린 요소는 자손 position:fixed 의 containing block 이 된다.
 *    덕분에 모달·토스트가 브라우저 전체가 아니라 이 사각형 안에 갇히는데(의도한 동작),
 *    대신 뷰포트 좌표를 쓰는 코드는 appViewport.js 의 변환 헬퍼를 거쳐야 한다.
 */
function AppViewport({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [scale, setScale] = useState(1)

  /*
   * 무대 배경으로 쓸 사진. 홈 배경과 같은 값이다.
   * 사용자가 홈 사진을 바꾸면(HomeEditPage) 저장하는 쪽에서 알림이 오고,
   * 계정이 바뀌면 홈 화면이 열릴 때 알림이 온다. 둘 다 다시 읽어서 갈아끼운다.
   */
  const [backdropUrl, setBackdropUrl] = useState(
    () => getCachedHomeBackground(user?.userId) || getHomeBackgroundUrl(),
  )

  useEffect(
    () =>
      subscribeHomeBackground(() => {
        setBackdropUrl(getHomeBackgroundUrl())
      }),
    [],
  )

  useEffect(() => {
    let cancelled = false

    if (!isAuthenticated || !user?.userId) {
      resetHomeBackground()
      return undefined
    }

    const cachedBackground = getCachedHomeBackground(user.userId)
    if (cachedBackground) {
      applyHomeBackground(cachedBackground)
    }

    refreshHomeBackground()
      .then((imageUrl) => {
        if (!cancelled) {
          applyHomeBackground(imageUrl)
          cacheHomeBackgroundPreview(imageUrl, user.userId)
        }
      })
      .catch(() => {
        if (!cancelled) {
          resetHomeBackground()
        }
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.userId])

  useEffect(() => {
    const updateScale = () => {
      const availableWidth =
        window.innerWidth - STAGE_PADDING * 2
      const availableHeight =
        window.innerHeight - STAGE_PADDING * 2

      /*
       * 세로 여백이 0 이라 보통은 높이가 기준이 되어 창 위/아래에 딱 붙는다.
       * 창이 아주 좁을 때만 가로가 기준이 되는데, 이때 높이 기준을 고집하면
       * 좌우가 잘려 내용이 사라지므로 min 으로 막는다.
       */
      setScale(
        Math.max(
          0.1,
          Math.min(
            availableWidth / APP_DESIGN_WIDTH,
            availableHeight / APP_DESIGN_HEIGHT,
          ),
        ),
      )
    }

    updateScale()
    window.addEventListener('resize', updateScale)

    return () =>
      window.removeEventListener(
        'resize',
        updateScale,
      )
  }, [])

  return (
    <div className="app-stage">
      {/*
        앱 사각형 바깥의 무대.

        브랜드 색 그라데이션을 깔았는데, 화면 안쪽(홈 배경 사진)과 바깥이
        아무 관계가 없어서 앱이 배경 위에 얹혀 있는 느낌이었다.
        홈 배경으로 쓰는 그 사진을 아주 세게 흐려서 깐다. 형태는 완전히
        뭉개지고 사진의 대표색 두어 개만 남아, 앱 안팎이 같은 사진에서
        나온 색을 갖는다.

        바깥 요소가 자기 크기를 지키고(inset: 0) 확대된 이미지를 스스로
        잘라내야 한다. 무대 밖으로 삐져나가면 무대가 '스크롤 가능한' 상태가
        되어 자식 쪽 scrollIntoView 에 화면 전체가 딸려 올라간다.
      */}
      <div className="app-stage-backdrop" aria-hidden="true">
        <div
          className="app-stage-backdrop-image"
          style={{
            backgroundImage: `url("${backdropUrl}")`,
          }}
        />
      </div>

      <div
        className="app-viewport"
        data-app-viewport=""
        style={{ '--app-scale': scale }}
      >
        {children}
      </div>
    </div>
  )
}

export default AppViewport
