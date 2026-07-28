import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Pencil,
  Plus,
} from 'lucide-react'

import ScheduleModal from '../../components/calendar/ScheduleModal/ScheduleModal'
import BottomNavigation from '../../components/common/BottomNavigation/BottomNavigation'
import {
  EMPTY_MOOD_COLOR,
  MOOD_META,
} from '../../constants/moodMeta'
import { INITIAL_CALENDAR_DATA } from '../../data/calendarMockData'

import './CalendarPage.css'

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function createEmptyDayData() {
  return {
    myMood: null,
    partnerMood: null,
    schedules: [],
    anniversaries: [],
    diary: '',
  }
}

function createDateKey(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, '0')
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

  return Array.from({ length: 42 }, (_, index) => {
    const calculatedDay = index - firstWeekday + 1

    if (calculatedDay <= 0) {
      const day = previousMonthDays + calculatedDay

      const previousMonthDate = new Date(
        year,
        monthIndex - 1,
        day,
      )

      return {
        day,
        year: previousMonthDate.getFullYear(),
        monthIndex: previousMonthDate.getMonth(),
        dateKey: createDateKey(
          previousMonthDate.getFullYear(),
          previousMonthDate.getMonth(),
          day,
        ),
        isCurrentMonth: false,
        weekday: index % 7,
      }
    }

    if (calculatedDay > currentMonthDays) {
      const day = calculatedDay - currentMonthDays

      const nextMonthDate = new Date(
        year,
        monthIndex + 1,
        day,
      )

      return {
        day,
        year: nextMonthDate.getFullYear(),
        monthIndex: nextMonthDate.getMonth(),
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
  })
}

function getMoodInformation(moodCode) {
  if (!moodCode || !MOOD_META[moodCode]) {
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

function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(2026, 6, 1),
  )

  const [selectedDate, setSelectedDate] = useState(
    '2026-07-21',
  )

  const [calendarData, setCalendarData] = useState(
    INITIAL_CALENDAR_DATA,
  )

  const [isDiaryEditing, setIsDiaryEditing] =
    useState(false)

  const [diaryDraft, setDiaryDraft] = useState('')

  const [scheduleModal, setScheduleModal] = useState({
    isOpen: false,
    mode: 'create',
    sourceDate: '',
    schedule: null,
  })

  const monthCells = useMemo(
    () => createMonthCells(currentMonth),
    [currentMonth],
  )

  const selectedDayData =
    calendarData[selectedDate] ?? createEmptyDayData()

  const currentMonthLabel = `${
    currentMonth.getFullYear()
  }년 ${currentMonth.getMonth() + 1}월`

  const myMoodInformation = getMoodInformation(
    selectedDayData.myMood,
  )

  const partnerMoodInformation = getMoodInformation(
    selectedDayData.partnerMood,
  )

  const handleMonthChange = (direction) => {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + direction,
      1,
    )

    setCurrentMonth(nextMonth)

    setSelectedDate(
      createDateKey(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        1,
      ),
    )

    setIsDiaryEditing(false)
    setDiaryDraft('')
  }

  const handleDateSelect = (cell) => {
    setSelectedDate(cell.dateKey)
    setIsDiaryEditing(false)
    setDiaryDraft('')

    if (!cell.isCurrentMonth) {
      setCurrentMonth(
        new Date(cell.year, cell.monthIndex, 1),
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

  const openEditScheduleModal = (schedule) => {
    setScheduleModal({
      isOpen: true,
      mode: 'edit',
      sourceDate: selectedDate,
      schedule,
    })
  }

  const closeScheduleModal = () => {
    setScheduleModal({
      isOpen: false,
      mode: 'create',
      sourceDate: '',
      schedule: null,
    })
  }

  const handleScheduleSave = (scheduleInput) => {
    const savedSchedule = {
      id:
        scheduleModal.schedule?.id ??
        `schedule-${Date.now()}`,
      ...scheduleInput,
    }

    setCalendarData((previousCalendarData) => {
      const nextCalendarData = {
        ...previousCalendarData,
      }

      if (
        scheduleModal.mode === 'edit' &&
        scheduleModal.schedule
      ) {
        const sourceDateData =
          nextCalendarData[scheduleModal.sourceDate] ??
          createEmptyDayData()

        nextCalendarData[scheduleModal.sourceDate] = {
          ...sourceDateData,
          schedules: sourceDateData.schedules.filter(
            (schedule) =>
              schedule.id !== scheduleModal.schedule.id,
          ),
        }
      }

      const targetDateData =
        nextCalendarData[scheduleInput.date] ??
        createEmptyDayData()

      nextCalendarData[scheduleInput.date] = {
        ...targetDateData,
        schedules: [
          ...targetDateData.schedules,
          savedSchedule,
        ],
      }

      return nextCalendarData
    })

    const [year, month] = scheduleInput.date
      .split('-')
      .map(Number)

    setSelectedDate(scheduleInput.date)
    setCurrentMonth(new Date(year, month - 1, 1))

    closeScheduleModal()
  }

  const handleScheduleDelete = () => {
    if (!scheduleModal.schedule) {
      return
    }

    const shouldDelete = window.confirm(
      '이 일정을 삭제하시겠습니까?',
    )

    if (!shouldDelete) {
      return
    }

    setCalendarData((previousCalendarData) => {
      const sourceDateData =
        previousCalendarData[scheduleModal.sourceDate] ??
        createEmptyDayData()

      return {
        ...previousCalendarData,
        [scheduleModal.sourceDate]: {
          ...sourceDateData,
          schedules: sourceDateData.schedules.filter(
            (schedule) =>
              schedule.id !== scheduleModal.schedule.id,
          ),
        },
      }
    })

    closeScheduleModal()
  }

  const handleDiarySave = () => {
    setCalendarData((previousCalendarData) => {
      const dayData =
        previousCalendarData[selectedDate] ??
        createEmptyDayData()

      return {
        ...previousCalendarData,
        [selectedDate]: {
          ...dayData,
          diary: diaryDraft.trim(),
        },
      }
    })

    setIsDiaryEditing(false)
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
        <section className="calendar-month-section">
          <div className="calendar-month-navigation">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => handleMonthChange(-1)}
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
              onClick={() => handleMonthChange(1)}
            >
              <ChevronRight
                size={21}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEK_LABELS.map((weekday, index) => (
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
            ))}
          </div>

          <div className="calendar-grid">
            {monthCells.map((cell) => {
              const dayData =
                calendarData[cell.dateKey] ??
                createEmptyDayData()

              const myMood = getMoodInformation(
                dayData.myMood,
              )

              const partnerMood = getMoodInformation(
                dayData.partnerMood,
              )

              const isSelected =
                selectedDate === cell.dateKey

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
                  className={dayCellClassName}
                  style={{
                    '--my-mood-color': myMood.color,
                    '--partner-mood-color':
                      partnerMood.color,
                  }}
                  onClick={() => handleDateSelect(cell)}
                >
                  <span className={dayNumberClassName}>
                    {cell.day}
                  </span>

                  <span className="calendar-day-dots">
                    {dayData.anniversaries.length > 0 && (
                      <span className="anniversary-dot" />
                    )}

                    {dayData.schedules.length > 0 && (
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
              <p>{selectedDate.slice(0, 4)}년</p>

              <h2>{formatSelectedDate(selectedDate)}</h2>
            </div>

            <button
              type="button"
              className="add-schedule-button"
              onClick={openCreateScheduleModal}
            >
              <Plus
                size={16}
                strokeWidth={2.2}
                aria-hidden="true"
              />

              <span>일정</span>
            </button>
          </div>

          <div className="mood-summary">
            <div className="mood-summary-item">
              <span>나의 감정</span>

              <div>
                <i
                  style={{
                    background: myMoodInformation.color,
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
                      partnerMoodInformation.color,
                  }}
                />

                <strong>
                  {partnerMoodInformation.label}
                </strong>
              </div>
            </div>
          </div>

          <div className="selected-day-section">
            <div className="selected-day-section-title">
              <h3>
                일정

                <span>
                  {selectedDayData.schedules.length}
                </span>
              </h3>
            </div>

            {selectedDayData.schedules.length > 0 ? (
              <div className="schedule-list">
                {selectedDayData.schedules.map(
                  (schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      className="schedule-list-item"
                      onClick={() =>
                        openEditScheduleModal(schedule)
                      }
                    >
                      <time>
                        {schedule.time || '시간 미정'}
                      </time>

                      <span>{schedule.title}</span>

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
                  {selectedDayData.anniversaries.length}
                </span>
              </h3>
            </div>

            {selectedDayData.anniversaries.length > 0 ? (
              <div className="anniversary-list">
                {selectedDayData.anniversaries.map(
                  (anniversary) => (
                    <div
                      key={anniversary.id}
                      className="anniversary-list-item"
                    >
                      <span className="anniversary-dot" />

                      <strong>
                        {anniversary.title}
                      </strong>
                    </div>
                  ),
                )}
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
                  onClick={() => {
                    setDiaryDraft(
                      selectedDayData.diary ?? '',
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
                  onChange={(event) =>
                    setDiaryDraft(event.target.value)
                  }
                />

                <div>
                  <button
                    type="button"
                    className="diary-cancel-button"
                    onClick={() => {
                      setDiaryDraft(
                        selectedDayData.diary ?? '',
                      )
                      setIsDiaryEditing(false)
                    }}
                  >
                    취소
                  </button>

                  <button
                    type="button"
                    className="diary-save-button"
                    onClick={handleDiarySave}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <p className="diary-content">
                {selectedDayData.diary ||
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
          onClose={closeScheduleModal}
          onSave={handleScheduleSave}
          onDelete={handleScheduleDelete}
        />
      )}
    </div>
  )
}

export default CalendarPage