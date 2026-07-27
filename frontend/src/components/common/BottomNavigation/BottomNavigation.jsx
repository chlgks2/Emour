import './BottomNavigation.css'

const NAVIGATION_ITEMS = [
  {
    id: 'home',
    label: '홈',
    icon: '⌂',
  },
  {
    id: 'chat',
    label: '채팅',
    icon: '○',
  },
  {
    id: 'calendar',
    label: '캘린더',
    icon: '▦',
  },
  {
    id: 'album',
    label: '앨범',
    icon: '▧',
  },
  {
    id: 'mypage',
    label: '마이',
    icon: '♙',
  },
]

function BottomNavigation() {
  return (
    <nav
      className="bottom-navigation"
      aria-label="하단 메뉴"
    >
      {NAVIGATION_ITEMS.map((item) => {
        const isActive = item.id === 'calendar'

        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-navigation-item ${
              isActive ? 'bottom-navigation-item-active' : ''
            }`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              console.log(`${item.label} 화면 이동`)
            }}
          >
            <span
              className="bottom-navigation-icon"
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNavigation