import { X } from 'lucide-react'

import './DiaryModal.css'

/**
 * 한 줄 일기 작성·수정 시트.
 *
 * 예전에는 상세 카드 안에서 자리를 밀어내며 펼쳐지는 인라인 편집기였다.
 * 같은 카드 안의 일정·기념일은 시트로 여는데 일기만 제자리에서 열려서,
 * 편집을 시작하면 아래 내용이 통째로 밀려 내려가고 무엇을 고치는 중인지도
 * 흐렸다. 이제 셋 다 같은 시트로 연다.
 *
 * 초안(value)은 페이지가 들고 있다. 저장 성공 여부에 따라 시트를 닫을지
 * 결정하는 것도 페이지 쪽 로직(handleDiarySave)이라 그대로 둔다.
 */
function DiaryModal({
  dateLabel,
  value,
  isProcessing,
  onChange,
  onClose,
  onSave,
}) {
  const handleSubmit = (event) => {
    event.preventDefault()

    if (isProcessing) {
      return
    }

    onSave()
  }

  return (
    <div
      className="sheet-backdrop diary-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !isProcessing
        ) {
          onClose()
        }
      }}
    >
      <section
        className="sheet-panel diary-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diary-modal-title"
      >
        <div className="sheet-handle" />

        <header className="diary-modal-header">
          <div>
            <p>{dateLabel}</p>

            <h2 id="diary-modal-title">
              한 줄 일기
            </h2>
          </div>

          <button
            type="button"
            className="diary-modal-close"
            aria-label="한 줄 일기 닫기"
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
          className="diary-modal-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>오늘 하루를 한 줄로</span>

            <textarea
              value={value}
              rows={4}
              placeholder="오늘의 한 줄 일기를 작성해주세요"
              disabled={isProcessing}
              autoFocus
              onChange={(event) =>
                onChange(event.target.value)
              }
            />
          </label>

          <div className="diary-modal-actions">
            <button
              type="button"
              className="diary-modal-cancel"
              disabled={isProcessing}
              onClick={onClose}
            >
              취소
            </button>

            <button
              type="submit"
              className="diary-modal-save"
              disabled={isProcessing}
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

export default DiaryModal
