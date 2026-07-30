import { NavLink } from "react-router-dom";
import { Home, MessageCircle, Calendar, Image, User } from "lucide-react";
import styles from "./BottomNav.module.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "홈", Icon: Home },
  { to: "/chat", label: "채팅", Icon: MessageCircle },
  { to: "/calendar", label: "캘린더", Icon: Calendar },
  { to: "/album", label: "앨범", Icon: Image },
  { to: "/my", label: "마이", Icon: User },
];

export default function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="주요 메뉴">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => [styles.item, isActive ? styles.active : ""].join(" ")}
        >
          {({ isActive }) => (
            <>
              <span className={styles.icon} aria-hidden="true">
                <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
              </span>
              <span>{label}</span>
              {/* 현재 위치를 스크린 리더에도 알려준다 */}
              {isActive && <span className="sr-only">(현재 위치)</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
