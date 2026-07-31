import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bookmark, BookmarkX } from "lucide-react";
import { REACTION_OPTIONS } from "../../constants/reactions";
import styles from "./MessageActionPopover.module.css";

/**
 * 채팅 메시지를 꾹 눌렀을 때 말풍선 옆에 뜨는 논모달 팝오버 메뉴
 * - 리액션(HEART/CHECK/GREAT) + 북마크 토글만 아이콘 한 줄로 노출한다.
 * - 논모달: 배경을 어둡게 덮지 않고 스크롤도 잠그지 않는다.
 *   메뉴 밖 아무 곳을 누르거나 Escape / 스크롤 / 리사이즈 시 닫힌다. (별도 닫기 버튼 없음)
 * - 어떤 메시지에 대한 메뉴인지는 위치로 알 수 있으므로 본문을 다시 보여주지 않는다.
 *
 * @param {DOMRect|null} anchorRect - 기준이 되는 말풍선의 화면 좌표
 * @param {boolean} isBookmarked
 * @param {string|null} myReactionType - 내가 이미 달아둔 chat_reaction.reaction_type (없으면 null)
 * @param {boolean} canReact - 반응 가능 여부. 내 메시지에는 반응할 수 없어 리액션 줄을 숨긴다.
 * @param {() => void} onClose
 * @param {(reactionType: string) => void} onSelectReaction
 * @param {() => void} onToggleBookmark
 */
const GAP = 8; // 말풍선과 팝오버 사이 간격
const EDGE = 10; // 화면 가장자리 최소 여백

export default function MessageActionPopover({
  anchorRect,
  isBookmarked,
  myReactionType,
  canReact = true,
  onClose,
  onSelectReaction,
  onToggleBookmark,
}) {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState(null);

  // onClose 가 매 렌더 새로 만들어져도 리스너를 다시 붙이지 않도록 ref 에 담아둔다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 실제로 그려진 크기를 재서 말풍선 위(공간이 없으면 아래)에 가운데 정렬로 붙인다.
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el || !anchorRect) return;
    // 등장 애니메이션의 scale 이 섞이지 않도록 getBoundingClientRect 대신 offset* 을 쓴다.
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    let top = anchorRect.top - height - GAP;
    if (top < EDGE) {
      top = Math.min(anchorRect.bottom + GAP, window.innerHeight - height - EDGE);
    }
    const centered = anchorRect.left + anchorRect.width / 2 - width / 2;
    const left = Math.max(EDGE, Math.min(centered, window.innerWidth - width - EDGE));

    setPosition({ top, left });
  }, [anchorRect]);

  // 닫히는 조건: 메뉴 밖 클릭 / Escape / 스크롤 / 리사이즈
  // (position: fixed 라서 스크롤되면 말풍선과 어긋나므로 따라가게 하지 않고 닫는다)
  useEffect(() => {
    const close = () => onCloseRef.current?.();
    const handlePointerDown = (e) => {
      if (!popoverRef.current?.contains(e.target)) close();
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    // scroll 은 버블링되지 않으므로 캡처로 받아 내부 스크롤 컨테이너까지 감지한다.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  // 닫힌 뒤에는 메뉴를 열었던 말풍선으로 포커스를 되돌려준다.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus?.({ preventScroll: true });
      }
    };
  }, []);

  // 키보드로 열었을 때도 바로 조작할 수 있게 첫 버튼으로 포커스를 옮긴다.
  // 논모달이므로 포커스 트랩은 걸지 않는다 (Tab 으로 메뉴 밖으로 나갈 수 있어야 한다).
  useEffect(() => {
    if (!position) return;
    popoverRef.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [position]);

  return (
    <div
      ref={popoverRef}
      className={styles.popover}
      role="group"
      aria-label="메시지 반응 및 북마크"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        // 위치를 계산하기 전 한 프레임 동안 엉뚱한 자리에 번쩍이는 것을 막는다.
        visibility: position ? "visible" : "hidden",
      }}
    >
      {/* 내 메시지에는 반응할 수 없으므로 리액션 줄 자체를 감춘다. (북마크만 남는다) */}
      {canReact &&
        REACTION_OPTIONS.map(({ reactionType, label, Icon, color }) => {
          const active = myReactionType === reactionType;
          return (
            <button
              key={reactionType}
              type="button"
              className={[styles.iconBtn, active ? styles.iconBtnActive : ""].join(" ")}
              style={active ? { background: color } : undefined}
              onClick={() => onSelectReaction(reactionType)}
              aria-label={active ? `${label} 취소` : label}
              aria-pressed={active}
              title={active ? `${label} 취소` : label}
            >
              <Icon size={18} color={active ? "#fff" : color} />
            </button>
          );
        })}

      {canReact && <span className={styles.divider} aria-hidden="true" />}

      <button
        type="button"
        className={[styles.iconBtn, styles.bookmarkBtn].join(" ")}
        onClick={onToggleBookmark}
        aria-label={isBookmarked ? "북마크 해제" : "북마크 하기"}
        aria-pressed={isBookmarked}
        title={isBookmarked ? "북마크 해제" : "북마크"}
      >
        {isBookmarked ? <BookmarkX size={18} /> : <Bookmark size={18} />}
      </button>
    </div>
  );
}
