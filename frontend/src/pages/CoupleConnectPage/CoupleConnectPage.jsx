import { useState } from 'react'
import './CoupleConnectPage.css'

function CoupleConnectPage() {
  const [roomCode, setRoomCode] = useState('')
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

  const handleCreateRoom = () => {
    /*
      추후 Spring 방 생성 API를 연결합니다.

      예시:
      POST /api/couple-rooms
    */

    setFeedback({
      type: 'info',
      message: '백엔드 연결 후 방 생성 기능이 실행됩니다.',
    })
  }

  const handleJoinRoom = (event) => {
    event.preventDefault()

    const trimmedRoomCode = roomCode.trim()

    if (!trimmedRoomCode) {
      setFeedback({
        type: 'error',
        message: '방 코드를 입력해주세요.',
      })

      return
    }

    /*
      추후 Spring 방 참여 API를 연결합니다.

      예시:
      POST /api/couple-rooms/join

      요청 데이터:
      {
        roomCode: trimmedRoomCode
      }
    */

    setFeedback({
      type: 'success',
      message: `${trimmedRoomCode} 방 코드를 확인했습니다.`,
    })
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

        <button
          type="button"
          className="create-room-button"
          onClick={handleCreateRoom}
        >
          <span
            className="create-room-icon"
            aria-hidden="true"
          >
            ＋
          </span>

          방 생성하기
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
              placeholder="방 코드를 입력해주세요"
              autoComplete="off"
              onChange={handleRoomCodeChange}
            />
          </div>

          <button
            type="submit"
            className="join-room-button"
            disabled={!roomCode.trim()}
          >
            연결하기
          </button>
        </form>

        {feedback.message && (
          <p
            className={`connect-feedback connect-feedback-${feedback.type}`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </p>
        )}
      </section>
    </main>
  )
}

export default CoupleConnectPage