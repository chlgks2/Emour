import { useState } from 'react'

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

function createLocalDate(dateKey) {
  const [year, month, day] =
    dateKey.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function getRelationshipInformation(
  startDate,
) {
  if (!startDate) {
    return null
  }

  const start = createLocalDate(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const millisecondsPerDay =
    24 * 60 * 60 * 1000
  const daysTogether = Math.max(
    1,
    Math.floor(
      (today.getTime() -
        start.getTime()) /
        millisecondsPerDay,
    ) + 1,
  )
  const nextMilestone =
    Math.ceil(daysTogether / 100) * 100
  const nextDate = new Date(start)

  nextDate.setDate(
    nextDate.getDate() +
      nextMilestone -
      1,
  )

  return {
    daysTogether,
    nextMilestone,
    nextDate: [
      nextDate.getFullYear(),
      String(
        nextDate.getMonth() + 1,
      ).padStart(2, '0'),
      String(nextDate.getDate()).padStart(
        2,
        '0',
      ),
    ].join('-'),
  }
}

function AnniversaryManager({
  anniversaries,
  isLoading,
  isProcessing,
  relationshipStartDate,
  onClose,
  onCreate,
  onEdit,
  onSaveRelationshipStartDate,
}) {
  const [
    relationshipStartDateDraft,
    setRelationshipStartDateDraft,
  ] = useState(
    relationshipStartDate ?? '',
  )

  const relationshipInformation =
    getRelationshipInformation(
      relationshipStartDate,
    )

  const handleRelationshipSubmit =
    (event) => {
      event.preventDefault()

      if (
        !relationshipStartDateDraft ||
        isProcessing
      ) {
        return
      }

      onSaveRelationshipStartDate(
        relationshipStartDateDraft,
      )
    }

  return (
    <div
      className="anniversary-manager-backdrop"
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
        className="anniversary-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anniversary-manager-title"
      >
        <div className="anniversary-manager-handle" />

        <header>
          <div>
            <p>OUR SPECIAL DAYS</p>

            <h2 id="anniversary-manager-title">
              기념일 관리
            </h2>
          </div>

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

        <form
          className="relationship-start-card"
          onSubmit={
            handleRelationshipSubmit
          }
        >
          <div className="relationship-start-heading">
            <span>
              <Heart
                size={17}
                strokeWidth={1.9}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>연애 시작일</strong>
              <small>
                100일 단위 기념일의 기준
              </small>
            </div>
          </div>

          <div className="relationship-start-input">
            <input
              type="date"
              value={
                relationshipStartDateDraft
              }
              disabled={isProcessing}
              onChange={(event) =>
                setRelationshipStartDateDraft(
                  event.target.value,
                )
              }
            />

            <button
              type="submit"
              disabled={
                isProcessing ||
                !relationshipStartDateDraft ||
                relationshipStartDateDraft ===
                  relationshipStartDate
              }
            >
              저장
            </button>
          </div>

          {relationshipInformation && (
            <div className="relationship-start-summary">
              <span>
                함께한 지{' '}
                <strong>
                  {
                    relationshipInformation.daysTogether
                  }
                  일
                </strong>
              </span>

              <span>
                다음{' '}
                {
                  relationshipInformation.nextMilestone
                }
                일 ·{' '}
                {formatDate(
                  relationshipInformation.nextDate,
                )}
              </span>
            </div>
          )}
        </form>

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
