import { apiRequest } from './httpClient.js'

import {
  buildCalendarMonthData,
  mapDiaryResponse,
  mapScheduleResponse,
  ANNIVERSARY_REPEAT_TYPE,
  SCHEDULE_TYPE,
} from '../mappers/calendarMapper.js'

const RELATIONSHIP_START_DATE_KEY =
  'emour_relationship_start_date'

function unwrap(response, fallback = null) {
  return response?.data ?? response ?? fallback
}

function normalizeCollection(
  response,
  candidateKeys = [],
) {
  const data = unwrap(response, [])

  if (Array.isArray(data)) {
    return data
  }

  const keys = [
    ...candidateKeys,
    'content',
    'items',
    'list',
  ]

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key]
    }
  }

  return []
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

function getRelationshipStartDateValue() {
  return localStorage.getItem(
    RELATIONSHIP_START_DATE_KEY,
  ) ?? ''
}

function createAnniversaryOccurrences(
  anniversary,
  year,
  month,
) {
  const mappedAnniversary =
    mapScheduleResponse(anniversary)
  const startDate = createLocalDate(
    mappedAnniversary.startDate,
  )
  const occurrenceDate = new Date(
    year,
    startDate.getMonth(),
    startDate.getDate(),
  )

  if (
    occurrenceDate.getMonth() !== month - 1 ||
    occurrenceDate < startDate
  ) {
    return []
  }

  return [{
    ...anniversary,
    occurrenceDate:
      createDateKey(occurrenceDate),
    occurrenceNumber: null,
    repeatType:
      ANNIVERSARY_REPEAT_TYPE.YEARLY,
    yearlyRecurring: true,
  }]
}

function createRelationshipMilestones(
  year,
  month,
) {
  const relationshipStartDate =
    getRelationshipStartDateValue()

  if (!relationshipStartDate) {
    return []
  }

  const startDate = createLocalDate(
    relationshipStartDate,
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
    const occurrenceDate =
      new Date(startDate)

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
        scheduleId:
          `RELATIONSHIP-${milestone}`,
        name: `우리의 ${milestone}일`,
        date: relationshipStartDate,
        startDate:
          relationshipStartDate,
        occurrenceDate:
          createDateKey(occurrenceDate),
        occurrenceNumber: milestone,
        time: '',
        type:
          SCHEDULE_TYPE.ANNIVERSARY,
        repeatType:
          ANNIVERSARY_REPEAT_TYPE.EVERY_100_DAYS,
        yearlyRecurring: false,
        isAutomaticAnniversary: true,
      })
    }

    milestone += 100
  }

  return occurrences
}

async function fetchSchedules(year, month) {
  const query = new URLSearchParams({
    year: String(year),
    month: String(month),
  })
  const response = await apiRequest(
    `/schedules?${query.toString()}`,
  )

  return normalizeCollection(response, [
    'schedules',
    'scheduleList',
  ])
}

async function fetchAnniversaries() {
  const response =
    await apiRequest('/anniversaries')

  return normalizeCollection(response, [
    'anniversaries',
    'anniversaryList',
  ])
}

async function fetchDiaries() {
  const response =
    await apiRequest('/diaries')

  return normalizeCollection(response, [
    'diaries',
    'diaryList',
  ])
}

export async function getMonthlyCalendar(
  _coupleRoomId,
  year,
  month,
) {
  const monthPrefix = createMonthPrefix(
    year,
    month,
  )
  const [
    schedules,
    anniversaries,
    diaries,
  ] = await Promise.all([
    fetchSchedules(year, month),
    fetchAnniversaries(),
    fetchDiaries(),
  ])

  const scheduleResponses = [
    ...schedules,
    ...anniversaries.flatMap(
      (anniversary) =>
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
  const diaryResponses = diaries.filter(
    (diary) =>
      String(diary.date ?? '').startsWith(
        monthPrefix,
      ),
  )

  return buildCalendarMonthData({
    scheduleResponses,
    diaryResponses,
    currentUserId: null,
  })
}

export async function getTodaySchedules(
  dateKey,
) {
  const [year, month] = dateKey
    .split('-')
    .map(Number)
  const monthData =
    await getMonthlyCalendar(
      null,
      year,
      month,
    )
  const day = monthData?.[dateKey]
  const schedules = [
    ...(day?.schedules ?? []),
    ...(day?.anniversaries ?? []),
  ]

  return schedules.map((schedule) => ({
    scheduleId: schedule.scheduleId,
    name: schedule.name,
    description:
      schedule.description ?? '',
    scheduleDate: schedule.date,
    scheduleTime:
      schedule.time || null,
    scheduleType: schedule.type,
    yearlyRecurring:
      schedule.yearlyRecurring,
  }))
}

export async function getAnniversaries() {
  const anniversaries =
    await fetchAnniversaries()

  return anniversaries
    .map(mapScheduleResponse)
    .sort((first, second) =>
      first.startDate.localeCompare(
        second.startDate,
      ),
    )
}

export async function getRelationshipStartDate() {
  return getRelationshipStartDateValue()
}

export async function updateRelationshipStartDate(
  startDate,
) {
  if (!startDate) {
    throw new Error(
      '연애 시작일을 선택해주세요.',
    )
  }

  localStorage.setItem(
    RELATIONSHIP_START_DATE_KEY,
    startDate,
  )

  return startDate
}

function validateScheduleInput({
  name,
  date,
  time,
  type,
}) {
  if (!name?.trim() || !date) {
    throw new Error(
      '이름과 날짜를 입력해주세요.',
    )
  }

  if (
    type === SCHEDULE_TYPE.SCHEDULE &&
    !time
  ) {
    throw new Error(
      '일정 시간을 입력해주세요.',
    )
  }
}

function createScheduleRequestBody({
  name,
  date,
  time,
  type,
}) {
  validateScheduleInput({
    name,
    date,
    time,
    type,
  })

  if (
    type === SCHEDULE_TYPE.ANNIVERSARY
  ) {
    return {
      name: name.trim(),
      scheduleDate: date,
    }
  }

  return {
    name: name.trim(),
    scheduleDate: date,
    scheduleTime: time,
  }
}

export async function createSchedule({
  name,
  date,
  time = '',
  type = SCHEDULE_TYPE.SCHEDULE,
}) {
  const endpoint =
    type === SCHEDULE_TYPE.ANNIVERSARY
      ? '/anniversaries'
      : '/schedules'
  const response = await apiRequest(
    endpoint,
    {
      method: 'POST',
      body: createScheduleRequestBody({
        name,
        date,
        time,
        type,
      }),
    },
  )

  return mapScheduleResponse(
    unwrap(response),
  )
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
  const endpoint =
    type === SCHEDULE_TYPE.ANNIVERSARY
      ? `/anniversaries/${scheduleId}`
      : `/schedules/${scheduleId}`
  const response = await apiRequest(
    endpoint,
    {
      method: 'PATCH',
      body: createScheduleRequestBody({
        name,
        date,
        time,
        type,
      }),
    },
  )

  return mapScheduleResponse(
    unwrap(response),
  )
}

export async function deleteSchedule(
  scheduleId,
  type = SCHEDULE_TYPE.SCHEDULE,
) {
  const endpoint =
    type === SCHEDULE_TYPE.ANNIVERSARY
      ? `/anniversaries/${scheduleId}`
      : `/schedules/${scheduleId}`

  await apiRequest(endpoint, {
    method: 'DELETE',
  })
}

export async function saveDiary({
  date,
  content,
}) {
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    throw new Error(
      '한줄 일기 내용을 입력해주세요.',
    )
  }

  const diaries = await fetchDiaries()
  const existingDiary = diaries.find(
    (diary) =>
      String(diary.date).slice(0, 10) ===
      date,
  )
  const today = createDateKey(new Date())

  if (!existingDiary && date !== today) {
    throw new Error(
      '한줄 일기는 오늘 날짜에만 새로 작성할 수 있습니다.',
    )
  }

  const endpoint = existingDiary
    ? `/diaries/${
        existingDiary.diaryId ??
        existingDiary.diary_id
      }`
    : '/diaries'
  const response = await apiRequest(
    endpoint,
    {
      method: existingDiary
        ? 'PATCH'
        : 'POST',
      body: {
        content: trimmedContent,
      },
    },
  )

  return mapDiaryResponse(
    unwrap(response),
  )
}
