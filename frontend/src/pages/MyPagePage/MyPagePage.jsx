import {
  useEffect,
  useState,
} from 'react'

import {
  Bell,
  ChevronRight,
  KeyRound,
  LogOut,
  Pencil,
  Trash2,
  UserRound,
  UserRoundX,
} from 'lucide-react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  deleteCurrentUser,
  disconnectCouple,
  getMyPageProfile,
  logoutCurrentUser,
} from '../../api/myPageApi.js'

import BottomNavigation from '../../components/common/BottomNavigation/BottomNavigation.jsx'

import './MyPagePage.css'

const CONFIRM_ACTIONS = {
  disconnect: {
    title: '연인 연결을 끊을까요?',
    description:
      '연인과의 연결이 해제됩니다. 저장된 데이터의 처리 방식은 추후 백엔드 정책에 따라 적용됩니다.',
    confirmLabel: '연결 끊기',
  },

  deleteAccount: {
    title: '정말 회원 탈퇴할까요?',
    description:
      '회원 탈퇴를 요청하면 계정과 관련된 데이터를 더 이상 이용할 수 없습니다.',
    confirmLabel: '회원 탈퇴',
  },
}

function MyPagePage() {
  const navigate = useNavigate()

  const [profile, setProfile] =
    useState(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [isProcessing, setIsProcessing] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [confirmAction, setConfirmAction] =
    useState(null)

  useEffect(() => {
    let isCancelled = false

    getMyPageProfile()
      .then((profileData) => {
        if (isCancelled) {
          return
        }

        setProfile(profileData)
        setErrorMessage('')
        setIsLoading(false)
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error.message ||
            '사용자 정보를 불러오지 못했습니다.',
        )

        setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const openNotificationSettings = () => {
    window.alert(
      '알림 설정 화면은 추후 연결됩니다.',
    )
  }

  const openPasswordChange = () => {
    window.alert(
      '비밀번호 변경 화면은 추후 연결됩니다.',
    )
  }

  const openProfileEdit = () => {
    navigate('/mypage/profile-edit')
  }

  const handleLogout = async () => {
    if (isProcessing) {
      return
    }

    try {
      setIsProcessing(true)

      await logoutCurrentUser()

      window.alert(
        '로그아웃 처리되었습니다. 로그인 화면은 인증 기능 구현 후 연결됩니다.',
      )
    } catch (error) {
      window.alert(
        error.message ||
          '로그아웃에 실패했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const openConfirmModal = (actionType) => {
    if (isProcessing) {
      return
    }

    setConfirmAction(actionType)
  }

  const closeConfirmModal = () => {
    if (isProcessing) {
      return
    }

    setConfirmAction(null)
  }

  const executeConfirmedAction = async () => {
    if (
      !confirmAction ||
      isProcessing
    ) {
      return
    }

    try {
      setIsProcessing(true)

      if (confirmAction === 'disconnect') {
        const updatedProfile =
          await disconnectCouple()

        setProfile(updatedProfile)

        window.alert(
          '연인 연결이 해제되었습니다.',
        )
      }

      if (
        confirmAction === 'deleteAccount'
      ) {
        const updatedProfile =
          await deleteCurrentUser()

        setProfile(updatedProfile)

        window.alert(
          '회원 탈퇴 요청이 처리되었습니다.',
        )
      }

      setConfirmAction(null)
    } catch (error) {
      window.alert(
        error.message ||
          '요청을 처리하지 못했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const confirmInformation =
    confirmAction
      ? CONFIRM_ACTIONS[confirmAction]
      : null

  return (
    <div className="mypage-page">
      <header className="mypage-header">
        <div className="mypage-header-spacer" />

        <h1>마이페이지</h1>

        <button
          type="button"
          className="mypage-notification-button"
          aria-label="알림 설정"
          onClick={openNotificationSettings}
        >
          <Bell
            size={22}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </button>
      </header>

      <main className="mypage-scroll-area">
        {isLoading && (
          <div className="mypage-status">
            <span className="mypage-loading-spinner" />

            <p>
              사용자 정보를 불러오고 있습니다.
            </p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="mypage-status mypage-status-error">
            <p>{errorMessage}</p>
          </div>
        )}

        {!isLoading &&
          !errorMessage &&
          profile && (
            <>
              <section className="mypage-profile-card">
                <div className="mypage-profile-image">
                  {profile.profileImageUrl ? (
                    <img
                      src={
                        profile.profileImageUrl
                      }
                      alt={`${profile.nickname} 프로필`}
                    />
                  ) : (
                    <UserRound
                      size={42}
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="mypage-profile-information">
                  <div className="mypage-profile-title-row">
                    <h2>
                      {profile.nickname}
                    </h2>

                    <button
                      type="button"
                      className="mypage-profile-edit-button"
                      disabled={isProcessing}
                      onClick={openProfileEdit}
                    >
                      <Pencil
                        size={13}
                        strokeWidth={2}
                        aria-hidden="true"
                      />

                      <span>수정</span>
                    </button>
                  </div>

                  <p className="mypage-profile-email">
                    {profile.email}
                  </p>

                  <p className="mypage-profile-message">
                    {profile.statusMessage ||
                      '등록된 상태 메시지가 없습니다.'}
                  </p>

                  {profile.isCoupleConnected && (
                    <span className="mypage-couple-badge">
                      {profile.partnerNickname
                        ? `${profile.partnerNickname}님과 연결 중`
                        : '연인과 연결 중'}
                    </span>
                  )}
                </div>
              </section>

              <section
                className="mypage-menu-card"
                aria-label="마이페이지 메뉴"
              >
                <button
                  type="button"
                  className="mypage-menu-item"
                  onClick={
                    openNotificationSettings
                  }
                >
                  <span className="mypage-menu-icon">
                    <Bell
                      size={21}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    알림 설정
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  className="mypage-menu-item"
                  onClick={openPasswordChange}
                >
                  <span className="mypage-menu-icon">
                    <KeyRound
                      size={21}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    비밀번호 변경
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  className="mypage-menu-item"
                  disabled={isProcessing}
                  onClick={handleLogout}
                >
                  <span className="mypage-menu-icon">
                    <LogOut
                      size={21}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    로그아웃
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  className="mypage-menu-item"
                  disabled={
                    isProcessing ||
                    !profile.isCoupleConnected
                  }
                  onClick={() =>
                    openConfirmModal(
                      'disconnect',
                    )
                  }
                >
                  <span className="mypage-menu-icon">
                    <UserRoundX
                      size={21}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    연인 끊기
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  className="mypage-menu-item mypage-menu-item-danger"
                  disabled={
                    isProcessing ||
                    profile.userStatus ===
                      'DELETED'
                  }
                  onClick={() =>
                    openConfirmModal(
                      'deleteAccount',
                    )
                  }
                >
                  <span className="mypage-menu-icon">
                    <Trash2
                      size={21}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    회원 탈퇴
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={19}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
              </section>
            </>
          )}
      </main>

      <BottomNavigation />

      {confirmInformation && (
        <div
          className="mypage-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !isProcessing
            ) {
              closeConfirmModal()
            }
          }}
        >
          <section
            className="mypage-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mypage-confirm-title"
          >
            <span className="mypage-confirm-icon">
              {confirmAction ===
              'deleteAccount' ? (
                <Trash2
                  size={24}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              ) : (
                <UserRoundX
                  size={24}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              )}
            </span>

            <h2 id="mypage-confirm-title">
              {confirmInformation.title}
            </h2>

            <p>
              {confirmInformation.description}
            </p>

            <div className="mypage-confirm-actions">
              <button
                type="button"
                className="mypage-confirm-cancel"
                disabled={isProcessing}
                onClick={closeConfirmModal}
              >
                취소
              </button>

              <button
                type="button"
                className="mypage-confirm-submit"
                disabled={isProcessing}
                onClick={
                  executeConfirmedAction
                }
              >
                {isProcessing
                  ? '처리 중'
                  : confirmInformation.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default MyPagePage