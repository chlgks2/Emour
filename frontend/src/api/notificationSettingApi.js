import {
  MOCK_NOTIFICATION_SETTING_RESPONSE,
} from '../data/notificationSettingMockData.js'

import {
  mapNotificationSettingApiPayload,
  mapNotificationSettingResponse,
} from '../mappers/notificationSettingMapper.js'

import {
  apiRequest,
} from './httpClient.js'

const USE_MOCK_API =
  import.meta.env
    .VITE_USE_NOTIFICATION_MOCK_API ===
  'true'

const MOCK_DELAY = 250

const ENDPOINTS = {
  moodNotificationSetting:
    '/users/me/mood-notification-setting',
}

let mockNotificationSettingResponse = {
  ...MOCK_NOTIFICATION_SETTING_RESPONSE,
}

function wait(milliseconds = MOCK_DELAY) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function createMappedMockResponse() {
  return mapNotificationSettingResponse(
    mockNotificationSettingResponse,
  )
}

function validateSetting({
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
    endMinutes === null
  ) {
    throw new Error(
      '올바른 시간을 선택해주세요.',
    )
  }

  if (startMinutes >= endMinutes) {
    throw new Error(
      '종료 시간은 시작 시간보다 늦어야 합니다.',
    )
  }

  const allowedIntervals = [
    1,
    2,
    3,
    4,
    6,
  ]

  if (
    !allowedIntervals.includes(
      Number(intervalHours),
    )
  ) {
    throw new Error(
      '올바른 알림 간격을 선택해주세요.',
    )
  }
}

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
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  return hour * 60 + minute
}

export async function getMoodNotificationSetting() {
  if (USE_MOCK_API) {
    await wait()

    return createMappedMockResponse()
  }

  const response = await apiRequest(
    ENDPOINTS.moodNotificationSetting,
  )

  return mapNotificationSettingApiPayload(
    response,
  )
}

export async function updateMoodNotificationSetting({
  isEnabled,
  startTime,
  endTime,
  intervalHours,
}) {
  validateSetting({
    startTime,
    endTime,
    intervalHours,
  })

  if (USE_MOCK_API) {
    await wait()

    mockNotificationSettingResponse = {
      ...mockNotificationSettingResponse,
      is_enabled: Boolean(isEnabled),
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      interval_hours:
        Number(intervalHours),
      updated_at:
        new Date().toISOString(),
    }

    return createMappedMockResponse()
  }

  const response = await apiRequest(
    ENDPOINTS.moodNotificationSetting,
    {
      method: 'PUT',
      body: {
        isEnabled: Boolean(isEnabled),
        startTime,
        endTime,
        intervalHours:
          Number(intervalHours),
      },
    },
  )

  if (response) {
    return mapNotificationSettingApiPayload(
      response,
    )
  }

  return getMoodNotificationSetting()
}
