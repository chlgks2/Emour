import { useState, useRef, useCallback, useId } from "react";
import { X } from "lucide-react";
import { EmojiFrownIcon, EmojiSmileIcon } from "../../icons/EmojiIcons";
import {
  MOOD_TYPES,
  buildScaleGradient,
  getMoodMeta,
  getMoodMetaByLevel,
} from "../../../utils/moodEmotion";
import { useModalA11y } from "../../../hooks/useModalA11y";
import styles from "./MoodFormModal.module.css";

const REASON_MAX_LENGTH = 100; // mood.reason 컬럼과 API 입력 제한에 맞춘 상한

/**
 * 감정 등록/수정 모달
 * - 슬라이더는 1~5 단계(level)로 조작하지만, 서버로는 mood.mood_type ENUM 값을 보낸다.
 * @param {string|null} initialMoodType - 'VERY_SAD' | 'SAD' | 'NEUTRAL' | 'HAPPY' | 'VERY_HAPPY'
 * @param {({moodType: string, reason: string}) => void} onSubmit
 */
export default function MoodFormModal({
  open,
  onClose,
  mode = "create",
  dateLabel,
  initialMoodType = null,
  initialReason = "",
  onSubmit,
  onDelete,
}) {
  const [moodType, setMoodType] = useState(initialMoodType);
  const [reason, setReason] = useState(initialReason);
  const [submitting, setSubmitting] = useState(false);
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const titleId = useId();
  const sheetRef = useModalA11y(open, onClose);

  const level = getMoodMeta(moodType)?.level ?? null;

  const levelToFraction = (lvl) => (lvl - 1) / (MOOD_TYPES.length - 1);

  const fractionToMoodType = (frac) => {
    const idx = Math.round(frac * (MOOD_TYPES.length - 1));
    const clamped = Math.min(Math.max(idx, 0), MOOD_TYPES.length - 1);
    return MOOD_TYPES[clamped].moodType;
  };

  const updateFromClientX = useCallback((clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const frac = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    setMoodType(fractionToMoodType(frac));
  }, []);

  const handlePointerDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const handleKeyDown = (e) => {
    if (!level) return;
    if (e.key === "ArrowRight" && level < MOOD_TYPES.length) {
      setMoodType(getMoodMetaByLevel(level + 1).moodType);
    }
    if (e.key === "ArrowLeft" && level > 1) {
      setMoodType(getMoodMetaByLevel(level - 1).moodType);
    }
  };

  if (!open) return null;

  // 중복 제출 방지: 저장이 끝나기 전에 버튼을 다시 누르면 mood 가 두 번 저장될 수 있다.
  const handleSubmit = async () => {
    if (!moodType || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ moodType, reason: reason.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onDelete();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLabel = getMoodMeta(moodType)?.label ?? null;
  const thumbFraction = level ? levelToFraction(level) : 0.5;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.grabber} aria-hidden="true" />
        <div className={styles.header}>
          <span id={titleId} className={styles.title}>
            {mode === "edit" ? "내 감정 수정" : "오늘의 감정 등록"}
          </span>
          <button type="button" aria-label="닫기" className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {dateLabel && <p className={styles.dateLabel}>{dateLabel}</p>}

        <div className={styles.scaleSection}>
          <div className={styles.scaleEnds}>
            <div className={styles.scaleEnd}>
              <EmojiFrownIcon size={22} color={MOOD_TYPES[0].color} />
              <span className={styles.scaleEndLabel}>안 좋음</span>
            </div>
            <div className={styles.scaleEnd}>
              <span className={styles.scaleEndLabel}>좋음</span>
              <EmojiSmileIcon size={22} color={MOOD_TYPES[MOOD_TYPES.length - 1].color} />
            </div>
          </div>

          <div
            ref={trackRef}
            className={styles.track}
            style={{ background: buildScaleGradient(), touchAction: "none" }}
            role="slider"
            tabIndex={0}
            aria-valuemin={1}
            aria-valuemax={MOOD_TYPES.length}
            aria-valuenow={level ?? undefined}
            aria-valuetext={selectedLabel ?? "선택 안 됨"}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown}
          >
            {level && (
              <div
                className={styles.thumb}
                style={{ left: `${thumbFraction * 100}%` }}
              />
            )}
          </div>

          <p className={styles.selectedLabel}>{selectedLabel ?? "감정을 선택해주세요"}</p>
        </div>

        {/* ⚠️ reason 은 ERD의 mood 테이블에 대응 컬럼이 없다. (moodApi.js 상단 주석 참고) */}
        <div className={styles.reasonHeader}>
          <label className={styles.reasonLabel} htmlFor="mood-reason">
            오늘의 사유 (선택)
          </label>
          <span className={styles.reasonCount} aria-hidden="true">
            {reason.length}/{REASON_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="mood-reason"
          className={styles.reasonInput}
          placeholder="오늘 기분에 대해 남기고 싶은 이야기가 있나요?"
          value={reason}
          maxLength={REASON_MAX_LENGTH}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />

        <button
          type="button"
          className={styles.submitBtn}
          disabled={!moodType || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "저장 중..." : mode === "edit" ? "수정 완료" : "등록하기"}
        </button>

        {mode === "edit" && onDelete && (
          <button
            type="button"
            className={styles.deleteBtn}
            disabled={submitting}
            onClick={handleDelete}
          >
            삭제하기
          </button>
        )}
      </div>
    </div>
  );
}
