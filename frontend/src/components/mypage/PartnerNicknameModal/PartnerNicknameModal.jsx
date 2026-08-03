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

            {/* 눈썹 문구(COUPLE NICKNAME)는 바로 아래 제목과 같은 말이라 뺐다 */}
            <h2 id="partner-nickname-title">
              연인 애칭 수정
            </h2>
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
            {/*
              '내 화면에서만' 은 화면이 사용자에게 말을 거는 문장 안에서
              그 사람을 '나' 라고 부르는 꼴이라 1인칭과 2인칭이 섞였다.
              여기서는 사람을 가리키지 않고 사실만 말하면 더 짧고 분명해진다.
            */}
            <span>
              이 이름은 상대방에게는 보이지 않아요.
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