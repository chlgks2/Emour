import { useState } from 'react'
import { Trash2, X } from 'lucide-react'

import {
  SCHEDULE_TYPE,
} from '../../../mappers/calendarMapper.js'

import './ScheduleModal.css'

function ScheduleModal({
  mode,
  selectedDate,
  schedule,
  entryType,
  isProcessing,
  onClose,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState(() => ({
    name: schedule?.name ?? '',
    date:
      schedule?.startDate ??
      schedule?.date ??
      selectedDate,
    time: schedule?.time ?? '',
    type:
      schedule?.type ??
      entryType ??
      SCHEDULE_TYPE.SCHEDULE,
  }))

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previousFormData) => ({
      ...previousFormData,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (
      !formData.name.trim() ||
      !formData.date ||
      (
        formData.type ===
          SCHEDULE_TYPE.SCHEDULE &&
        !formData.time
      ) ||
      isProcessing
    ) {
      return
    }

    onSave({
      name: formData.name.trim(),
      date: formData.date,
      time: formData.time,
      type: formData.type,
    })
  }

  return (
    <div
      className="schedule-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isProcessing
        ) {
          onClose()
        }
      }}
    >
      <section
        className="schedule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
      >
        <div className="schedule-modal-handle" />

        <header className="schedule-modal-header">
          <div>
            <p>
              {formData.type ===
              SCHEDULE_TYPE.ANNIVERSARY
                ? '반복되는 소중한 날을 기록해보세요'
                : '선택한 날짜의 일정을 관리해보세요'}
            </p>

            <h2 id="schedule-modal-title">
              {mode === 'edit'
                ? formData.type ===
                  SCHEDULE_TYPE.ANNIVERSARY
                  ? '기념일 수정'
                  : '일정 수정'
                : formData.type ===
                    SCHEDULE_TYPE.ANNIVERSARY
                  ? '기념일 추가'
                  : '일정 추가'}
            </h2>
          </div>

          <button
            type="button"
            className="schedule-modal-close"
            aria-label="일정 팝업 닫기"
            disabled={isProcessing}
            onClick={onClose}
          >
            <X
              size={20}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </header>

        <form
          className="schedule-modal-form"
          onSubmit={handleSubmit}
        >
          <label>
            이름

            <input
              name="name"
              type="text"
              value={formData.name}
              disabled={isProcessing}
              placeholder={
                formData.type ===
                SCHEDULE_TYPE.ANNIVERSARY
                  ? '기념일 이름을 입력해주세요'
                  : '일정 이름을 입력해주세요'
              }
              onChange={handleChange}
            />
          </label>

          <div
            className={
              formData.type ===
              SCHEDULE_TYPE.ANNIVERSARY
                ? ''
                : 'schedule-modal-row'
            }
          >
            <label>
              {formData.type ===
              SCHEDULE_TYPE.ANNIVERSARY
                ? '기준일'
                : '날짜'}

              <input
                name="date"
                type="date"
                value={formData.date}
                disabled={isProcessing}
                onChange={handleChange}
              />
            </label>

            {formData.type ===
              SCHEDULE_TYPE.SCHEDULE && (
              <label>
                시간

                <input
                  name="time"
                  type="time"
                  value={formData.time}
                  disabled={isProcessing}
                  onChange={handleChange}
                />
              </label>
            )}
          </div>

          {formData.type ===
            SCHEDULE_TYPE.ANNIVERSARY && (
            <p className="schedule-anniversary-guide">
              등록한 월과 날짜에 매년 자동으로 표시됩니다.
            </p>
          )}

          <div className="schedule-modal-actions">
            {mode === 'edit' && (
              <button
                type="button"
                className="schedule-delete-button"
                disabled={isProcessing}
                onClick={onDelete}
              >
                <Trash2
                  size={15}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                <span>삭제</span>
              </button>
            )}

            <button
              type="button"
              className="schedule-cancel-button"
              disabled={isProcessing}
              onClick={onClose}
            >
              취소
            </button>

            <button
              type="submit"
              className="schedule-save-button"
              disabled={
                isProcessing ||
                !formData.name.trim() ||
                !formData.date ||
                (
                  formData.type ===
                    SCHEDULE_TYPE.SCHEDULE &&
                  !formData.time
                )
              }
            >
              {isProcessing
                ? '저장 중'
                : '저장'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ScheduleModal
