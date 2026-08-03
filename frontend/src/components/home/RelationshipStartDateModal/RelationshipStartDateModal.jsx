import { useState } from "react";
import {
  CalendarHeart,
  X,
} from "lucide-react";
import styles from "./RelationshipStartDateModal.module.css";

function formatTodayKey() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(
      2,
      "0",
    ),
    String(today.getDate()).padStart(
      2,
      "0",
    ),
  ].join("-");
}

export default function RelationshipStartDateModal({
  initialDate = "",
  isSaving = false,
  onClose,
  onSave,
}) {
  const [startDate, setStartDate] =
    useState(initialDate);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!startDate || isSaving) {
      return;
    }

    await onSave(startDate);
  };

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !isSaving
        ) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-date-title"
      >
        <header className={styles.header}>
          <span className={styles.icon}>
            <CalendarHeart
              size={21}
              aria-hidden="true"
            />
          </span>

          <div>
            <p>OUR FIRST DAY</p>
            <h2 id="relationship-date-title">
              처음 만난 날
            </h2>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            aria-label="처음 만난 날 설정 닫기"
            disabled={isSaving}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <p className={styles.description}>
          함께한 날짜와 100일 단위 기념일을
          계산할 기준일을 선택해주세요.
        </p>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          <label htmlFor="relationship-start-date">
            시작일
          </label>

          <input
            id="relationship-start-date"
            type="date"
            value={startDate}
            max={formatTodayKey()}
            disabled={isSaving}
            onChange={(event) =>
              setStartDate(
                event.target.value,
              )
            }
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={isSaving}
              onClick={onClose}
            >
              취소
            </button>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={
                isSaving ||
                !startDate ||
                startDate === initialDate
              }
            >
              {isSaving ? "저장 중" : "저장"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
