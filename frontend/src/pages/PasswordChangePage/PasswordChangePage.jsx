import { useEffect, useState } from 'react'
import { ChevronLeft, KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { changeMyPassword } from '../../api/memberApi.js'
import { useAuth } from '../../hooks/useAuth.js'

import './PasswordChangePage.css'

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 64

function PasswordChangePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isSocialLogin =
    user?.authProvider === 'GOOGLE'

  useEffect(() => {
    if (isSocialLogin) {
      navigate('/mypage', {
        replace: true,
      })
    }
  }, [isSocialLogin, navigate])

  const [currentPassword, setCurrentPassword] =
    useState('')
  const [newPassword, setNewPassword] =
    useState('')
  const [
    newPasswordConfirm,
    setNewPasswordConfirm,
  ] = useState('')
  const [errorMessage, setErrorMessage] =
    useState('')
  const [isProcessing, setIsProcessing] =
    useState(false)

  const handleBack = () => {
    if (!isProcessing) {
      navigate('/mypage')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!currentPassword) {
      setErrorMessage(
        '현재 비밀번호를 입력해주세요.',
      )
      return
    }

    if (
      newPassword.length <
      PASSWORD_MIN_LENGTH
    ) {
      setErrorMessage(
        `새 비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 입력해주세요.`,
      )
      return
    }

    if (
      newPassword.length >
      PASSWORD_MAX_LENGTH
    ) {
      setErrorMessage(
        `새 비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해주세요.`,
      )
      return
    }

    if (newPassword === currentPassword) {
      setErrorMessage(
        '현재 비밀번호와 다른 비밀번호를 입력해주세요.',
      )
      return
    }

    if (
      newPassword !== newPasswordConfirm
    ) {
      setErrorMessage(
        '새 비밀번호가 일치하지 않습니다.',
      )
      return
    }

    try {
      setIsProcessing(true)
      setErrorMessage('')

      await changeMyPassword({
        currentPassword,
        newPassword,
      })

      window.alert(
        '비밀번호가 변경되었습니다.',
      )

      navigate('/mypage', {
        replace: true,
      })
    } catch (error) {
      setErrorMessage(
        error.message ||
          '비밀번호를 변경하지 못했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const updatePassword =
    (setter) => (event) => {
      setter(event.target.value)
      setErrorMessage('')
    }

  if (isSocialLogin) {
    return null
  }

  return (
    <div className="password-change-page">
      <header className="password-change-header">
        <button
          type="button"
          aria-label="마이페이지로 돌아가기"
          disabled={isProcessing}
          onClick={handleBack}
        >
          <ChevronLeft
            size={22}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        <h1>비밀번호 변경</h1>
        <div aria-hidden="true" />
      </header>

      <main className="password-change-scroll-area">
        <form
          className="password-change-form"
          onSubmit={handleSubmit}
        >
          <div className="password-change-intro">
            <span aria-hidden="true">
              <KeyRound
                size={27}
                strokeWidth={1.8}
              />
            </span>
            <h2>새 비밀번호를 설정해주세요</h2>
            <p>
              안전한 계정 사용을 위해 현재
              비밀번호를 먼저 확인합니다.
            </p>
          </div>

          <label className="password-change-field">
            <span>현재 비밀번호</span>
            <input
              type="password"
              value={currentPassword}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="current-password"
              placeholder="현재 비밀번호를 입력해주세요"
              disabled={isProcessing}
              onChange={updatePassword(
                setCurrentPassword,
              )}
            />
          </label>

          <label className="password-change-field">
            <span>새 비밀번호</span>
            <input
              type="password"
              value={newPassword}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              placeholder="새 비밀번호를 입력해주세요"
              disabled={isProcessing}
              onChange={updatePassword(
                setNewPassword,
              )}
            />
            <small>
              {PASSWORD_MIN_LENGTH}~{PASSWORD_MAX_LENGTH}자로
              입력해주세요.
            </small>
          </label>

          <label className="password-change-field">
            <span>새 비밀번호 확인</span>
            <input
              type="password"
              value={newPasswordConfirm}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              placeholder="새 비밀번호를 다시 입력해주세요"
              disabled={isProcessing}
              onChange={updatePassword(
                setNewPasswordConfirm,
              )}
            />
          </label>

          {errorMessage && (
            <p
              className="password-change-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="password-change-actions">
            <button
              type="button"
              className="password-change-cancel"
              disabled={isProcessing}
              onClick={handleBack}
            >
              취소
            </button>
            <button
              type="submit"
              className="password-change-submit"
              disabled={
                isProcessing ||
                !currentPassword ||
                !newPassword ||
                !newPasswordConfirm
              }
            >
              {isProcessing
                ? '변경 중'
                : '변경하기'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

export default PasswordChangePage
