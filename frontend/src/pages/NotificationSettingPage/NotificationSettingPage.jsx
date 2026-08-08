import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BellRing,
  CalendarClock,
  ChevronLeft,
  Clock3,
  HeartPulse,
  Info,
} from 'lucide-react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  getMoodNotificationSetting,
  updateMoodNotificationSetting,
} from '../../api/notificationSettingApi.js'

import './NotificationSettingPage.css'

const INTERVAL_OPTIONS = [
  1,
  2,
  3,
  4,
  6,
]

function convertTimeToMinutes(time) {
  if (
    typeof time !== 'string' ||
    !/^\d{2}:\d{2}$/.test(time)
  ) {
    return null
  }

  const [hour, minute] =
    time.split(':').map(Number)

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null
  }

  return hour * 60 + minute
}

function convertMinutesToTime(
  totalMinutes,
) {
  const hour = Math.floor(
    totalMinutes / 60,
  )

  const minute =
    totalMinutes % 60

  return `${String(hour).padStart(
    2,
    '0',
  )}:${String(minute).padStart(
    2,
    '0',
  )}`
}

function createNotificationTimes({
  startTime,
  endTime,
  intervalHours,
}) {
  const startMinutes =
    convertTimeToMinutes(startTime)

  const endMinutes =
    convertTimeToMinutes(endTime)

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes >= endMinutes ||
    intervalHours <= 0
  ) {
    return []
  }

  const intervalMinutes =
    intervalHours * 60

  const notificationTimes = []

  for (
    let currentMinutes =
      startMinutes;
    currentMinutes <= endMinutes;
    currentMinutes +=
      intervalMinutes
  ) {
    notificationTimes.push(
      convertMinutesToTime(
        currentMinutes,
      ),
    )
  }

  return notificationTimes
}

function formatDisplayTime(time) {
  const minutes =
    convertTimeToMinutes(time)

  if (minutes === null) {
    return time
  }

  const hour = Math.floor(
    minutes / 60,
  )

  const minute =
    minutes % 60

  const period =
    hour < 12 ? '오전' : '오후'

  const displayHour =
    hour % 12 || 12

  return `${period} ${displayHour}:${String(
    minute,
  ).padStart(2, '0')}`
}

function NotificationSettingPage() {
  const navigate = useNavigate()

  const [isEnabled, setIsEnabled] =
    useState(true)

  const [startTime, setStartTime] =
    useState('09:00')

  const [endTime, setEndTime] =
    useState('21:00')

  const [
    intervalHours,
    setIntervalHours,
  ] = useState(2)

  const [isLoading, setIsLoading] =
    useState(true)

  const [isSaving, setIsSaving] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  useEffect(() => {
    let isCancelled = false

    getMoodNotificationSetting()
      .then((setting) => {
        if (isCancelled) {
          return
        }

        setIsEnabled(setting.isEnabled)
        setStartTime(setting.startTime)
        setEndTime(setting.endTime)
        setIntervalHours(
          setting.intervalHours,
        )
        setErrorMessage('')
        setIsLoading(false)
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error.message ||
            '알림 설정을 불러오지 못했습니다.',
        )

        setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const notificationTimes =
    useMemo(
      () =>
        createNotificationTimes({
          startTime,
          endTime,
          intervalHours,
        }),
      [
        startTime,
        endTime,
        intervalHours,
      ],
    )

  const validationMessage =
    useMemo(() => {
      const startMinutes =
        convertTimeToMinutes(startTime)

      const endMinutes =
        convertTimeToMinutes(endTime)

      if (
        startMinutes === null ||
        endMinutes === null
      ) {
        return '올바른 시간을 선택해주세요.'
      }

      if (startMinutes >= endMinutes) {
        return '종료 시간은 시작 시간보다 늦어야 합니다.'
      }

      if (
        !INTERVAL_OPTIONS.includes(
          intervalHours,
        )
      ) {
        return '알림 간격을 선택해주세요.'
      }

      return ''
    }, [
      startTime,
      endTime,
      intervalHours,
    ])

  const handleBack = () => {
    if (isSaving) {
      return
    }

    navigate('/mypage')
  }

  const handleSettingChange = (
    callback,
  ) => {
    callback()
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault()

    if (
      validationMessage ||
      isSaving
    ) {
      setErrorMessage(
        validationMessage,
      )
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      if (
        isEnabled &&
        'Notification' in window &&
        window.Notification
          .permission === 'default'
      ) {
        await window.Notification
          .requestPermission()
      }

      const updatedSetting =
        await updateMoodNotificationSetting({
          isEnabled,
          startTime,
          endTime,
          intervalHours,
        })

      setIsEnabled(
        updatedSetting.isEnabled,
      )

      setStartTime(
        updatedSetting.startTime,
      )

      setEndTime(
        updatedSetting.endTime,
      )

      setIntervalHours(
        updatedSetting.intervalHours,
      )

      setSuccessMessage(
        '기분 확인 알림 설정이 저장되었습니다.',
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          '알림 설정을 저장하지 못했습니다.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="notification-setting-page">
      <header className="notification-setting-header">
        <button
          type="button"
          className="notification-setting-back-button"
          aria-label="마이페이지로 돌아가기"
          disabled={isSaving}
          onClick={handleBack}
        >
          <ChevronLeft
            size={22}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        <h1>알림 설정</h1>

        <div className="notification-setting-header-spacer" />
      </header>

      <main className="notification-setting-scroll-area">
        {isLoading && (
          <div className="notification-setting-status">
            <span className="notification-setting-loading-spinner" />

            <p>
              알림 설정을 불러오고 있습니다.
            </p>
          </div>
        )}

        {!isLoading &&
          errorMessage &&
          !successMessage &&
          !isEnabled &&
          notificationTimes.length ===
            0 && (
            <div className="notification-setting-status notification-setting-status-error">
              <p>{errorMessage}</p>
            </div>
          )}

        {!isLoading && (
          <form
            id="notification-setting-form"
            className="notification-setting-form"
            onSubmit={handleSubmit}
          >
            <section className="notification-setting-intro-card">
              <span className="notification-setting-intro-icon">
                <HeartPulse
                  size={24}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>

              <div className="notification-setting-intro-content">
                <h2>
                  기분 확인 알림
                </h2>

                <p>
                  정해진 시간마다 현재 기분을 물어보고, 선택한 기분을 연인에게 알려줘요.
                </p>
              </div>

              <button
                type="button"
                className={`notification-setting-toggle ${
                  isEnabled
                    ? 'notification-setting-toggle-active'
                    : ''
                }`}
                role="switch"
                aria-checked={isEnabled}
                aria-label="기분 확인 알림 사용 여부"
                disabled={isSaving}
                onClick={() =>
                  handleSettingChange(
                    () =>
                      setIsEnabled(
                        (previous) =>
                          !previous,
                      ),
                  )
                }
              >
                <span />
              </button>
            </section>

            <section className="notification-setting-card">
              <div className="notification-setting-section-title">
                <span>
                  <Clock3
                    size={18}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <h2>알림 시간</h2>

                  <p>
                    기분을 물어볼 시간 범위를 정해주세요.
                  </p>
                </div>
              </div>

              <div className="notification-setting-time-grid">
                <label className="notification-setting-time-field">
                  <span>시작 시간</span>

                  <input
                    type="time"
                    value={startTime}
                    disabled={
                      isSaving ||
                      !isEnabled
                    }
                    onChange={(event) =>
                      handleSettingChange(
                        () =>
                          setStartTime(
                            event.target
                              .value,
                          ),
                      )
                    }
                  />
                </label>

                <span className="notification-setting-time-divider">
                  ~
                </span>

                <label className="notification-setting-time-field">
                  <span>종료 시간</span>

                  <input
                    type="time"
                    value={endTime}
                    disabled={
                      isSaving ||
                      !isEnabled
                    }
                    onChange={(event) =>
                      handleSettingChange(
                        () =>
                          setEndTime(
                            event.target
                              .value,
                          ),
                      )
                    }
                  />
                </label>
              </div>

              {validationMessage && (
                <p className="notification-setting-validation-message">
                  {validationMessage}
                </p>
              )}
            </section>

            <section className="notification-setting-card">
              <div className="notification-setting-section-title">
                <span>
                  <BellRing
                    size={18}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <h2>알림 간격</h2>

                  <p>
                    몇 시간마다 기분을 물어볼지 선택해주세요.
                  </p>
                </div>
              </div>

              <div className="notification-setting-interval-list">
                {INTERVAL_OPTIONS.map(
                  (interval) => (
                    <button
                      key={interval}
                      type="button"
                      className={
                        intervalHours ===
                        interval
                          ? 'notification-setting-interval-active'
                          : ''
                      }
                      disabled={
                        isSaving ||
                        !isEnabled
                      }
                      onClick={() =>
                        handleSettingChange(
                          () =>
                            setIntervalHours(
                              interval,
                            ),
                        )
                      }
                    >
                      {interval}시간
                    </button>
                  ),
                )}
              </div>
            </section>

            <section className="notification-setting-preview-card">
              <div className="notification-setting-preview-header">
                <div className="notification-setting-section-title">
                  <span>
                    <CalendarClock
                      size={18}
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                  </span>

                  <div>
                    <h2>알림 예정 시간</h2>
                    <p>설정한 알림 시간을 미리 확인해보세요.</p>
                  </div>
                </div>

                <span>
                  {isEnabled
                    ? `${notificationTimes.length}회`
                    : '사용 안 함'}
                </span>
              </div>

              {!isEnabled ? (
                <div className="notification-setting-preview-empty">
                  기분 확인 알림이 꺼져 있습니다.
                </div>
              ) : notificationTimes.length >
                0 ? (
                <>
                  <div className="notification-setting-time-chips">
                    {notificationTimes.map(
                      (time) => (
                        <span key={time}>
                          {time}
                        </span>
                      ),
                    )}
                  </div>

                  <p className="notification-setting-preview-description">
                    {formatDisplayTime(
                      startTime,
                    )}
                    부터{' '}
                    {formatDisplayTime(
                      endTime,
                    )}
                    까지 {intervalHours}시간 간격으로 알림을 보내요.
                  </p>
                </>
              ) : (
                <div className="notification-setting-preview-empty">
                  시간을 올바르게 설정해주세요.
                </div>
              )}
            </section>

            <section className="notification-setting-info-card">
              <Info
                size={18}
                strokeWidth={1.9}
                aria-hidden="true"
              />

              <p>
                알림에서 기분을 선택하면 해당 기분이 기록되고 연인에게 공유됩니다. 실제 푸시 알림은 알림 권한이 허용된 경우에만 받을 수 있어요.
              </p>
            </section>

            {errorMessage && (
              <p className="notification-setting-result-message notification-setting-result-error">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="notification-setting-result-message notification-setting-result-success">
                {successMessage}
              </p>
            )}
          </form>
        )}
      </main>

      <footer className="notification-setting-footer">
        <button
          type="submit"
          form="notification-setting-form"
          disabled={
            isLoading ||
            isSaving ||
            Boolean(validationMessage)
          }
        >
          {isSaving
            ? '저장 중'
            : '설정 저장'}
        </button>
      </footer>
    </div>
  )
}

export default NotificationSettingPage
