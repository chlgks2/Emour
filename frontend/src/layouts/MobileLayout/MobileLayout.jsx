import './MobileLayout.css'

/**
 * 데스크톱에서 앱을 핸드폰 목업 안에 담아 보여주는 레이아웃.
 * 480px 이하에서는 목업 장식이 모두 사라지고 화면을 꽉 채운다.
 *
 * 노치와 홈 인디케이터는 .mobile-screen 의 형제로 둔다.
 * 화면 안에 넣으면 overflow: hidden 에 잘리고,
 * 화면 위에 겹치면 페이지 헤더 제목과 하단 탭 라벨을 가린다.
 */
function MobileLayout({ children }) {
  return (
    <div className="mobile-layout">
      <div className="mobile-frame">
        <span
          className="mobile-notch"
          aria-hidden="true"
        />

        <div className="mobile-screen">
          {children}
        </div>

        <span
          className="mobile-home-indicator"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export default MobileLayout
