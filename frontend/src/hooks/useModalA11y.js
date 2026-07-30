import { useEffect, useRef } from "react";

let lockCount = 0; // 모달이 겹쳐 열릴 수 있으므로 참조 카운트로 잠금 관리

/**
 * 모달/시트 공통 접근성 처리
 *  - Escape 키로 닫기
 *  - 열릴 때 배경(body) 스크롤 잠금, 닫힐 때 해제
 *  - 열릴 때 시트 내부로 포커스 이동, 닫힐 때 직전 요소로 포커스 복귀
 *  - Tab 이 시트 밖으로 빠져나가지 않도록 순환(focus trap)
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @returns {React.RefObject} 시트(다이얼로그 본문) 엘리먼트에 달아줄 ref
 */
export function useModalA11y(open, onClose) {
  const sheetRef = useRef(null);
  // onClose 가 매 렌더 새로 만들어지더라도 Escape 리스너를 다시 붙이지 않도록 ref 에 담아둔다.
  // (ref 갱신은 렌더 중이 아니라 커밋 후에 해야 한다 - react-hooks/refs)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return undefined;
    lockCount += 1;
    document.body.dataset.scrollLocked = "true";
    return () => {
      lockCount -= 1;
      if (lockCount <= 0) {
        lockCount = 0;
        delete document.body.dataset.scrollLocked;
      }
    };
  }, [open]);

  // 포커스 이동/복귀 + Escape + focus trap
  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const sheet = sheetRef.current;

    const getFocusable = () =>
      Array.from(
        sheet?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null);

    // 시트가 그려진 다음 첫 요소로 포커스를 옮긴다.
    const focusTimer = setTimeout(() => {
      const [first] = getFocusable();
      (first ?? sheet)?.focus?.();
    }, 0);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      // 닫힌 뒤 원래 눌렀던 버튼으로 포커스를 되돌려준다.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus?.();
    };
  }, [open]);

  return sheetRef;
}
