import {
  CalendarDays,
  House,
  Images,
  MessageCircle,
  UserRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import './BottomNavigation.css'

const NAVIGATION_ITEMS = [
  {
    id: 'home',
    label: '홈',
    path: null,
    icon: House,
  },
  {
    id: 'chat',
    label: '채팅',
    path: null,
    icon: MessageCircle,
  },
  {
    id: 'calendar',
    label: '캘린더',
    path: '/calendar',
    icon: CalendarDays,
  },
  {
    id: 'album',
    label: '앨범',
    path: '/album',
    icon: Images,
  },
  {
    id: 'mypage',
    label: '마이',
    path: null,
    icon: UserRound,
  },
]

function BottomNavigation() {
  return (
    <nav
      className="bottom-navigation"
      aria-label="하단 내비게이션"
    >
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon

        if (!item.path) {
          return (
            <button
              key={item.id}
              type="button"
              className="bottom-navigation-item"
              disabled
              aria-label={`${item.label} 페이지 준비 중`}
            >
              <Icon
                className="bottom-navigation-icon"
                size={23}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              <span className="bottom-navigation-label">
                {item.label}
              </span>
            </button>
          )
        }

        return (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              [
                'bottom-navigation-item',
                isActive
                  ? 'bottom-navigation-item-active'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="bottom-navigation-icon"
                  size={23}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  aria-hidden="true"
                />

                <span className="bottom-navigation-label">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default BottomNavigation