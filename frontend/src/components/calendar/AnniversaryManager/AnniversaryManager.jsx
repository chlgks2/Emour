import {
  ChevronRight,
  Heart,
  Plus,
  X,
} from 'lucide-react'

import './AnniversaryManager.css'

function formatDate(dateKey) {
  if (!dateKey) {
    return ''
  }

  const [year, month, day] =
    dateKey.split('-')

  return `${year}.${month}.${day}`
}

function AnniversaryManager({
  anniversaries,
  isLoading,
  isProcessing,
  onClose,
  onCreate,
  onEdit,
}) {
  return (
    <div
      className="sheet-backdrop anniversary-manager-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !isProcessing
        ) {
          onClose()
        }
      }}
    >
      <section
        className="sheet-panel anniversary-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anniversary-manager-title"
      >
        <div className="sheet-handle" />

        <header>
          {/* 눈썹 문구(OUR SPECIAL DAYS)는 바로 아래 제목과 같은 말이라 뺐다 */}
          <h2 id="anniversary-manager-title">
            기념일 관리
          </h2>

          <button
            type="button"
            className="anniversary-manager-close"
            aria-label="기념일 관리 닫기"
            disabled={isProcessing}
            onClick={onClose}
          >
            <X
              size={20}
              aria-hidden="true"
            />
          </button>
        </header>

        <button
          type="button"
          className="anniversary-manager-create"
          disabled={
            isLoading || isProcessing
          }
          onClick={onCreate}
        >
          <Plus
            size={18}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          새 기념일 추가
        </button>

        <div className="anniversary-manager-list">
          {isLoading ? (
            <p className="anniversary-manager-status">
              기념일을 불러오고 있습니다.
            </p>
          ) : anniversaries.length > 0 ? (
            anniversaries.map(
              (anniversary) => (
                <button
                  key={
                    anniversary.scheduleId
                  }
                  type="button"
                  className="anniversary-manager-item"
                  disabled={isProcessing}
                  onClick={() =>
                    onEdit(anniversary)
                  }
                >
                  <span className="anniversary-manager-icon">
                    <Heart
                      size={18}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="anniversary-manager-information">
                    <strong>
                      {anniversary.name}
                    </strong>

                    <small>
                      {formatDate(
                        anniversary.startDate,
                      )}
                    </small>
                  </span>

                  <ChevronRight
                    size={17}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
              ),
            )
          ) : (
            <div className="anniversary-manager-empty">
              <Heart
                size={26}
                strokeWidth={1.5}
                aria-hidden="true"
              />

              <strong>
                등록된 기념일이 없어요
              </strong>

              <p>
                두 사람의 소중한 날을
                추가해보세요.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default AnniversaryManager
