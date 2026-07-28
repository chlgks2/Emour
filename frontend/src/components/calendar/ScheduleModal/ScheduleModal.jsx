import { useState } from 'react'
import { Trash2, X } from 'lucide-react'

import './ScheduleModal.css'

function ScheduleModal({
  mode,
  selectedDate,
  schedule,
  onClose,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState(() => ({
    title: schedule?.title ?? '',
    date: schedule?.date ?? selectedDate,
    time: schedule?.time ?? '',
    memo: schedule?.memo ?? '',
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

    if (!formData.title.trim() || !formData.date) {
      return
    }

    onSave({
      title: formData.title.trim(),
      date: formData.date,
      time: formData.time,
      memo: formData.memo.trim(),
    })
  }

  return (
    <div
      className="schedule-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
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
            <p>선택 날짜의 일정을 관리해보세요</p>

            <h2 id="schedule-modal-title">
              {mode === 'edit'
                ? '일정 수정'
                : '일정 추가'}
            </h2>
          </div>

          <button
            type="button"
            className="schedule-modal-close"
            aria-label="일정 팝업 닫기"
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
            일정 제목

            <input
              name="title"
              type="text"
              value={formData.title}
              placeholder="일정 제목을 입력해주세요"
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
                onChange={handleChange}
              />
            </label>

            <label>
              시간

              <input
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
              />
            </label>
          </div>

          <label>
            메모

            <textarea
              name="memo"
              value={formData.memo}
              placeholder="일정에 대한 메모를 입력해주세요"
              rows={3}
              onChange={handleChange}
            />
          </label>

          <div className="schedule-modal-actions">
            {mode === 'edit' && (
              <button
                type="button"
                className="schedule-delete-button"
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
              onClick={onClose}
            >
              취소
            </button>

            <button
              type="submit"
              className="schedule-save-button"
              disabled={
                !formData.title.trim() || !formData.date
              }
            >
              저장
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ScheduleModal