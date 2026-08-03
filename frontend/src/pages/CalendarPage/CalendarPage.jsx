import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Heart,
  Pencil,
} from 'lucide-react'

import {
  createSchedule,
  deleteSchedule,
  getAnniversaries,
  getMonthlyCalendar,
  saveDiary,
  updateSchedule,
} from '../../api/calendarApi.js'

import ScheduleModal from '../../components/calendar/ScheduleModal/ScheduleModal.jsx'
import AnniversaryManager from '../../components/calendar/AnniversaryManager/AnniversaryManager.jsx'
import BottomNavigation from '../../components/common/BottomNavigation/BottomNavigation.jsx'

import {
  buildDayGradient,
  formatDateKey,
} from '../../utils/moodEmotion.js'
import {
  fetchMoodSlots,
  saveMyMood,
} from '../../api/moodApi.js'
import MoodSlotList from '../../components/dashboard/MoodSlotList.jsx'
import { formatSlotTime } from '../../utils/moodSlotFormat.js'
import { DEFAULT_MOOD_WINDOW } from '../../utils/moodSlotGrid.js'
import { getMoodNotificationSetting } from '../../api/notificationSettingApi.js'
import MoodFormModal from '../../components/dashboard/MoodFormModal.jsx'
import { useLiveSync } from '../../hooks/useLiveSync.js'

import {
  createEmptyCalendarDay,
  SCHEDULE_TYPE,
} from '../../mappers/calendarMapper.js'

import './CalendarPage.css'

const TEMP_COUPLE_ROOM_ID = 1

const WEEK_LABELS = [
  '일',
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
]

function createDateKey(
  year,
  monthIndex,
  day,
) {
  const month = String(
    monthIndex + 1,
  ).padStart(2, '0')

  const date = String(day).padStart(2, '0')

  return `${year}-${month}-${date}`
}

function createMonthCells(monthDate) {
  const year = monthDate.getFullYear()
  const monthIndex = monthDate.getMonth()

  const firstWeekday = new Date(
    year,
    monthIndex,
    1,
  ).getDay()

  const currentMonthDays = new Date(
    year,
    monthIndex + 1,
    0,
  ).getDate()

  const previousMonthDays = new Date(
    year,
    monthIndex,
    0,
  ).getDate()

  return Array.from(
    { length: 42 },
    (_, index) => {
      const calculatedDay =
        index - firstWeekday + 1

      if (calculatedDay <= 0) {
        const day =
          previousMonthDays + calculatedDay

        const previousMonthDate = new Date(
          year,
          monthIndex - 1,
          day,
        )

        return {
          day,
          year:
            previousMonthDate.getFullYear(),
          monthIndex:
            previousMonthDate.getMonth(),
          dateKey: createDateKey(
            previousMonthDate.getFullYear(),
            previousMonthDate.getMonth(),
            day,
          ),
          isCurrentMonth: false,
          weekday: index % 7,
        }
      }

      if (
        calculatedDay > currentMonthDays
      ) {
        const day =
          calculatedDay -
          currentMonthDays

        const nextMonthDate = new Date(
          year,
          monthIndex + 1,
          day,
        )

        return {
          day,
          year:
            nextMonthDate.getFullYear(),
          monthIndex:
            nextMonthDate.getMonth(),
          dateKey: createDateKey(
            nextMonthDate.getFullYear(),
            nextMonthDate.getMonth(),
            day,
          ),
          isCurrentMonth: false,
          weekday: index % 7,
        }
      }

      return {
        day: calculatedDay,
        year,
        monthIndex,
        dateKey: createDateKey(
          year,
          monthIndex,
          calculatedDay,
        ),
        isCurrentMonth: true,
        weekday: index % 7,
      }
    },
  )
}

function formatSelectedDate(dateKey) {
  const [year, month, day] = dateKey
    .split('-')
    .map(Number)

  const weekday = new Date(
    year,
    month - 1,
    day,
  ).getDay()

  return `${month}월 ${day}일 (${WEEK_LABELS[weekday]})`
}

function sortSchedules(schedules) {
  return [...schedules].sort(
    (first, second) =>
      (first.time || '99:99').localeCompare(
        second.time || '99:99',
      ),
  )
}

function formatAnniversaryRepeat(
  anniversary,
) {
  if (
    anniversary.isAutomaticAnniversary &&
    anniversary.occurrenceNumber
  ) {
    return `${anniversary.occurrenceNumber}일`
  }

  return ''
}

function CalendarPage() {
  /*
   * 캘린더는 오늘을 보여주면서 열린다.
   * (2026년 7월로 고정돼 있던 값이라 실제 날짜와 상관없이 7월 21일이 선택돼 있었다)
   */
  const [currentMonth, setCurrentMonth] =
    useState(() => {
      const now = new Date()
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      )
    })

  const [selectedDate, setSelectedDate] =
    useState(() =>
      formatDateKey(new Date()),
    )

  const [calendarData, setCalendarData] =
    useState({})

  /*
   * 무드트래커는 하루 1건이 아니라 시간대(슬롯) 단위라서 캘린더 월 조회와
   * 별도로 불러온다. { 'YYYY-MM-DD': { mySlots, partnerSlots, myMood, partnerMood } }
   */
  const [moodSlots, setMoodSlots] =
    useState({})

  /*
   * 무드 모달 상태.
   *   null      -> 닫힘
   *   { slot }  -> slot 이 있으면 수정, null 이면 '지금 기분 기록'(새로 등록)
   * ('닫힘'과 '새로 등록'을 같은 null 로 두면 구분이 안 되므로 한 겹 감쌌다.)
   */
  const [moodModal, setMoodModal] =
    useState(null)

  const openMoodModal = ({
    slot,
    minutesOfDay,
  }) =>
    setMoodModal({
      slot: slot ?? null,
      minutesOfDay:
        slot?.minutesOfDay ?? minutesOfDay,
    })

  const closeMoodModal = () =>
    setMoodModal(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [isProcessing, setIsProcessing] =
    useState(false)

  const [isDiaryEditing, setIsDiaryEditing] =
    useState(false)

  const [diaryDraft, setDiaryDraft] =
    useState('')

  const [scheduleModal, setScheduleModal] =
    useState({
      isOpen: false,
      mode: 'create',
      entryType:
        SCHEDULE_TYPE.SCHEDULE,
      sourceDate: '',
      schedule: null,
    })

  const [
    anniversaryManager,
    setAnniversaryManager,
  ] = useState({
    isOpen: false,
    isLoading: false,
    anniversaries: [],
  })

  const currentYear =
    currentMonth.getFullYear()

  const currentMonthNumber =
    currentMonth.getMonth() + 1

  const monthCells = useMemo(
    () => createMonthCells(currentMonth),
    [currentMonth],
  )

  const selectedDayData =
    calendarData[selectedDate] ??
    createEmptyCalendarDay(selectedDate)

  const selectedDayMood =
    moodSlots[selectedDate] ?? {
      mySlots: [],
      partnerSlots: [],
      myMood: null,
      partnerMood: null,
    }

  const [moodWindow, setMoodWindow] =
    useState(DEFAULT_MOOD_WINDOW)

  useEffect(() => {
    getMoodNotificationSetting()
      .then((setting) => {
        if (setting?.startTime) {
          setMoodWindow(setting)
        }
      })
      .catch(() => {
        // 설정 조회가 실패해도 기본 슬롯으로 동작한다.
      })
  }, [])

  // 오늘을 보고 있을 때만 미래 시간대를 잠근다.
  const selectedDayNowMinutes = useMemo(() => {
    const now = new Date()

    if (selectedDate !== formatDateKey(now)) {
      return null
    }

    return (
      now.getHours() * 60 + now.getMinutes()
    )
  }, [selectedDate])

  const loadMoodSlots = useCallback(() => {
    fetchMoodSlots()
      .then(setMoodSlots)
      .catch(() => {
        // 기분 기록만 실패한 경우 캘린더 전체를 막지 않는다.
        setMoodSlots({})
      })
  }, [])

  useEffect(() => {
    loadMoodSlots()
  }, [loadMoodSlots])

  const handleSaveMood = async ({
    moodType,
    reason,
  }) => {
    /*
     * 저장은 서버에 바로 반영된다. 실패하면 알려야 한다.
     * (예전에는 실패해도 조용히 이 브라우저에만 남아서, 상대 화면에는 없는
     *  기록이 내 화면에만 저장된 것처럼 보였다)
     * 기록 시각은 서버가 정하므로 슬롯 위치는 보내지 않는다.
     */
    try {
      await saveMyMood({
        moodId:
          moodModal?.slot?.moodId ?? null,
        moodType,
        reason,
        dateKey: selectedDate,
      })
    } catch (error) {
      // 모달은 닫지 않는다. 입력값을 잃지 않고 바로 다시 시도할 수 있어야 한다.
      setErrorMessage(
        error.message ||
          '기분을 저장하지 못했습니다.',
      )

      return
    }

    setErrorMessage('')
    closeMoodModal()
    loadMoodSlots()
  }

  const currentMonthLabel =
    `${currentYear}년 ${currentMonthNumber}월`

  useEffect(() => {
    let isCancelled = false

    getMonthlyCalendar(
      TEMP_COUPLE_ROOM_ID,
      currentYear,
      currentMonthNumber,
    )
      .then((monthData) => {
        if (isCancelled) {
          return
        }

        setCalendarData(monthData)
        setErrorMessage('')
        setIsLoading(false)
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error.message ||
            '캘린더를 불러오지 못했습니다.',
        )

        setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [currentMonthNumber, currentYear])

  const refreshCalendar =
    useCallback(async () => {
      const results =
        await Promise.allSettled([
          getMonthlyCalendar(
            TEMP_COUPLE_ROOM_ID,
            currentYear,
            currentMonthNumber,
          ),
          fetchMoodSlots(),
        ])

      if (
        results[0].status ===
        'fulfilled'
      ) {
        setCalendarData(
          results[0].value,
        )
        setErrorMessage('')
      }

      if (
        results[1].status ===
        'fulfilled'
      ) {
        setMoodSlots(
          results[1].value,
        )
      }
    }, [
      currentMonthNumber,
      currentYear,
    ])

  // 상대방 무드 등록은 같은 브라우저 이벤트에 의존하지 않고,
  // 주기적인 GET /moods 재조회로 반영한다.
  useLiveSync(refreshCalendar, {
    intervalMs: 3000,
  })

  const changeCurrentMonth = (
    nextMonth,
    nextSelectedDate,
  ) => {
    setIsLoading(true)
    setErrorMessage('')
    setCalendarData({})
    setCurrentMonth(nextMonth)
    setSelectedDate(nextSelectedDate)
    setIsDiaryEditing(false)
    setDiaryDraft('')
  }

  const handleMonthChange = (direction) => {
    const nextMonth = new Date(
      currentYear,
      currentMonth.getMonth() +
        direction,
      1,
    )

    changeCurrentMonth(
      nextMonth,
      createDateKey(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        1,
      ),
    )
  }

  const handleDateSelect = (cell) => {
    setSelectedDate(cell.dateKey)
    setIsDiaryEditing(false)
    setDiaryDraft('')

    if (!cell.isCurrentMonth) {
      changeCurrentMonth(
        new Date(
          cell.year,
          cell.monthIndex,
          1,
        ),
        cell.dateKey,
      )
    }
  }

  const openCreateScheduleModal = () => {
    setScheduleModal({
      isOpen: true,
      mode: 'create',
      entryType:
        SCHEDULE_TYPE.SCHEDULE,
      sourceDate: selectedDate,
      schedule: null,
    })
  }

  const openCreateAnniversaryModal =
    () => {
      setScheduleModal({
        isOpen: true,
        mode: 'create',
        entryType:
          SCHEDULE_TYPE.ANNIVERSARY,
        sourceDate: selectedDate,
        schedule: null,
      })
    }

  const loadAnniversaries = async () => {
    const anniversaries =
      await getAnniversaries(
        TEMP_COUPLE_ROOM_ID,
      )

    setAnniversaryManager(
      (previous) => ({
        ...previous,
        isLoading: false,
        anniversaries,
      }),
    )
  }

  const openAnniversaryManager =
    async () => {
      setAnniversaryManager(
        (previous) => ({
          ...previous,
          isOpen: true,
          isLoading: true,
        }),
      )

      try {
        await loadAnniversaries()
      } catch (error) {
        setAnniversaryManager(
          (previous) => ({
            ...previous,
            isLoading: false,
          }),
        )

        window.alert(
          error.message ||
            '기념일 목록을 불러오지 못했습니다.',
        )
      }
    }

  const closeAnniversaryManager =
    () => {
      if (isProcessing) {
        return
      }

      setAnniversaryManager(
        (previous) => ({
          ...previous,
          isOpen: false,
        }),
      )
    }

  const openEditScheduleModal = (
    schedule,
  ) => {
    setScheduleModal({
      isOpen: true,
      mode: 'edit',
      entryType: schedule.type,
      sourceDate: selectedDate,
      schedule,
    })
  }

  const closeScheduleModal = () => {
    if (isProcessing) {
      return
    }

    setScheduleModal({
      isOpen: false,
      mode: 'create',
      entryType:
        SCHEDULE_TYPE.SCHEDULE,
      sourceDate: '',
      schedule: null,
    })
  }

  const updateCalendarSchedule = (
    savedSchedule,
  ) => {
    setCalendarData(
      (previousCalendarData) => {
        const nextCalendarData = {
          ...previousCalendarData,
        }

        if (
          scheduleModal.mode === 'edit' &&
          scheduleModal.schedule
        ) {
          const sourceDay =
            nextCalendarData[
              scheduleModal.sourceDate
            ] ??
            createEmptyCalendarDay(
              scheduleModal.sourceDate,
            )

          nextCalendarData[
            scheduleModal.sourceDate
          ] = {
            ...sourceDay,
            schedules:
              sourceDay.schedules.filter(
                (schedule) =>
                  schedule.scheduleId !==
                  savedSchedule.scheduleId,
              ),
            anniversaries:
              sourceDay.anniversaries.filter(
                (schedule) =>
                  schedule.scheduleId !==
                  savedSchedule.scheduleId,
              ),
          }
        }

        const targetDay =
          nextCalendarData[
            savedSchedule.date
          ] ??
          createEmptyCalendarDay(
            savedSchedule.date,
          )

        if (
          savedSchedule.type ===
          SCHEDULE_TYPE.ANNIVERSARY
        ) {
          nextCalendarData[
            savedSchedule.date
          ] = {
            ...targetDay,
            anniversaries:
              sortSchedules([
                ...targetDay.anniversaries,
                savedSchedule,
              ]),
          }
        } else {
          nextCalendarData[
            savedSchedule.date
          ] = {
            ...targetDay,
            schedules: sortSchedules([
              ...targetDay.schedules,
              savedSchedule,
            ]),
          }
        }

        return nextCalendarData
      },
    )
  }

  const handleScheduleSave = async (
    scheduleInput,
  ) => {
    if (isProcessing) {
      return
    }

    try {
      setIsProcessing(true)

      const savedSchedule =
        scheduleModal.mode === 'edit' &&
        scheduleModal.schedule
          ? await updateSchedule(
              scheduleModal.schedule
                .scheduleId,
              scheduleInput,
            )
          : await createSchedule({
              coupleRoomId:
                TEMP_COUPLE_ROOM_ID,
              ...scheduleInput,
            })

      const [targetYear, targetMonth] =
        savedSchedule.date
          .split('-')
          .map(Number)

      const isSameMonth =
        targetYear === currentYear &&
        targetMonth ===
          currentMonthNumber

      if (
        savedSchedule.type ===
        SCHEDULE_TYPE.ANNIVERSARY
      ) {
        const refreshedCalendar =
          await getMonthlyCalendar(
            TEMP_COUPLE_ROOM_ID,
            currentYear,
            currentMonthNumber,
          )

        setCalendarData(
          refreshedCalendar,
        )

        if (
          anniversaryManager.isOpen
        ) {
          await loadAnniversaries()
        }
      } else if (isSameMonth) {
        updateCalendarSchedule(
          savedSchedule,
        )

        setSelectedDate(
          savedSchedule.date,
        )
      } else {
        changeCurrentMonth(
          new Date(
            targetYear,
            targetMonth - 1,
            1,
          ),
          savedSchedule.date,
        )
      }

      setScheduleModal({
        isOpen: false,
        mode: 'create',
        entryType:
          SCHEDULE_TYPE.SCHEDULE,
        sourceDate: '',
        schedule: null,
      })
    } catch (error) {
      window.alert(
        error.message ||
          '일정 저장에 실패했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleScheduleDelete =
    async () => {
      if (
        !scheduleModal.schedule ||
        isProcessing
      ) {
        return
      }

      const shouldDelete =
        window.confirm(
          '선택한 기록을 삭제하시겠습니까?',
        )

      if (!shouldDelete) {
        return
      }

      try {
        setIsProcessing(true)

        await deleteSchedule(
          scheduleModal.schedule
            .scheduleId,
          scheduleModal.schedule.type,
        )

        if (
          scheduleModal.schedule.type ===
          SCHEDULE_TYPE.ANNIVERSARY
        ) {
          const refreshedCalendar =
            await getMonthlyCalendar(
              TEMP_COUPLE_ROOM_ID,
              currentYear,
              currentMonthNumber,
            )

          setCalendarData(
            refreshedCalendar,
          )
        }

        if (
          scheduleModal.schedule.type ===
            SCHEDULE_TYPE.ANNIVERSARY &&
          anniversaryManager.isOpen
        ) {
          await loadAnniversaries()
        }

        setCalendarData(
          (previousCalendarData) => {
            const sourceDay =
              previousCalendarData[
                scheduleModal.sourceDate
              ] ??
              createEmptyCalendarDay(
                scheduleModal.sourceDate,
              )

            return {
              ...previousCalendarData,
              [scheduleModal.sourceDate]: {
                ...sourceDay,
                schedules:
                  sourceDay.schedules.filter(
                    (schedule) =>
                      schedule.scheduleId !==
                      scheduleModal.schedule
                        .scheduleId,
                  ),
                anniversaries:
                  sourceDay.anniversaries.filter(
                    (schedule) =>
                      schedule.scheduleId !==
                      scheduleModal.schedule
                        .scheduleId,
                  ),
              },
            }
          },
        )

        setScheduleModal({
          isOpen: false,
          mode: 'create',
          entryType:
            SCHEDULE_TYPE.SCHEDULE,
          sourceDate: '',
          schedule: null,
        })
      } catch (error) {
        window.alert(
          error.message ||
            '일정 삭제에 실패했습니다.',
        )
      } finally {
        setIsProcessing(false)
      }
    }

  const handleDiarySave = async () => {
    if (isProcessing) {
      return
    }

    try {
      setIsProcessing(true)

      const savedDiary =
        await saveDiary({
          coupleRoomId:
            TEMP_COUPLE_ROOM_ID,
          date: selectedDate,
          content: diaryDraft,
        })

      setCalendarData(
        (previousCalendarData) => {
          const dayData =
            previousCalendarData[
              selectedDate
            ] ??
            createEmptyCalendarDay(
              selectedDate,
            )

          return {
            ...previousCalendarData,
            [selectedDate]: {
              ...dayData,
              diary: savedDiary,
            },
          }
        },
      )

      setDiaryDraft(savedDiary.content)
      setIsDiaryEditing(false)
    } catch (error) {
      window.alert(
        error.message ||
          '한줄 일기 저장에 실패했습니다.',
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <h1>캘린더</h1>
      </header>

      <div className="calendar-scroll-area">
        {isLoading && (
          <div className="calendar-status">
            캘린더를 불러오고 있습니다.
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="calendar-status calendar-status-error">
            {errorMessage}
          </div>
        )}

        <section className="calendar-month-section">
          <div className="calendar-month-navigation">
            <button
              type="button"
              aria-label="이전 달"
              disabled={isLoading}
              onClick={() =>
                handleMonthChange(-1)
              }
            >
              <ChevronLeft
                size={21}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>

            <h2>{currentMonthLabel}</h2>

            <button
              type="button"
              aria-label="다음 달"
              disabled={isLoading}
              onClick={() =>
                handleMonthChange(1)
              }
            >
              <ChevronRight
                size={21}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEK_LABELS.map(
              (weekday, index) => (
                <span
                  key={weekday}
                  className={
                    index === 0
                      ? 'weekday-sunday'
                      : index === 6
                        ? 'weekday-saturday'
                        : ''
                  }
                >
                  {weekday}
                </span>
              ),
            )}
          </div>

          <div className="calendar-grid">
            {monthCells.map((cell) => {
              const dayData =
                calendarData[cell.dateKey] ??
                createEmptyCalendarDay(
                  cell.dateKey,
                )

              const isSelected =
                selectedDate ===
                cell.dateKey

              const dayCellClassName = [
                'calendar-day-cell',
                !cell.isCurrentMonth
                  ? 'calendar-day-cell-outside'
                  : '',
                isSelected
                  ? 'calendar-day-cell-selected'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')

              const dayNumberClassName = [
                'calendar-day-number',
                cell.weekday === 0
                  ? 'calendar-day-number-sunday'
                  : '',
                cell.weekday === 6
                  ? 'calendar-day-number-saturday'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  className={
                    dayCellClassName
                  }
                  disabled={isLoading}
                  style={{
                    // 대시보드 감정 원과 같은 그라데이션 (반반 분할 대신).
                    // 그날의 대표색은 무드트래커에서 가장 많이 입력된 무드를 쓴다.
                    // 입력 횟수가 같으면 가장 최근 무드를 사용한다.
                    '--day-mood-gradient':
                      buildDayGradient(
                        moodSlots[cell.dateKey]
                          ?.myMood ??
                          dayData.myMood,
                        moodSlots[cell.dateKey]
                          ?.partnerMood ??
                          dayData.partnerMood,
                      ),
                  }}
                  onClick={() =>
                    handleDateSelect(cell)
                  }
                >
                  <span
                    className={
                      dayNumberClassName
                    }
                  >
                    {cell.day}
                  </span>

                  <span className="calendar-day-dots">
                    {dayData
                      .anniversaries
                      .length > 0 && (
                      <span className="anniversary-dot" />
                    )}

                    {dayData.schedules
                      .length > 0 && (
                      <span className="schedule-dot" />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section
          className="calendar-create-actions"
          aria-label="캘린더 기록 추가"
        >
          <button
            type="button"
            className="calendar-create-schedule"
            disabled={
              isLoading || isProcessing
            }
            onClick={
              openCreateScheduleModal
            }
          >
            <CalendarPlus
              size={19}
              strokeWidth={2}
              aria-hidden="true"
            />

            <span>
              <strong>일정 추가</strong>
              <small>
                선택한 날짜에 등록
              </small>
            </span>
          </button>

          <button
            type="button"
            className="calendar-create-anniversary"
            disabled={
              isLoading || isProcessing
            }
            onClick={
              openAnniversaryManager
            }
          >
            <Heart
              size={19}
              strokeWidth={2}
              aria-hidden="true"
            />

            <span>
              <strong>기념일 관리</strong>
              <small>
                추가·수정과 반복 설정
              </small>
            </span>
          </button>
        </section>

        <section className="selected-day-card">
          <div className="selected-day-header">
            <div>
              <p>
                {selectedDate.slice(0, 4)}
                년
              </p>

              <h2>
                {formatSelectedDate(
                  selectedDate,
                )}
              </h2>
            </div>

          </div>

          {/*
            무드트래커 상세 — 대시보드와 같은 MoodSlotList 를 쓴다.
            캘린더는 limit 없이 그날의 시간대를 전부 보여준다.
          */}
          <div className="selected-day-section">
            <div className="selected-day-section-title">
              <h3>
                무드트래커

                <span>
                  {
                    selectedDayMood.mySlots
                      .length
                  }
                </span>
              </h3>
            </div>

            <MoodSlotList
              mySlots={
                selectedDayMood.mySlots
              }
              partnerSlots={
                selectedDayMood.partnerSlots
              }
              window={moodWindow}
              nowMinutes={
                selectedDayNowMinutes
              }
              onEditSlot={openMoodModal}
            />
          </div>

          <div className="selected-day-section">
            <div className="selected-day-section-title">
              <h3>
                일정

                <span>
                  {
                    selectedDayData
                      .schedules.length
                  }
                </span>
              </h3>
            </div>

            {selectedDayData.schedules
              .length > 0 ? (
              <div className="schedule-list">
                {selectedDayData.schedules.map(
                  (schedule) => (
                    <button
                      key={
                        schedule.scheduleId
                      }
                      type="button"
                      className="schedule-list-item"
                      onClick={() =>
                        openEditScheduleModal(
                          schedule,
                        )
                      }
                    >
                      <time>
                        {schedule.time ||
                          '시간 미정'}
                      </time>

                      <span>
                        {schedule.name}
                      </span>

                      <ChevronRight
                        className="schedule-list-chevron"
                        size={18}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </button>
                  ),
                )}
              </div>
            ) : (
              <p className="empty-section-message">
                등록된 일정이 없습니다.
              </p>
            )}
          </div>

          <div className="selected-day-section">
            <div className="selected-day-section-title">
              <h3>
                기념일

                <span>
                  {
                    selectedDayData
                      .anniversaries.length
                  }
                </span>
              </h3>
            </div>

            {selectedDayData.anniversaries
              .length > 0 ? (
              <div className="anniversary-list">
                {selectedDayData
                  .anniversaries
                  .map((anniversary) => (
                    <button
                      key={
                        anniversary.scheduleId
                      }
                      type="button"
                      className="anniversary-list-item"
                      onClick={() => {
                        if (
                          anniversary.isAutomaticAnniversary
                        ) {
                          openAnniversaryManager()
                          return
                        }

                        openEditScheduleModal(
                          anniversary,
                        )
                      }}
                    >
                      <span className="anniversary-dot" />

                      <strong>
                        {anniversary.name}
                      </strong>

                      {formatAnniversaryRepeat(
                        anniversary,
                      ) && (
                        <small>
                          {formatAnniversaryRepeat(
                            anniversary,
                          )}
                        </small>
                      )}

                      <ChevronRight
                        size={17}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
              </div>
            ) : (
              <p className="empty-section-message">
                등록된 기념일이 없습니다.
              </p>
            )}
          </div>

          <div className="diary-section">
            <div className="selected-day-section-title">
              <h3>한줄 일기</h3>

              {!isDiaryEditing && (
                <button
                  type="button"
                  className="diary-edit-button"
                  disabled={isProcessing}
                  onClick={() => {
                    setDiaryDraft(
                      selectedDayData.diary
                        .content ?? '',
                    )
                    setIsDiaryEditing(true)
                  }}
                >
                  <Pencil
                    size={13}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  <span>수정</span>
                </button>
              )}
            </div>

            {isDiaryEditing ? (
              <div className="diary-editor">
                <textarea
                  value={diaryDraft}
                  placeholder="오늘의 한줄 일기를 작성해주세요"
                  rows={3}
                  disabled={isProcessing}
                  onChange={(event) =>
                    setDiaryDraft(
                      event.target.value,
                    )
                  }
                />

                <div>
                  <button
                    type="button"
                    className="diary-cancel-button"
                    disabled={isProcessing}
                    onClick={() => {
                      setDiaryDraft('')
                      setIsDiaryEditing(
                        false,
                      )
                    }}
                  >
                    취소
                  </button>

                  <button
                    type="button"
                    className="diary-save-button"
                    disabled={isProcessing}
                    onClick={handleDiarySave}
                  >
                    {isProcessing
                      ? '저장 중'
                      : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="diary-content">
                {selectedDayData.diary
                  .content ||
                  '작성된 한줄 일기가 없습니다.'}
              </p>
            )}
          </div>
        </section>
      </div>

      <BottomNavigation />

      {anniversaryManager.isOpen && (
        <AnniversaryManager
          anniversaries={
            anniversaryManager.anniversaries
          }
          isLoading={
            anniversaryManager.isLoading
          }
          isProcessing={isProcessing}
          onClose={
            closeAnniversaryManager
          }
          onCreate={
            openCreateAnniversaryModal
          }
          onEdit={
            openEditScheduleModal
          }
        />
      )}

      {scheduleModal.isOpen && (
        <ScheduleModal
          mode={scheduleModal.mode}
          entryType={
            scheduleModal.entryType
          }
          selectedDate={selectedDate}
          schedule={scheduleModal.schedule}
          isProcessing={isProcessing}
          onClose={closeScheduleModal}
          onSave={handleScheduleSave}
          onDelete={
            handleScheduleDelete
          }
        />
      )}

      {/*
        무드트래커 등록/수정. 대시보드와 같은 모달을 쓰므로
        어느 화면에서 수정하든 동작이 같다.
      */}
      {moodModal && (
        <MoodFormModal
          open
          mode={
            moodModal.slot
              ? 'edit'
              : 'create'
          }
          dateLabel={`${formatSelectedDate(selectedDate)} ${formatSlotTime(moodModal.minutesOfDay)}`}
          initialMoodType={
            moodModal.slot?.moodType ??
            null
          }
          initialReason={
            moodModal.slot?.reason ?? ''
          }
          onClose={closeMoodModal}
          onSubmit={handleSaveMood}
        />
      )}
    </div>
  )
}

export default CalendarPage
