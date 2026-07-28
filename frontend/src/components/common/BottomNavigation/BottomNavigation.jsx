import {
  CalendarDays,
  House,
  Images,
  MessageCircle,
  UserRound,
} from 'lucide-react'

import './BottomNavigation.css'

const NAVIGATION_ITEMS = [
  {
    id: 'home',
    label: '홈',
    icon: House,
  },
  {
    id: 'chat',
    label: '채팅',
    icon: MessageCircle,
  },
  {
    id: 'calendar',
    label: '캘린더',
    icon: CalendarDays,
  },
  {
    id: 'album',
    label: '앨범',
    icon: Images,
  },
  {
    id: 'mypage',
    label: '마이',
    icon: UserRound,
  },
]

function BottomNavigation({
  activeMenu = 'calendar',
  onMenuChange,
}) {
  const handleMenuClick = (menuId) => {
    if (onMenuChange) {
      onMenuChange(menuId)
      return
    }

    console.log(`${menuId} 화면으로 이동`)
  }

  return (
    <nav
      className="bottom-navigation"
      aria-label="하단 내비게이션"
    >
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = item.id === activeMenu

        return (
          <button
            key={item.id}
            type="button"
            className={[
              'bottom-navigation-item',
              isActive
                ? 'bottom-navigation-item-active'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => handleMenuClick(item.id)}
          >
            <Icon
              className="bottom-navigation-icon"
              size={23}
              strokeWidth={isActive ? 2.2 : 1.8}
              aria-hidden="true"
            />

            <span className="bottom-navigation-label">
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNavigation