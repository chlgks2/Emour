export const SCHEDULE_TYPE = {
  SCHEDULE: 'SCHEDULE',
  ANNIVERSARY: 'ANNIVERSARY',
}

export const ANNIVERSARY_REPEAT_TYPE = {
  NONE: 'NONE',
  YEARLY: 'YEARLY',
  EVERY_100_DAYS: 'EVERY_100_DAYS',
}

function getFirstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null,
  )
}

function extractDate(value) {
  if (!value) {
    return null
  }

  return String(value).slice(0, 10)
}

export function createEmptyCalendarDay(date) {
  return {
    date,
    myMood: null,
    partnerMood: null,
    schedules: [],
    anniversaries: [],
    diary: {
      diaryId: null,
      content: '',
    },
  }
}

export function mapMoodResponse(response) {
  const createdAt = getFirstValue(
    response.createdAt,
    response.created_at,
  )

  return {
    moodId: getFirstValue(
      response.moodId,
      response.mood_id,
    ),

    userId: getFirstValue(
      response.userId,
      response.user_id,
    ),

    coupleRoomId: getFirstValue(
      response.coupleRoomId,
      response.couple_room_id,
    ),

    moodType: getFirstValue(
      response.moodType,
      response.mood_type,
    ),

    date: getFirstValue(
      response.date,
      response.moodDate,
      response.mood_date,
      extractDate(createdAt),
    ),

    createdAt,
  }
}

export function mapScheduleResponse(response) {
  const date = extractDate(
    getFirstValue(
      response.occurrenceDate,
      response.occurrence_date,
      response.date,
      response.scheduleDate,
      response.schedule_date,
    ),
  )

  const yearlyRecurring = Boolean(
    getFirstValue(
      response.yearlyRecurring,
      response.yearly_recurring,
      false,
    ),
  )

  return {
    scheduleId: getFirstValue(
      response.scheduleId,
      response.schedule_id,
    ),

    userId: getFirstValue(
      response.userId,
      response.user_id,
    ),

    coupleRoomId: getFirstValue(
      response.coupleRoomId,
      response.couple_room_id,
    ),

    name: getFirstValue(
      response.name,
      response.title,
      '',
    ),

    date,

    startDate: extractDate(
      getFirstValue(
        response.startDate,
        response.start_date,
        response.date,
        response.scheduleDate,
        response.schedule_date,
      ),
    ),

    time: getFirstValue(
      response.time,
      response.scheduleTime,
      response.schedule_time,
      '',
    ),

    type: getFirstValue(
      response.type,
      response.scheduleType,
      response.schedule_type,
      SCHEDULE_TYPE.SCHEDULE,
    ),

    repeatType: getFirstValue(
      response.repeatType,
      response.repeat_type,
      yearlyRecurring
        ? ANNIVERSARY_REPEAT_TYPE.YEARLY
        : ANNIVERSARY_REPEAT_TYPE.NONE,
    ),

    yearlyRecurring,

    occurrenceNumber: getFirstValue(
      response.occurrenceNumber,
      response.occurrence_number,
      null,
    ),

    isAutomaticAnniversary: Boolean(
      getFirstValue(
        response.isAutomaticAnniversary,
        response.automatic_anniversary,
        false,
      ),
    ),

    createdAt: getFirstValue(
      response.createdAt,
      response.created_at,
    ),

    updatedAt: getFirstValue(
      response.updatedAt,
      response.updated_at,
    ),
  }
}

export function mapDiaryResponse(response) {
  return {
    diaryId: getFirstValue(
      response.diaryId,
      response.diary_id,
    ),

    userId: getFirstValue(
      response.userId,
      response.user_id,
    ),

    coupleRoomId: getFirstValue(
      response.coupleRoomId,
      response.couple_room_id,
    ),

    date: extractDate(response.date),

    content: response.content ?? '',

    createdAt: getFirstValue(
      response.createdAt,
      response.created_at,
    ),

    updatedAt: getFirstValue(
      response.updatedAt,
      response.updated_at,
    ),

    deletedAt: getFirstValue(
      response.deletedAt,
      response.deleted_at,
    ),
  }
}

function sortSchedules(schedules) {
  return [...schedules].sort((first, second) => {
    const firstTime = first.time || '99:99'
    const secondTime = second.time || '99:99'

    return firstTime.localeCompare(secondTime)
  })
}

export function buildCalendarMonthData({
  moodResponses = [],
  scheduleResponses = [],
  diaryResponses = [],
  currentUserId,
}) {
  const calendarData = {}

  const ensureDay = (date) => {
    if (!date) {
      return null
    }

    if (!calendarData[date]) {
      calendarData[date] =
        createEmptyCalendarDay(date)
    }

    return calendarData[date]
  }

  moodResponses
    .map(mapMoodResponse)
    .forEach((mood) => {
      const day = ensureDay(mood.date)

      if (!day) {
        return
      }

      if (mood.userId === currentUserId) {
        day.myMood = mood.moodType
      } else {
        day.partnerMood = mood.moodType
      }
    })

  scheduleResponses
    .map(mapScheduleResponse)
    .forEach((schedule) => {
      const day = ensureDay(schedule.date)

      if (!day) {
        return
      }

      if (
        schedule.type ===
        SCHEDULE_TYPE.ANNIVERSARY
      ) {
        day.anniversaries.push(schedule)
      } else {
        day.schedules.push(schedule)
      }
    })

  diaryResponses
    .map(mapDiaryResponse)
    .filter(
      (diary) =>
        diary.userId === currentUserId &&
        !diary.deletedAt,
    )
    .forEach((diary) => {
      const day = ensureDay(diary.date)

      if (!day) {
        return
      }

      day.diary = diary
    })

  Object.values(calendarData).forEach((day) => {
    day.schedules = sortSchedules(day.schedules)
    day.anniversaries = sortSchedules(
      day.anniversaries,
    )
  })

  return calendarData
}
