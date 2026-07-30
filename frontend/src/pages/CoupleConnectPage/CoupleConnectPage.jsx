import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  connectCouple,
  createCoupleInvitation,
} from '../../api/coupleApi.js'

import {
  clearPendingCoupleRoom,
  saveCurrentCoupleRoom,
  savePendingCoupleRoom,
} from '../../utils/pendingCoupleRoom.js'

import './CoupleConnectPage.css'

function CoupleConnectPage() {
  const navigate = useNavigate()
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

      savePendingCoupleRoom(invitation)

      navigate('/calendar', {
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
        await connectCouple(
          trimmedRoomCode,
        )

      clearPendingCoupleRoom()
      saveCurrentCoupleRoom(
        connectedRoom,
      )

      setFeedback({
        type: 'success',
        message: '커플 연결이 완료되었습니다.',
      })

      navigate('/calendar', {
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
    <main className="couple-connect-page">
      <section className="couple-connect-content">
        <div
          className="couple-heart-symbol"
          aria-hidden="true"
        >
          <span className="couple-heart-icon">♥</span>
        </div>

        <div className="couple-connect-heading">
          <p className="couple-connect-eyebrow">
            TOGETHER, FROM NOW ON
          </p>

          <h1>
            우리만의 공간을
            <br />
            시작해볼까요?
          </h1>

          <p className="couple-connect-description">
            새로운 방을 만들거나
            <br />
            전달받은 코드로 연인과 연결해보세요.
          </p>
        </div>

        {feedback.message && (
          <p
            className={`connect-feedback connect-feedback-${feedback.type}`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </p>
        )}

        <button
          type="button"
          className="create-room-button"
          onClick={handleCreateRoom}
          disabled={isLoading}
        >
          <span
            className="create-room-icon"
            aria-hidden="true"
          >
            ＋
          </span>

          {isLoading
            ? '처리 중...'
            : '방 생성하기'}
        </button>

        <div
          className="connect-divider"
          aria-hidden="true"
        >
          <span>또는</span>
        </div>

        <form
          className="room-code-form"
          onSubmit={handleJoinRoom}
        >
          <div className="room-code-heading">
            <h2>방 코드로 참여하기</h2>

            <p>
              연인에게 전달받은 방 코드를 입력해주세요.
            </p>
          </div>

          <label htmlFor="roomCode">
            방 코드
          </label>

          <div className="room-code-input-wrapper">
            <input
              id="roomCode"
              name="roomCode"
              type="text"
              value={roomCode}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              disabled={isLoading}
              onChange={handleRoomCodeChange}
            />
          </div>

          <button
            type="submit"
            className="join-room-button"
            disabled={
              !roomCode.trim() ||
              isLoading
            }
          >
            {isLoading
              ? '처리 중...'
              : '연결하기'}
          </button>
        </form>

      </section>
    </main>
  )
}

export default CoupleConnectPage
