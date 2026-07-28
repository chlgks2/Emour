import {
  MOCK_DIARY_RESPONSES,
  MOCK_MOOD_RESPONSES,
  MOCK_SCHEDULE_RESPONSES,
} from '../data/calendarMockData.js'

import {
  buildCalendarMonthData,
  mapDiaryResponse,
  mapScheduleResponse,
  SCHEDULE_TYPE,
} from '../mappers/calendarMapper.js'

const MOCK_DELAY = 250
const MOCK_CURRENT_USER_ID = 1

let mockSchedules = [
  ...MOCK_SCHEDULE_RESPONSES,
]

let mockDiaries = [
  ...MOCK_DIARY_RESPONSES,
]

function wait(milliseconds = MOCK_DELAY) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function createMonthPrefix(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export async function getMonthlyCalendar(
  coupleRoomId,
  year,
  month,
) {
  await wait()

  const monthPrefix = createMonthPrefix(
    year,
    month,
  )

  const moodResponses =
    MOCK_MOOD_RESPONSES.filter(
      (mood) =>
        mood.couple_room_id === coupleRoomId &&
        mood.created_at.startsWith(
          monthPrefix,
        ),
    )

  const scheduleResponses =
    mockSchedules.filter(
      (schedule) =>
        schedule.couple_room_id ===
          coupleRoomId &&
        schedule.date.startsWith(monthPrefix),
    )

  const diaryResponses = mockDiaries.filter(
    (diary) =>
      diary.couple_room_id === coupleRoomId &&
      diary.date.startsWith(monthPrefix) &&
      diary.deleted_at === null,
  )

  return buildCalendarMonthData({
    moodResponses,
    scheduleResponses,
    diaryResponses,
    currentUserId: MOCK_CURRENT_USER_ID,
  })
}

export async function createSchedule({
  coupleRoomId,
  name,
  date,
  time = '',
  type = SCHEDULE_TYPE.SCHEDULE,
}) {
  await wait()

  const now = new Date().toISOString()

  const response = {
    schedule_id: Date.now(),
    user_id: MOCK_CURRENT_USER_ID,
    couple_room_id: coupleRoomId,
    name: name.trim(),
    date,
    time,
    type,
    created_at: now,
    updated_at: now,
  }

  mockSchedules = [
    ...mockSchedules,
    response,
  ]

  return mapScheduleResponse(response)
}

export async function updateSchedule(
  scheduleId,
  {
    name,
    date,
    time = '',
    type = SCHEDULE_TYPE.SCHEDULE,
  },
) {
  await wait()

  let updatedResponse = null

  mockSchedules = mockSchedules.map(
    (schedule) => {
      if (
        schedule.schedule_id !== scheduleId
      ) {
        return schedule
      }

      updatedResponse = {
        ...schedule,
        name: name.trim(),
        date,
        time,
        type,
        updated_at: new Date().toISOString(),
      }

      return updatedResponse
    },
  )

  if (!updatedResponse) {
    throw new Error(
      '수정할 일정을 찾을 수 없습니다.',
    )
  }

  return mapScheduleResponse(updatedResponse)
}

export async function deleteSchedule(
  scheduleId,
) {
  await wait()

  const hasSchedule = mockSchedules.some(
    (schedule) =>
      schedule.schedule_id === scheduleId,
  )

  if (!hasSchedule) {
    throw new Error(
      '삭제할 일정을 찾을 수 없습니다.',
    )
  }

  mockSchedules = mockSchedules.filter(
    (schedule) =>
      schedule.schedule_id !== scheduleId,
  )
}

export async function saveDiary({
  coupleRoomId,
  date,
  content,
}) {
  await wait()

  const now = new Date().toISOString()

  const existingDiary = mockDiaries.find(
    (diary) =>
      diary.user_id === MOCK_CURRENT_USER_ID &&
      diary.couple_room_id === coupleRoomId &&
      diary.date === date &&
      diary.deleted_at === null,
  )

  let savedResponse

  if (existingDiary) {
    savedResponse = {
      ...existingDiary,
      content: content.trim(),
      updated_at: now,
    }

    mockDiaries = mockDiaries.map((diary) =>
      diary.diary_id ===
      existingDiary.diary_id
        ? savedResponse
        : diary,
    )
  } else {
    savedResponse = {
      diary_id: Date.now(),
      user_id: MOCK_CURRENT_USER_ID,
      couple_room_id: coupleRoomId,
      date,
      content: content.trim(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }

    mockDiaries = [
      ...mockDiaries,
      savedResponse,
    ]
  }

  return mapDiaryResponse(savedResponse)
}