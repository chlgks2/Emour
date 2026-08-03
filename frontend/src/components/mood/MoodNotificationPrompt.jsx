import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  HeartPulse,
  X,
} from 'lucide-react'

import {
  createMoodEntry,
  getMoodEntries,
} from '../../api/moodCollectionApi.js'
import {
  getMoodNotificationSetting,
} from '../../api/notificationSettingApi.js'
import {
  MOOD_TYPES,
} from '../../utils/moodEmotion.js'
import {
  useAuth,
} from '../../hooks/useAuth.js'

import styles from './MoodNotificationPrompt.module.css'

const CHECK_INTERVAL_MS = 30_000
const DISMISSED_SLOT_KEY =
  'dismissedMoodNotificationSlot'
const NOTIFIED_SLOT_KEY =
  'browserNotifiedMoodSlot'

function formatDateKey(date) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, '0'),
    String(date.getDate()).padStart(
      2,
      '0',
    ),
  ].join('-')
}

function timeToMinutes(time) {
  const [hour, minute] = String(
    time,
  )
    .slice(0, 5)
    .split(':')
    .map(Number)

  return hour * 60 + minute
}

function getCurrentSlot(setting, now) {
  if (!setting?.isEnabled) {
    return null
  }

  const start =
    timeToMinutes(setting.startTime)
  const end =
    timeToMinutes(setting.endTime)
  const current =
    now.getHours() * 60 +
    now.getMinutes()
  const interval =
    Number(setting.intervalHours) * 60

  if (
    !Number.isFinite(interval) ||
    interval <= 0 ||
    current < start ||
    current >= end
  ) {
    return null
  }

  const slotMinutes =
    start +
    Math.floor(
      (current - start) / interval,
    ) *
      interval

  const slotHour = Math.floor(
    slotMinutes / 60,
  )
  const slotMinute =
    slotMinutes % 60

  return `${formatDateKey(
    now,
  )}T${String(slotHour).padStart(
    2,
    '0',
  )}:${String(slotMinute).padStart(
    2,
    '0',
  )}`
}

function isSameSlot(entry, slotKey) {
  if (!entry?.moodDatetime) {
    return false
  }

  return (
    String(entry.moodDatetime).slice(
      0,
      16,
    ) === slotKey
  )
}

export default function MoodNotificationPrompt() {
  const { user, isAuthenticated } =
    useAuth()
  const userId = user?.userId
  const [slotKey, setSlotKey] =
    useState(null)
  const [selectedMood, setSelectedMood] =
    useState(null)
  const [isSubmitting, setIsSubmitting] =
    useState(false)
  const [errorMessage, setErrorMessage] =
    useState('')
  const authStateRef = useRef({
    isAuthenticated,
    userId,
  })

  useEffect(() => {
    authStateRef.current = {
      isAuthenticated,
      userId,
    }

    return () => {
      authStateRef.current = {
        isAuthenticated: false,
        userId: null,
      }
    }
  }, [isAuthenticated, userId])

  const dismissedStorageKey =
    useMemo(
      () =>
        `${DISMISSED_SLOT_KEY}:${
          userId ?? 'guest'
        }`,
      [userId],
    )

  const checkNotification =
    useCallback(async () => {
      if (
        !isAuthenticated ||
        !userId ||
        slotKey
      ) {
        return
      }

      try {
        const setting =
          await getMoodNotificationSetting()

        if (
          !authStateRef.current
            .isAuthenticated ||
          Number(authStateRef.current.userId) !==
            Number(userId)
        ) {
          return
        }

        const currentSlot =
          getCurrentSlot(
            setting,
            new Date(),
          )

        if (!currentSlot) {
          return
        }

        if (
          localStorage.getItem(
            dismissedStorageKey,
          ) === currentSlot
        ) {
          return
        }

        const entries =
          await getMoodEntries()

        if (
          !authStateRef.current
            .isAuthenticated ||
          Number(authStateRef.current.userId) !==
            Number(userId)
        ) {
          return
        }

        const alreadyRegistered =
          entries.some(
            (entry) =>
              Number(entry.userId) ===
                Number(userId) &&
              isSameSlot(
                entry,
                currentSlot,
              ),
          )

        if (!alreadyRegistered) {
          const notifiedStorageKey =
            `${NOTIFIED_SLOT_KEY}:${userId}`

          if (
            document.visibilityState !==
              'visible' &&
            'Notification' in window &&
            window.Notification
              .permission === 'granted' &&
            localStorage.getItem(
              notifiedStorageKey,
            ) !== currentSlot
          ) {
            const notification =
              new window.Notification(
                '지금 기분은 어때요?',
                {
                  body: '현재 느끼는 기분을 기록해주세요.',
                  tag: currentSlot,
                },
              )

            notification.onclick = () => {
              window.focus()
              notification.close()
            }

            localStorage.setItem(
              notifiedStorageKey,
              currentSlot,
            )
          }

          setSlotKey(currentSlot)
        }
      } catch {
        // 알림 확인 실패가 현재 화면 이용을 막지 않게 합니다.
      }
    }, [
      dismissedStorageKey,
      isAuthenticated,
      slotKey,
      userId,
    ])

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    const initialTimer =
      window.setTimeout(
        checkNotification,
        500,
      )
    const intervalId =
      window.setInterval(
        checkNotification,
        CHECK_INTERVAL_MS,
      )

    const handleFocus = () => {
      checkNotification()
    }

    window.addEventListener(
      'focus',
      handleFocus,
    )

    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(intervalId)
      window.removeEventListener(
        'focus',
        handleFocus,
      )
    }
  }, [
    checkNotification,
    isAuthenticated,
  ])

  if (!isAuthenticated || !userId || !slotKey) {
    return null
  }

  const handleClose = () => {
    localStorage.setItem(
      dismissedStorageKey,
      slotKey,
    )
    setSlotKey(null)
    setSelectedMood(null)
    setErrorMessage('')
  }

  const handleSubmit = async () => {
    if (
      !selectedMood ||
      isSubmitting
    ) {
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')

      await createMoodEntry(
        selectedMood,
      )

      window.dispatchEvent(
        new CustomEvent(
          'mood-records-updated',
        ),
      )

      setSlotKey(null)
      setSelectedMood(null)
    } catch (error) {
      setErrorMessage(
        error.message ||
          '기분을 저장하지 못했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
    >
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mood-notification-title"
      >
        <span
          className={styles.grabber}
          aria-hidden="true"
        />

        <header className={styles.header}>
          <span className={styles.icon}>
            <HeartPulse
              size={21}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="mood-notification-title">
              지금 기분은 어때요?
            </h2>
            <p>
              현재 느끼는 기분을 선택해주세요.
            </p>
          </div>

          <button
            type="button"
            aria-label="기분 알림 닫기"
            className={styles.closeButton}
            disabled={isSubmitting}
            onClick={handleClose}
          >
            <X size={20} />
          </button>
        </header>

        <div
          className={styles.moodList}
          role="radiogroup"
          aria-label="현재 기분"
        >
          {MOOD_TYPES.map((mood) => (
            <button
              key={mood.moodType}
              type="button"
              role="radio"
              aria-checked={
                selectedMood ===
                mood.moodType
              }
              className={
                selectedMood ===
                mood.moodType
                  ? styles.selectedMood
                  : ''
              }
              disabled={isSubmitting}
              onClick={() =>
                setSelectedMood(
                  mood.moodType,
                )
              }
            >
              <span
                className={styles.moodColor}
                style={{
                  backgroundColor:
                    mood.color,
                }}
              />
              <span>{mood.label}</span>
            </button>
          ))}
        </div>

        {errorMessage && (
          <p
            className={styles.error}
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          className={styles.submitButton}
          disabled={
            !selectedMood ||
            isSubmitting
          }
          onClick={handleSubmit}
        >
          {isSubmitting
            ? '기록 중...'
            : '기록하기'}
        </button>
      </section>
    </div>
  )
}
