import {
  useState,
} from 'react'

import {
  Heart,
  X,
} from 'lucide-react'

import './PartnerNicknameModal.css'

function PartnerNicknameModal({
  initialNickname,
  onClose,
  onSave,
}) {
  const [nickname, setNickname] =
    useState(initialNickname)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [isSaving, setIsSaving] =
    useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedNickname =
      nickname.trim()

    if (!trimmedNickname) {
      setErrorMessage(
        '연인 애칭을 입력해주세요.',
      )
      return
    }

    if (trimmedNickname.length > 20) {
      setErrorMessage(
        '연인 애칭은 20자 이하로 입력해주세요.',
      )
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')

      await onSave(trimmedNickname)

      onClose()
    } catch (error) {
      setErrorMessage(
        error.message ||
          '연인 애칭을 수정하지 못했습니다.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleBackdropMouseDown = (
    event,
  ) => {
    if (
      event.target === event.currentTarget &&
      !isSaving
    ) {
      onClose()
    }
  }

  return (
    <div
      className="partner-nickname-backdrop"
      role="presentation"
      onMouseDown={
        handleBackdropMouseDown
      }
    >
      <section
        className="partner-nickname-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-nickname-title"
      >
        <header className="partner-nickname-header">
          <div>
            <span className="partner-nickname-icon">
              <Heart
                size={18}
                strokeWidth={1.9}
                aria-hidden="true"
              />
            </span>

            <div>
              <p>COUPLE NICKNAME</p>

              <h2 id="partner-nickname-title">
                연인 애칭 수정
              </h2>
            </div>
          </div>

          <button
            type="button"
            aria-label="애칭 수정 닫기"
            disabled={isSaving}
            onClick={onClose}
          >
            <X
              size={20}
              aria-hidden="true"
            />
          </button>
        </header>

        <form
          className="partner-nickname-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>상대방을 부를 이름</span>

            <input
              type="text"
              value={nickname}
              maxLength={20}
              disabled={isSaving}
              autoFocus
              placeholder="연인 애칭을 입력해주세요"
              onChange={(event) => {
                setNickname(
                  event.target.value,
                )

                if (errorMessage) {
                  setErrorMessage('')
                }
              }}
            />
          </label>

          <div className="partner-nickname-field-footer">
            <span>
              이 이름은 내 화면에서만 표시됩니다.
            </span>

            <strong>
              {nickname.length}/20
            </strong>
          </div>

          {errorMessage && (
            <p className="partner-nickname-error">
              {errorMessage}
            </p>
          )}

          <div className="partner-nickname-actions">
            <button
              type="button"
              className="partner-nickname-cancel"
              disabled={isSaving}
              onClick={onClose}
            >
              취소
            </button>

            <button
              type="submit"
              className="partner-nickname-save"
              disabled={
                isSaving ||
                !nickname.trim()
              }
            >
              {isSaving
                ? '저장 중'
                : '저장'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default PartnerNicknameModal