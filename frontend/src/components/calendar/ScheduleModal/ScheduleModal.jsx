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
  isProcessing,
  onClose,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState(() => ({
    name: schedule?.name ?? '',
    date: schedule?.date ?? selectedDate,
    time: schedule?.time ?? '',
    type:
      schedule?.type ??
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
              일정과 기념일을 관리해보세요
            </p>

            <h2 id="schedule-modal-title">
              {mode === 'edit'
                ? '기록 수정'
                : '기록 추가'}
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
            구분

            <select
              name="type"
              value={formData.type}
              disabled={isProcessing}
              onChange={handleChange}
            >
              <option
                value={SCHEDULE_TYPE.SCHEDULE}
              >
                일반 일정
              </option>

              <option
                value={
                  SCHEDULE_TYPE.ANNIVERSARY
                }
              >
                기념일
              </option>
            </select>
          </label>

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

          <div className="schedule-modal-row">
            <label>
              날짜

              <input
                name="date"
                type="date"
                value={formData.date}
                disabled={isProcessing}
                onChange={handleChange}
              />
            </label>

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
          </div>

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
                !formData.date
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