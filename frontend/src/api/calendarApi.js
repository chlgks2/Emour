import {
  MOCK_DIARY_RESPONSES,
  MOCK_MOOD_RESPONSES,
  MOCK_SCHEDULE_RESPONSES,
} from '../data/calendarMockData.js'

import {
  buildCalendarMonthData,
  mapDiaryResponse,
  mapScheduleResponse,
  ANNIVERSARY_REPEAT_TYPE,
  SCHEDULE_TYPE,
} from '../mappers/calendarMapper.js'

const MOCK_DELAY = 250
const MOCK_CURRENT_USER_ID = 1
const RELATIONSHIP_START_DATE_KEY =
  'emour_relationship_start_date'

let mockSchedules = [
  ...MOCK_SCHEDULE_RESPONSES,
]

let mockDiaries = [
  ...MOCK_DIARY_RESPONSES,
]

let mockRelationshipStartDate =
  localStorage.getItem(
    RELATIONSHIP_START_DATE_KEY,
  ) ?? ''

function wait(milliseconds = MOCK_DELAY) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function createMonthPrefix(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function createDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function createLocalDate(dateKey) {
  const [year, month, day] =
    dateKey.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function createAnniversaryOccurrences(
  anniversary,
  year,
  month,
) {
  const startDate = createLocalDate(
    anniversary.start_date ??
      anniversary.date,
  )

  const monthStart =
    new Date(year, month - 1, 1)
  const monthEnd =
    new Date(year, month, 0)

  const occurrenceDate = new Date(
    year,
    startDate.getMonth(),
    startDate.getDate(),
  )

  if (
    occurrenceDate < monthStart ||
    occurrenceDate > monthEnd ||
    occurrenceDate < startDate
  ) {
    return []
  }

  return [{
    ...anniversary,
    occurrence_date:
      createDateKey(occurrenceDate),
    occurrence_number: null,
    repeat_type:
      ANNIVERSARY_REPEAT_TYPE.YEARLY,
    yearly_recurring: true,
  }]
}

function createRelationshipMilestones(
  year,
  month,
) {
  if (!mockRelationshipStartDate) {
    return []
  }

  const startDate = createLocalDate(
    mockRelationshipStartDate,
  )
  const monthStart =
    new Date(year, month - 1, 1)
  const monthEnd =
    new Date(year, month, 0)
  const millisecondsPerDay =
    24 * 60 * 60 * 1000
  const elapsedDays = Math.max(
    1,
    Math.floor(
      (monthStart.getTime() -
        startDate.getTime()) /
        millisecondsPerDay,
    ) + 1,
  )
  let milestone = Math.max(
    100,
    Math.ceil(elapsedDays / 100) * 100,
  )
  const occurrences = []

  while (true) {
    const occurrenceDate = new Date(
      startDate,
    )

    occurrenceDate.setDate(
      occurrenceDate.getDate() +
        milestone -
        1,
    )

    if (occurrenceDate > monthEnd) {
      break
    }

    if (occurrenceDate >= monthStart) {
      occurrences.push({
        schedule_id:
          `RELATIONSHIP-${milestone}`,
        user_id: MOCK_CURRENT_USER_ID,
        couple_room_id: 1,
        name: `우리의 ${milestone}일`,
        date: mockRelationshipStartDate,
        start_date:
          mockRelationshipStartDate,
        occurrence_date:
          createDateKey(occurrenceDate),
        occurrence_number: milestone,
        time: '',
        type:
          SCHEDULE_TYPE.ANNIVERSARY,
        repeat_type:
          ANNIVERSARY_REPEAT_TYPE.EVERY_100_DAYS,
        yearly_recurring: false,
        automatic_anniversary: true,
      })
    }

    milestone += 100
  }

  return occurrences
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

  const roomSchedules =
    mockSchedules.filter(
      (schedule) =>
        schedule.couple_room_id ===
        coupleRoomId,
    )

  const scheduleResponses = [
    ...roomSchedules.filter(
      (schedule) =>
        schedule.type ===
          SCHEDULE_TYPE.SCHEDULE &&
        schedule.date.startsWith(
          monthPrefix,
        ),
    ),
    ...roomSchedules
      .filter(
        (schedule) =>
          schedule.type ===
          SCHEDULE_TYPE.ANNIVERSARY,
      )
      .flatMap((anniversary) =>
        createAnniversaryOccurrences(
          anniversary,
          year,
          month,
        ),
      ),
    ...createRelationshipMilestones(
      year,
      month,
    ),
  ]

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

export async function getAnniversaries(
  coupleRoomId,
) {
  await wait()

  return mockSchedules
    .filter(
      (schedule) =>
        schedule.couple_room_id ===
          coupleRoomId &&
        schedule.type ===
          SCHEDULE_TYPE.ANNIVERSARY,
    )
    .map(mapScheduleResponse)
    .sort((first, second) =>
      first.startDate.localeCompare(
        second.startDate,
      ),
    )
}

export async function getRelationshipStartDate() {
  await wait()

  return mockRelationshipStartDate
}

export async function updateRelationshipStartDate(
  startDate,
) {
  await wait()

  if (!startDate) {
    throw new Error(
      '연애 시작일을 선택해주세요.',
    )
  }

  mockRelationshipStartDate = startDate
  localStorage.setItem(
    RELATIONSHIP_START_DATE_KEY,
    startDate,
  )

  return mockRelationshipStartDate
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
    start_date: date,
    time,
    type,
    repeat_type:
      type === SCHEDULE_TYPE.ANNIVERSARY
        ? ANNIVERSARY_REPEAT_TYPE.YEARLY
        : ANNIVERSARY_REPEAT_TYPE.NONE,
    yearly_recurring:
      type ===
      SCHEDULE_TYPE.ANNIVERSARY,
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
        start_date: date,
        time,
        type,
        repeat_type:
          type ===
          SCHEDULE_TYPE.ANNIVERSARY
            ? ANNIVERSARY_REPEAT_TYPE.YEARLY
            : ANNIVERSARY_REPEAT_TYPE.NONE,
        yearly_recurring:
          type ===
          SCHEDULE_TYPE.ANNIVERSARY,
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
