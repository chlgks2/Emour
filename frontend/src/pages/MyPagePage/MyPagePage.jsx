import {
  useEffect,
  useState,
} from 'react'

import {
  Bell,
  ChevronRight,
  Copy,
  DoorOpen,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  LogOut,
  Pencil,
  RefreshCw,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  getMyPageProfile,
  leaveCoupleRoom,
  logoutCurrentUser,
  regenerateRoomCode,
  updatePartnerNickname,
  withdrawCurrentUser,
} from '../../api/myPageApi.js'

import BottomNavigation from '../../components/common/BottomNavigation/BottomNavigation.jsx'

import PartnerNicknameModal from '../../components/mypage/PartnerNicknameModal/PartnerNicknameModal.jsx'

import './MyPagePage.css'

const CONFIRM_ACTIONS = {
  leaveRoom: {
    title: '방에서 나가시겠어요?',
    description:
      '방과 기존 기록은 삭제되지 않습니다. 상대방에게 방 코드를 다시 전달받으면 같은 방에 재참여할 수 있습니다.',
    confirmLabel: '방 나가기',
  },

  withdrawAccount: {
    title: '정말 회원 탈퇴할까요?',
    description:
      '회원 탈퇴 후에는 계정과 서비스 데이터를 더 이상 이용할 수 없습니다.',
    confirmLabel: '회원 탈퇴',
  },
}

const ROOM_STATUS_INFORMATION = {
  ACTIVE: {
    label: '연결 중',
    description:
      '연인과 같은 방을 이용하고 있어요.',
  },

  WAITING: {
    label: '초대 대기 중',
    description:
      '방 코드를 전달해 상대방을 초대해주세요.',
  },

  INACTIVE: {
    label: '종료된 방',
    description:
      '현재 사용할 수 없는 방입니다.',
  },
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  ).format(date)
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

  const [
    isPartnerNicknameModalOpen,
    setIsPartnerNicknameModalOpen,
  ] = useState(false)

  const [
    isRoomCodeVisible,
    setIsRoomCodeVisible,
  ] = useState(false)

  const [
    isRoomCodeCopied,
    setIsRoomCodeCopied,
  ] = useState(false)

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

  const openCoupleConnectPage = () => {
    navigate('/couple/connect')
  }

  const openPartnerNicknameModal = () => {
    if (
      !profile?.isCoupleConnected ||
      isProcessing
    ) {
      return
    }

    setIsPartnerNicknameModalOpen(true)
  }

  const closePartnerNicknameModal = () => {
    setIsPartnerNicknameModalOpen(false)
  }

  const handlePartnerNicknameSave =
    async (partnerNickname) => {
      const updatedProfile =
        await updatePartnerNickname({
          partnerNickname,
        })

      setProfile(updatedProfile)
    }

  const handleCopyRoomCode = async () => {
    if (
      !profile?.roomCode ||
      profile.isRoomCodeExpired
    ) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        profile.roomCode,
      )

      setIsRoomCodeCopied(true)

      window.setTimeout(() => {
        setIsRoomCodeCopied(false)
      }, 1500)
    } catch {
      window.alert(
        '방 코드를 복사하지 못했습니다.',
      )
    }
  }

  const handleRegenerateRoomCode =
    async () => {
      if (
        isProcessing ||
        !profile?.hasRoom
      ) {
        return
      }

      const shouldRegenerate =
        window.confirm(
          '방 코드를 새로 발급할까요?\n기존 코드는 더 이상 사용할 수 없습니다.',
        )

      if (!shouldRegenerate) {
        return
      }

      try {
        setIsProcessing(true)

        const updatedProfile =
          await regenerateRoomCode()

        setProfile(updatedProfile)
        setIsRoomCodeVisible(true)
        setIsRoomCodeCopied(false)

        window.alert(
          '새로운 방 코드가 발급되었습니다.',
        )
      } catch (error) {
        window.alert(
          error.message ||
            '방 코드를 재발급하지 못했습니다.',
        )
      } finally {
        setIsProcessing(false)
      }
    }

  const handleLogout = async () => {
    if (isProcessing) {
      return
    }

    try {
      setIsProcessing(true)

      await logoutCurrentUser()

      localStorage.removeItem(
        'accessToken',
      )

      window.alert(
        '로그아웃 처리되었습니다.',
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

  const openConfirmModal = (
    actionType,
  ) => {
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

  const executeConfirmedAction =
    async () => {
      if (
        !confirmAction ||
        isProcessing
      ) {
        return
      }

      try {
        setIsProcessing(true)

        if (
          confirmAction ===
          'leaveRoom'
        ) {
          const updatedProfile =
            await leaveCoupleRoom()

          setProfile(updatedProfile)
          setIsRoomCodeVisible(false)

          window.alert(
            '방에서 나왔습니다.',
          )
        }

        if (
          confirmAction ===
          'withdrawAccount'
        ) {
          const updatedProfile =
            await withdrawCurrentUser()

          if (updatedProfile) {
            setProfile(updatedProfile)
          }

          localStorage.removeItem(
            'accessToken',
          )

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

  const roomStatusInformation =
    profile?.roomStatus
      ? ROOM_STATUS_INFORMATION[
          profile.roomStatus
        ]
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
                      disabled={
                        isProcessing ||
                        profile.userStatus ===
                          'WITHDRAWN'
                      }
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

                  {profile.isEmailVerified && (
                    <span className="mypage-email-badge">
                      이메일 인증 완료
                    </span>
                  )}
                </div>
              </section>

              {profile.hasRoom ? (
                <section className="mypage-room-card">
                  <div className="mypage-room-header">
                    <div>
                      <p className="mypage-card-eyebrow">
                        COUPLE ROOM
                      </p>

                      <h2>우리 방</h2>
                    </div>

                    <span
                      className={`mypage-room-status mypage-room-status-${profile.roomStatus?.toLowerCase()}`}
                    >
                      {roomStatusInformation?.label ||
                        '상태 확인 중'}
                    </span>
                  </div>

                  <p className="mypage-room-description">
                    {roomStatusInformation?.description}
                  </p>

                  <div className="mypage-room-information">
                    <div className="mypage-room-information-item">
                      <UsersRound
                        size={18}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />

                      <div>
                        <span>연결 상대</span>

                        <strong>
                          {profile.isCoupleConnected
                            ? `${profile.partnerNickname || '연인'}님`
                            : '아직 연결되지 않았어요'}
                        </strong>
                      </div>

                      {profile.isCoupleConnected && (
                        <button
                          type="button"
                          className="mypage-partner-edit-button"
                          aria-label="연인 애칭 수정"
                          disabled={isProcessing}
                          onClick={
                            openPartnerNicknameModal
                          }
                        >
                          <Pencil
                            size={13}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </div>

                    <div className="mypage-room-information-item">
                      <Link2
                        size={18}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />

                      <div>
                        <span>함께한 날짜</span>

                        <strong>
                          {formatDate(
                            profile.roomStartedAt,
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mypage-room-code-section">
                    <div className="mypage-room-code-title">
                      <div>
                        <span>방 코드</span>

                        <p>
                          상대방을 다시 초대할 때 사용할 수 있어요.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="mypage-room-code-visibility-button"
                        aria-label={
                          isRoomCodeVisible
                            ? '방 코드 숨기기'
                            : '방 코드 보기'
                        }
                        onClick={() =>
                          setIsRoomCodeVisible(
                            (previous) =>
                              !previous,
                          )
                        }
                      >
                        {isRoomCodeVisible ? (
                          <EyeOff
                            size={18}
                            aria-hidden="true"
                          />
                        ) : (
                          <Eye
                            size={18}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </div>

                    <div className="mypage-room-code-row">
                      <strong>
                        {isRoomCodeVisible
                          ? profile.roomCode
                          : '••••-••••'}
                      </strong>

                      <button
                        type="button"
                        className="mypage-room-copy-button"
                        disabled={
                          isProcessing ||
                          profile.isRoomCodeExpired
                        }
                        onClick={
                          handleCopyRoomCode
                        }
                      >
                        <Copy
                          size={15}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        <span>
                          {isRoomCodeCopied
                            ? '복사됨'
                            : '복사'}
                        </span>
                      </button>
                    </div>

                    <div className="mypage-room-code-footer">
                      <span
                        className={
                          profile.isRoomCodeExpired
                            ? 'mypage-room-code-expired'
                            : ''
                        }
                      >
                        {profile.isRoomCodeExpired
                          ? '방 코드가 만료되었습니다.'
                          : `${formatDate(
                              profile.roomCodeExpiresAt,
                            )}까지 유효`}
                      </span>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={
                          handleRegenerateRoomCode
                        }
                      >
                        <RefreshCw
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />

                        <span>코드 재발급</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mypage-leave-room-button"
                    disabled={isProcessing}
                    onClick={() =>
                      openConfirmModal(
                        'leaveRoom',
                      )
                    }
                  >
                    <DoorOpen
                      size={17}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />

                    <span>방 나가기</span>
                  </button>
                </section>
              ) : (
                <section className="mypage-connect-card">
                  <span className="mypage-connect-icon">
                    <UsersRound
                      size={26}
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>

                  <div>
                    <h2>
                      연인과 연결해보세요
                    </h2>

                    <p>
                      방을 만들거나 전달받은 방 코드로 참여할 수 있어요.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      openCoupleConnectPage
                    }
                  >
                    연인 연결하기
                  </button>
                </section>
              )}

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
                    aria-hidden="true"
                  />
                </button>

                <button
                  type="button"
                  className="mypage-menu-item mypage-menu-item-danger"
                  disabled={
                    isProcessing ||
                    profile.userStatus ===
                      'WITHDRAWN'
                  }
                  onClick={() =>
                    openConfirmModal(
                      'withdrawAccount',
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
                    aria-hidden="true"
                  />
                </button>
              </section>
            </>
          )}
      </main>

      <BottomNavigation />

      {isPartnerNicknameModalOpen && (
        <PartnerNicknameModal
          key={profile?.partnerNickname}
          initialNickname={
            profile?.partnerNickname ?? ''
          }
          onClose={
            closePartnerNicknameModal
          }
          onSave={
            handlePartnerNicknameSave
          }
        />
      )}

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
              'withdrawAccount' ? (
                <Trash2
                  size={24}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              ) : (
                <DoorOpen
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