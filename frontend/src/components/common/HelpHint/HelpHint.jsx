import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import styles from "./HelpHint.module.css";

/**
 * 물음표 버튼 + 설명 말풍선. **논모달**이다.
 *
 * 집계 기준 같은 "알면 좋지만 매번 읽을 필요는 없는" 문장을 담는다.
 * 화면에 늘 펼쳐 두면 정작 봐야 할 수치보다 각주가 길어지고,
 * 모달로 띄우면 배경이 막혀 읽던 자리를 잃는다. 그래서 그 자리에서 열린다.
 *
 * ── 모바일과 데스크톱을 한 컴포넌트로 ─────────────────────────────
 * 마우스가 있으면 올려두는 것만으로 열리고, 손가락으로는 눌러서 연다.
 * 터치 기기에서도 hover 이벤트가 흉내내지는데, 그걸 그대로 받으면
 * "한 번 탭 -> 열림 -> 다음 탭 -> 안 닫힘" 처럼 어긋난다.
 * 그래서 pointerType 이 mouse 일 때만 호버로 여닫는다.
 *
 * 키보드는 Tab 으로 focus 하면 열리고 Esc 로 닫는다.
 *
 * @param {import('react').ReactNode} children 말풍선에 담을 설명
 * @param {string} label 버튼의 스크린리더 이름 ("무엇에 대한 설명인지")
 * @param {'start'|'end'|'center'} align 말풍선이 버튼의 어느 쪽에 맞춰 열릴지.
 *   버튼이 왼쪽(제목 옆)이면 start, 오른쪽 끝(카드 모서리)이면 end,
 *   화면 한가운데면 center. 한쪽으로만 펴면 좁은 화면에서 반대쪽이 잘린다.
 * @param {'default'|'accent'} tone 놓이는 면에 맞춘 버튼 색. accent 는 분홍 면 위.
 */
export default function HelpHint({
  children,
  label = "설명 보기",
  align = "start",
  tone = "default",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);
  const popoverId = useId();

  /*
   * 바깥을 누르거나 Esc 를 누르면 닫는다.
   * 논모달이라 배경을 덮는 레이어가 없으므로 문서에서 직접 듣는다.
   */
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handlePointerEnter = (event) => {
    if (event.pointerType === "mouse") setIsOpen(true);
  };

  const handlePointerLeave = (event) => {
    if (event.pointerType === "mouse") setIsOpen(false);
  };

  return (
    <span
      ref={wrapRef}
      className={styles.wrap}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        type="button"
        className={`${styles.button} ${tone === "accent" ? styles.buttonAccent : ""}`}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <HelpCircle size={15} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {/*
        role="tooltip" 이 아니라 그냥 영역으로 둔다.
        tooltip 은 짧은 이름표를 뜻하는데 여기 들어가는 건 두 문장짜리 설명이다.
        닫혀 있을 때는 DOM 에서 빼서 스크린리더가 읽고 지나가지 않게 한다.
      */}
      {isOpen && (
        <span
          id={popoverId}
          role="note"
          className={`${styles.popover} ${
            {
              end: styles.popoverEnd,
              center: styles.popoverCenter,
            }[align] ?? styles.popoverStart
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
