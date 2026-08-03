import {
  useCallback,
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
  regenerateRoomCode,
  resolveReconnectRoomCode,
  updatePartnerNickname,
  withdrawCurrentUser,
} from '../../api/myPageApi.js'
import {
  getCoupleStatus,
} from '../../api/coupleApi.js'

import BottomNavigation from '../../components/common/BottomNavigation/BottomNavigation.jsx'

import PartnerNicknameModal from '../../components/mypage/PartnerNicknameModal/PartnerNicknameModal.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useLiveSync } from '../../hooks/useLiveSync.js'

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

const COUPLE_STATUS_POLL_INTERVAL = 2000

/**
 * 확인 모달 문구.
 * '방 나가기'는 방 상태마다 실제로 벌어지는 일이 달라서 설명도 달라야 한다.
 *   WAITING  : 아직 아무도 안 들어온 방과 초대 코드를 지운다
 *   INACTIVE : 상대가 이미 나간 방을 정리한다 (되돌릴 수 없다)
 *   ACTIVE   : 연결을 끊는다
 *
 * 사용자를 부를 때는 닉네임을 쓴다. 화면이 '~해요' 로 사용자에게 말을 걸면서
 * 정작 그 사람을 '나' 라고 부르면 한 문장 안에서 1인칭과 2인칭이 섞인다.
 */
function buildConfirmInformation({
  confirmAction,
  roomStatus,
  nickname,
}) {
  if (!confirmAction) {
    return null
  }

  const baseInformation =
    CONFIRM_ACTIONS[confirmAction]

  if (confirmAction !== 'leaveRoom') {
    return baseInformation
  }

  if (roomStatus === 'WAITING') {
    return {
      ...baseInformation,
      title: '대기 중인 방을 삭제할까요?',
      description:
        '아직 연인이 참여하지 않은 방과 초대 코드가 삭제되며, 연인 연결 화면으로 이동합니다.',
      confirmLabel: '방 삭제',
    }
  }

  if (roomStatus === 'INACTIVE') {
    return {
      ...baseInformation,
      title: '이 방을 없앨까요?',
      description: `연인은 아직 방 코드로 이 방에 돌아올 수 있습니다. ${nickname}님까지 나가면 방이 사라져 되돌릴 수 없습니다.`,
      confirmLabel: '방 나가기',
    }
  }

  return baseInformation
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

/**
 * 커플 연결 줄에 놓는 연인 프로필 원.
 * 사진이 아직 없을 수 있어(가입 직후 등) 빈 원 대신 사람 아이콘을 둔다.
 */
function PartnerAvatar({ imageUrl, label }) {
  return (
    <span
      className="mypage-partner-avatar"
      role="img"
      aria-label={label}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : (
        <UserRound
          size={17}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      )}
    </span>
  )
}

function MyPagePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

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

  const loadProfile = useCallback(
    async () => {
      try {
        const profileData =
          await getMyPageProfile()

        setProfile(profileData)
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          error.message ||
            '사용자 정보를 불러오지 못했습니다.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    Promise.resolve().then(loadProfile)
  }, [loadProfile])

  useLiveSync(loadProfile)

  useEffect(() => {
    if (
      !profile?.hasRoom ||
      ![
        'ACTIVE',
        'WAITING',
      ].includes(profile.roomStatus)
    ) {
      return undefined
    }

    let isCancelled = false
    let isChecking = false

    const refreshRoomState =
      async () => {
        if (isChecking || isCancelled) {
          return
        }

        isChecking = true

        try {
          const coupleStatus =
            await getCoupleStatus()

          if (
            isCancelled ||
            coupleStatus?.status ===
              profile.roomStatus
          ) {
            return
          }

          const updatedProfile =
            await getMyPageProfile()

          if (isCancelled) {
            return
          }

          setProfile(updatedProfile)
          setErrorMessage('')
        } catch (error) {
          /*
           * ACTIVE 방에서 상대방이 나가면 기존 방은 조회되지 않습니다.
           * 이 경우 getMyPageProfile이 남은 사용자의 새 대기 방과
           * 초대 코드를 발급해 WAITING 상태로 복구합니다.
           */
          if (
            isCancelled ||
            profile.roomStatus !==
              'ACTIVE' ||
            error?.status !== 404
          ) {
            return
          }

          try {
            const updatedProfile =
              await getMyPageProfile()

            if (isCancelled) {
              return
            }

            setProfile(updatedProfile)
            setErrorMessage('')
          } catch {
            // 자동 복구 실패는 다음 폴링 또는 화면 재진입 때 다시 시도합니다.
          }
          // 대기 상태 확인은 백그라운드 작업이므로
          // 일시적인 실패가 마이페이지 전체를 가리지 않게 합니다.
        } finally {
          isChecking = false
        }
      }

    const intervalId =
      window.setInterval(
        refreshRoomState,
        COUPLE_STATUS_POLL_INTERVAL,
      )

    const handlePageFocus = () => {
      refreshRoomState()
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        refreshRoomState()
      }
    }

    window.addEventListener(
      'focus',
      handlePageFocus,
    )
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener(
        'focus',
        handlePageFocus,
      )
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [
    profile?.hasRoom,
    profile?.roomStatus,
  ])

  const openNotificationSettings = () => {
  navigate(
      '/mypage/notification-settings',
    )
  }

  const openPasswordChange = () => {
    navigate('/mypage/password-change')
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

  /*
   * 재연결 코드 복사.
   *
   * 초대 코드 복사(handleCopyRoomCode)와 나누어 둔다. 만료를 따지지 않고
   * (재연결 경로는 만료를 보지 않는다), 이 기기에 코드가 없으면 서버에
   * 발급을 요청하는 단계가 하나 더 있다.
   */
  const handleCopyReconnectCode =
    async () => {
      if (isProcessing) {
        return
      }

      try {
        setIsProcessing(true)

        const reconnectCode =
          await resolveReconnectRoomCode(
            profile?.userId,
          )

        if (!reconnectCode) {
          window.alert(
            '재연결 코드를 불러오지 못했습니다.\n잠시 후 다시 시도해주세요.',
          )
          return
        }

        await navigator.clipboard.writeText(
          reconnectCode,
        )

        setIsRoomCodeCopied(true)

        window.setTimeout(() => {
          setIsRoomCodeCopied(false)
        }, 1500)
      } catch {
        window.alert(
          '재연결 코드를 복사하지 못했습니다.',
        )
      } finally {
        setIsProcessing(false)
      }
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

      await logout()

      window.alert(
        '로그아웃 처리되었습니다.',
      )
    } catch (error) {
      console.error(
        '서버 로그아웃 요청 실패:',
        error,
      )
    } finally {
      setIsProcessing(false)
      navigate('/login', {
        replace: true,
      })
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
          const wasWaitingRoom =
            profile?.roomStatus ===
            'WAITING'

          const updatedProfile =
            await leaveCoupleRoom()

          if (updatedProfile) {
            setProfile(updatedProfile)
          }

          setIsRoomCodeVisible(false)
          setConfirmAction(null)

          window.alert(
            wasWaitingRoom
              ? '대기 중인 방을 삭제했습니다.'
              : '방에서 나왔습니다.',
          )

          navigate('/couple/connect', {
            replace: true,
          })

          return
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

          try {
            await logout()
          } catch (logoutError) {
            // 탈퇴가 완료됐다면 서버 로그아웃 실패와 관계없이
            // 로컬 인증 상태를 종료하고 로그인 화면으로 이동한다.
            console.error(
              '탈퇴 후 서버 로그아웃 요청 실패:',
              logoutError,
            )
          }

          window.alert(
            '회원 탈퇴 요청이 처리되었습니다.',
          )

          navigate('/login', {
            replace: true,
          })

          return
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

  const roomStatusInformation =
    profile?.roomStatus
      ? ROOM_STATUS_INFORMATION[
          profile.roomStatus
        ]
      : null

  /*
   * CoupleRouteGuard 가 WAITING 상태의 모든 경로를 여기로 돌려보낸다.
   * 그런데 하단 탭은 그대로 떠 있어서, 어느 탭을 눌러도 다시 이 화면으로
   * 튕겨 나왔다. 갈 수 없는 곳을 보여주고 누르게 두는 셈이라 탭을 감춘다.
   * (가드와 같은 조건이어야 한다. INACTIVE 는 가드가 통과시키므로 제외)
   */
  const isWaitingForPartner =
    profile?.roomStatus === 'WAITING'

  /*
   * 상대방이 나간 뒤. 방은 INACTIVE 로 남고 나는 아직 그 방의 멤버다.
   * '연결 전'과 겉모습이 같아서는 안 된다. 연결한 적이 없는 상태가 아니라
   * 끝난 상태이고, 사용자가 할 일도 다르다(코드 전달 X, 방 정리 O).
   */
  const isRoomEnded =
    profile?.roomStatus === 'INACTIVE'

  const confirmInformation =
    buildConfirmInformation({
      confirmAction,
      roomStatus: profile?.roomStatus,
      nickname: profile?.nickname ?? '회원',
    })

  return (
    <div className="mypage-page">
      <header className="mypage-header">
        <h1>마이페이지</h1>
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

              {/*
                방 이름('우리 방')과 'COUPLE ROOM' 눈썹 문구를 걷어냈다.
                방은 커플당 하나뿐이라 이름이 정보를 더하지 않고,
                이름이 빠지면 그 위 눈썹 문구도 가리킬 대상이 없어진다.
                대신 섹션 제목을 카드 밖으로 빼서 위계를 만든다.
              */}
              {/*
                상태는 섹션 제목 오른쪽에 딱지로 붙인다.
                카드 안에 다시 제목 줄을 만들 필요가 없고, 목록을 훑을 때
                '커플 연결 — 연결 중' 이 한 줄로 읽힌다.
              */}
              <div className="mypage-section-head">
                <h2 className="mypage-section-title">
                  커플 연결 상대
                </h2>

                {profile.hasRoom && (
                  <span
                    className={`mypage-room-status mypage-room-status-${profile.roomStatus?.toLowerCase()}`}
                  >
                    {roomStatusInformation?.label ||
                      '상태 확인 중'}
                  </span>
                )}
              </div>

              {profile.hasRoom ? (
                <section className="mypage-room-section">
                  {/*
                    상태 설명 문구('연인과 같은 방을 이용하고 있어요.')는
                    위 딱지가 이미 같은 말을 하고 있어 지웠다.
                    함께한 날짜도 홈 화면이 매일 보여주므로 여기서는 빼고,
                    연결 상대 한 줄만 남겨 애칭 수정 동선을 분명히 한다.

                    사진은 연인 것 하나만 둔다. 이 줄이 말하는 건 '연결 상대가
                    누구인가'인데, 내 사진은 바로 위 프로필 영역에 이미 크게
                    떠 있어서 두 번 나올 이유가 없다.
                    아직 상대가 없을 때는 점선 빈 자리가 글자보다 먼저 알려준다.
                  */}
                  <div className="mypage-partner-row">
                    {profile.isCoupleConnected ? (
                      <PartnerAvatar
                        imageUrl={
                          profile.partnerProfileImageUrl
                        }
                        label={`${profile.partnerNickname || '연인'} 프로필 사진`}
                      />
                    ) : (
                      <span
                        className="mypage-partner-avatar mypage-partner-avatar-empty"
                        aria-hidden="true"
                      />
                    )}

                    {/*
                      '연결 상대' 라벨은 섹션 제목이 이미 하고 있는 말이라 뺐다.
                      버튼은 이름 바로 옆에 둔다. 오른쪽 끝으로 밀어두면
                      무엇의 애칭을 고치는 버튼인지가 멀어진다.
                    */}
                    <div className="mypage-partner-info">
                      <strong>
                        {profile.isCoupleConnected
                          ? `${profile.partnerNickname || '연인'}님`
                          : isRoomEnded
                            ? '연결이 끝났어요'
                            : '아직 연결되지 않았어요'}
                      </strong>

                      {profile.isCoupleConnected && (
                        <button
                          type="button"
                          className="mypage-partner-edit-button"
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

                          <span>애칭 수정</span>
                        </button>
                      )}

                      {/*
                        재연결 수단을 상태 바로 옆에 둔다.
                        '연결이 끝났어요' 를 읽은 그 자리에서 되돌릴 방법이
                        보여야 아래 '방 나가기' 를 되돌리기 버튼으로 오해하지 않는다.

                        이 기기에 코드가 없으면 눌렀을 때 서버에 발급을 요청한다.
                        (resolveReconnectRoomCode)
                      */}
                      {isRoomEnded && (
                        <button
                          type="button"
                          className="mypage-partner-edit-button"
                          disabled={isProcessing}
                          onClick={
                            handleCopyReconnectCode
                          }
                        >
                          <Copy
                            size={13}
                            strokeWidth={2}
                            aria-hidden="true"
                          />

                          <span>
                            {isRoomCodeCopied
                              ? '복사됨'
                              : '재연결 코드 복사'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/*
                    방 상태 안내는 두 경우 모두 같은 자리에 둔다.
                    상태 줄 바로 아래, 방 코드/방 나가기 바로 위.
                    지금 이 방이 어떤 상태인지 -> 그래서 무엇을 하면 되는지 순서로
                    읽히고, 이어지는 방 코드 영역이 그 '무엇을'을 그대로 받는다.
                    (페이지 맨 위에 두면 이 방 이야기인지가 멀어진다)
                  */}
                  {isWaitingForPartner && (
                    <div
                      className="mypage-notice-banner"
                      role="status"
                    >
                      <span className="mypage-notice-icon">
                        <UsersRound
                          size={19}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </span>

                      <div>
                        <strong>
                          연인의 참여를 기다리고 있어요
                        </strong>

                        <p>
                          아래 방 코드를 전달해주세요. 연인이 참여하면 대화·캘린더·앨범이 함께 열려요.
                        </p>
                      </div>
                    </div>
                  )}

                  {/*
                    끝난 상태가 아니라 되돌릴 수 있는 상태다. 방 코드는 그대로
                    살아 있고, 나간 연인이 그 코드를 다시 넣으면 이 방으로
                    돌아온다. 그래서 '못 쓴다'가 아니라 '돌아올 수 있다'를 먼저 말한다.
                  */}
                  {isRoomEnded && (
                    <div
                      className="mypage-notice-banner mypage-notice-banner-ended"
                      role="status"
                    >
                      <span className="mypage-notice-icon">
                        <DoorOpen
                          size={19}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </span>

                      <div>
                        <strong>
                          연인이 방에서 나갔어요
                        </strong>

                        <p>
                          위 &lsquo;재연결 코드 복사&rsquo;를 눌러 코드를 연인에게 다시
                          전달하면 이 방으로 돌아올 수 있어요.{' '}
                          {profile.nickname}님까지 방을 나가면 방이 사라져서
                          되돌릴 수 없어요.
                        </p>
                      </div>
                    </div>
                  )}

                  {/*
                    방 코드 패널은 초대 대기 중일 때만.
                    상대가 나간 방에서는 이 자리에 '코드 재발급'과 만료 표시가
                    같이 붙는데, 그 상태에서 재발급은 서버가 거절하고
                    재연결 코드는 만료를 보지도 않아 둘 다 틀린 말이 된다.
                  */}
                  {isWaitingForPartner &&
                    profile.roomCode && (
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
                  )}

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

              <h2 className="mypage-section-title">
                설정
              </h2>

              {/*
                네 줄뿐인 목록이라 카드로 다시 묶을 필요가 없다.
                위의 '설정' 제목이 이미 묶어주고 있어서, 카드는 같은 일을
                한 번 더 하면서 화면에 상자만 하나 더 얹고 있었다.
                구분선만 남기고 아이콘 액자도 뺐다.
              */}
              <section
                className="mypage-menu-list"
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
                      size={20}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    알림 설정
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={18}
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
                      size={20}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    비밀번호 변경
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={18}
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
                      size={20}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    로그아웃
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={18}
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
                      size={20}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="mypage-menu-label">
                    회원 탈퇴
                  </span>

                  <ChevronRight
                    className="mypage-menu-chevron"
                    size={18}
                    aria-hidden="true"
                  />
                </button>
              </section>
            </>
          )}
      </main>

      {!isLoading && !isWaitingForPartner && (
        <BottomNavigation />
      )}

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
