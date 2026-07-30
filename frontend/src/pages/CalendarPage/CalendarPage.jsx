import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Pencil,
  Plus,
} from 'lucide-react'

import {
  createSchedule,
  deleteSchedule,
  getMonthlyCalendar,
  saveDiary,
  updateSchedule,
} from '../../api/calendarApi.js'

import ScheduleModal from '../../components/calendar/ScheduleModal/ScheduleModal.jsx'
import BottomNavigation from '../../components/common/BottomNavigation/BottomNavigation.jsx'

import {
  EMPTY_MOOD_COLOR,
  MOOD_META,
} from '../../constants/moodMeta.js'

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

function getMoodInformation(moodCode) {
  if (
    !moodCode ||
    !MOOD_META[moodCode]
  ) {
    return {
      label: '기록 없음',
      color: EMPTY_MOOD_COLOR,
    }
  }

  return MOOD_META[moodCode]
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

function CalendarPage() {
  const [currentMonth, setCurrentMonth] =
    useState(new Date(2026, 6, 1))

  const [selectedDate, setSelectedDate] =
    useState('2026-07-21')

  const [calendarData, setCalendarData] =
    useState({})

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
      sourceDate: '',
      schedule: null,
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

  const currentMonthLabel =
    `${currentYear}년 ${currentMonthNumber}월`

  const myMoodInformation =
    getMoodInformation(
      selectedDayData.myMood,
    )

  const partnerMoodInformation =
    getMoodInformation(
      selectedDayData.partnerMood,
    )

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
      sourceDate: selectedDate,
      schedule: null,
    })
  }

  const openEditScheduleModal = (
    schedule,
  ) => {
    setScheduleModal({
      isOpen: true,
      mode: 'edit',
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

      if (isSameMonth) {
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
        )

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
        <button
          type="button"
          className="calendar-menu-button"
          aria-label="메뉴 열기"
          onClick={() => {
            console.log('메뉴 열기')
          }}
        >
          <Menu
            size={22}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        <h1>캘린더</h1>

        <div className="calendar-header-spacer" />
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

              const myMood =
                getMoodInformation(
                  dayData.myMood,
                )

              const partnerMood =
                getMoodInformation(
                  dayData.partnerMood,
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
                    '--my-mood-color':
                      myMood.color,
                    '--partner-mood-color':
                      partnerMood.color,
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

            <button
              type="button"
              className="add-schedule-button"
              disabled={
                isLoading || isProcessing
              }
              onClick={
                openCreateScheduleModal
              }
            >
              <Plus
                size={16}
                strokeWidth={2.2}
                aria-hidden="true"
              />

              <span>추가</span>
            </button>
          </div>

          <div className="mood-summary">
            <div className="mood-summary-item">
              <span>나의 감정</span>

              <div>
                <i
                  style={{
                    background:
                      myMoodInformation.color,
                  }}
                />

                <strong>
                  {myMoodInformation.label}
                </strong>
              </div>
            </div>

            <div className="mood-summary-item">
              <span>상대방 감정</span>

              <div>
                <i
                  style={{
                    background:
                      partnerMoodInformation
                        .color,
                  }}
                />

                <strong>
                  {
                    partnerMoodInformation.label
                  }
                </strong>
              </div>
            </div>
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
                      onClick={() =>
                        openEditScheduleModal(
                          anniversary,
                        )
                      }
                    >
                      <span className="anniversary-dot" />

                      <strong>
                        {anniversary.name}
                      </strong>

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

      {scheduleModal.isOpen && (
        <ScheduleModal
          mode={scheduleModal.mode}
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
    </div>
  )
}

export default CalendarPage