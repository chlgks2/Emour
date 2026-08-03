import { useEffect, useState } from 'react'
import {
  APP_DESIGN_HEIGHT,
  APP_DESIGN_WIDTH,
} from './appViewport.js'
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
  const [scale, setScale] = useState(1)

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
