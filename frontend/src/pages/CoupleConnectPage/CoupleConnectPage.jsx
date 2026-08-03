import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Plus } from 'lucide-react'

import {
  createCoupleInvitation,
  disconnectCouple,
  getCoupleStatus,
  joinOrReconnectCouple,
} from '../../api/coupleApi.js'

import Button from '../../components/common/Button'
import TextField from '../../components/common/TextField'

import {
  clearPendingCoupleRoom,
  saveCurrentCoupleRoom,
  savePendingCoupleRoom,
} from '../../utils/pendingCoupleRoom.js'
import {
  invalidateCoupleRoom,
} from '../../api/coupleRoomContext.js'
import { useAuth } from '../../hooks/useAuth.js'

import './CoupleConnectPage.css'

function CoupleConnectPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] =
    useState(false)
  const [feedback, setFeedback] = useState({
    type: '',
    message: '',
  })

  const handleRoomCodeChange = (event) => {
    setRoomCode(event.target.value)

    setFeedback({
      type: '',
      message: '',
    })
  }

  const finishRoomCreation = (
    invitation,
  ) => {
    if (!invitation?.invitationCode) {
      throw new Error(
        '초대 코드가 응답에 포함되지 않았습니다.',
      )
    }

    savePendingCoupleRoom(
      invitation,
      user?.userId,
    )
    // 방이 새로 생겼으니 캐시해 둔 roomId 를 버린다.
    invalidateCoupleRoom()

    navigate('/mypage', {
      replace: true,
    })
  }

  /**
   * 방 생성이 '이미 연결된 커플이 있습니다.'(409)로 막혔을 때.
   *
   * 서버가 보는 건 로컬 저장소가 아니라 couple_member 다. 아직 내가 어떤 방의
   * ACTIVE 멤버로 남아 있으면 새 방을 만들 수 없다. 두 경우가 있다.
   *
   *   ACTIVE   : 정말로 연결 중이다. 새 방을 만들 일이 아니다.
   *   INACTIVE : 연인은 나갔는데 나는 그 방에 남아 있다.
   *              이 방을 없애야 새로 시작할 수 있는데, 없애면 연인이
   *              재연결 코드로 돌아올 길도 같이 사라진다. 그래서 묻고 진행한다.
   *
   * 예전에는 서버 문구('이미 연결된 커플이 있습니다.')만 그대로 띄워서,
   * 왜 막혔는지도 무엇을 하면 되는지도 알 수 없었다.
   *
   * @returns {Promise<boolean>} 이 함수가 상황을 처리했으면 true
   */
  const resolveBlockedRoomCreation =
    async () => {
      const coupleStatus =
        await getCoupleStatus().catch(
          () => null,
        )

      if (
        coupleStatus?.status === 'ACTIVE'
      ) {
        setFeedback({
          type: 'error',
          message:
            '이미 연인과 연결되어 있어요. 마이페이지에서 방 상태를 확인해주세요.',
        })

        return true
      }

      if (
        coupleStatus?.status !==
        'INACTIVE'
      ) {
        return false
      }

      const shouldRemoveOldRoom =
        window.confirm(
          '연인이 나간 이전 방이 아직 남아 있어요.\n' +
            '이 방을 없애면 연인이 재연결 코드로 돌아올 수 없습니다.\n\n' +
            '방을 없애고 새로 만들까요?',
        )

      if (!shouldRemoveOldRoom) {
        setFeedback({
          type: 'error',
          message:
            '이전 방이 남아 있어 새 방을 만들 수 없어요. 마이페이지에서 방을 정리한 뒤 다시 시도해주세요.',
        })

        return true
      }

      await disconnectCouple()
      clearPendingCoupleRoom()
      invalidateCoupleRoom()

      finishRoomCreation(
        await createCoupleInvitation(),
      )

      return true
    }

  const handleCreateRoom = async () => {
    if (isLoading) {
      return
    }

    try {
      setIsLoading(true)
      setFeedback({
        type: 'info',
        message: '초대 코드를 생성하고 있습니다.',
      })

      finishRoomCreation(
        await createCoupleInvitation(),
      )
    } catch (error) {
      try {
        if (
          error?.status === 409 &&
          (await resolveBlockedRoomCreation())
        ) {
          return
        }
      } catch (retryError) {
        setFeedback({
          type: 'error',
          message:
            retryError.message ||
            '이전 방을 정리하지 못했습니다.',
        })

        return
      }

      setFeedback({
        type: 'error',
        message:
          error.message ||
          '초대 코드를 생성하지 못했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async (event) => {
    event.preventDefault()

    const trimmedRoomCode = roomCode.trim()

    if (!trimmedRoomCode || isLoading) {
      setFeedback({
        type: 'error',
        message: '방 코드를 입력해주세요.',
      })

      return
    }

    try {
      setIsLoading(true)
      setFeedback({
        type: 'info',
        message: '커플 연결을 확인하고 있습니다.',
      })

      const connectedRoom =
        await joinOrReconnectCouple(
          trimmedRoomCode,
        )

      clearPendingCoupleRoom()
      /*
       * 방에 들어올 때 쓴 코드를 같이 보관한다.
       * 이 코드는 방이 만들어질 때 정해진 값이고 서버에서 바뀌지 않는다.
       * 나중에 둘 중 한 사람이 나가 방이 INACTIVE 가 되면, 남은 쪽이 이 코드를
       * 다시 건네 상대를 돌아오게 할 수 있다. (POST /couples/reconnect)
       * 예전에는 방을 만든 쪽만 코드를 들고 있어서, 들어온 쪽이 남으면
       * 재연결 코드를 꺼낼 방법이 없었다.
       */
      saveCurrentCoupleRoom(
        {
          ...connectedRoom,
          // 서버는 코드를 대문자로 정규화해서 보관하므로 같은 형태로 맞춘다
          roomCode:
            trimmedRoomCode.toUpperCase(),
        },
        user?.userId,
      )
      invalidateCoupleRoom()

      setFeedback({
        type: 'success',
        message: '커플 연결이 완료되었습니다.',
      })

      navigate('/dashboard', {
        replace: true,
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error.message ||
          '커플 연결에 실패했습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <main className="couple-connect-page">
        <div className="couple-connect-content">
          <div
            className="couple-heart-symbol"
            aria-hidden="true"
          >
            <Heart size={28} />
          </div>

          <p className="couple-connect-eyebrow">
            TOGETHER, FROM NOW ON
          </p>

          <h1 className="couple-connect-title">
            우리만의 공간을
            <br />
            시작해볼까요?
          </h1>

          <p className="couple-connect-description">
            새로운 방을 만들거나
            <br />
            전달받은 코드로 연인과 연결해보세요.
          </p>

          {feedback.message && (
            <p
              className={`connect-feedback connect-feedback-${feedback.type}`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          )}

          <Button
            onClick={handleCreateRoom}
            loading={isLoading}
            className="couple-connect-cta"
          >
            <Plus size={18} aria-hidden="true" />
            방 생성하기
          </Button>

          <div
            className="connect-divider"
            aria-hidden="true"
          >
            <span />
            또는
            <span />
          </div>

          <form
            className="room-code-form"
            onSubmit={handleJoinRoom}
          >
            <h2 className="room-code-title">
              방 코드로 참여하기
            </h2>

            <p className="room-code-description">
              연인에게 전달받은 방 코드를 입력해주세요.
            </p>

            <TextField
              label="방 코드"
              name="roomCode"
              value={roomCode}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              disabled={isLoading}
              onChange={handleRoomCodeChange}
            />

            <Button
              type="submit"
              variant="outline"
              disabled={
                !roomCode.trim() || isLoading
              }
              className="room-code-submit"
            >
              연결하기
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default CoupleConnectPage
