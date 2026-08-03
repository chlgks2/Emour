import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Plus } from 'lucide-react'

import {
  createCoupleInvitation,
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

      const invitation =
        await createCoupleInvitation()

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
    } catch (error) {
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
      saveCurrentCoupleRoom(
        connectedRoom,
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
