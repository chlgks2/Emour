function getFirstValue(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null,
  )
}

function normalizeTime(
  value,
  fallbackValue,
) {
  if (!value) {
    return fallbackValue
  }

  const timeValue = String(value)

  if (
    /^\d{2}:\d{2}/.test(timeValue)
  ) {
    return timeValue.slice(0, 5)
  }

  return fallbackValue
}

export function mapNotificationSettingResponse(
  response = {},
) {
  return {
    settingId: getFirstValue(
      response.settingId,
      response.setting_id,
      null,
    ),

    userId: getFirstValue(
      response.userId,
      response.user_id,
      null,
    ),

    roomId: getFirstValue(
      response.roomId,
      response.room_id,
      null,
    ),

    isEnabled: Boolean(
      getFirstValue(
        response.isEnabled,
        response.is_enabled,
        true,
      ),
    ),

    startTime: normalizeTime(
      getFirstValue(
        response.startTime,
        response.start_time,
      ),
      '09:00',
    ),

    endTime: normalizeTime(
      getFirstValue(
        response.endTime,
        response.end_time,
      ),
      '21:00',
    ),

    intervalHours: Number(
      getFirstValue(
        response.intervalHours,
        response.interval_hours,
        3,
      ),
    ),

    createdAt: getFirstValue(
      response.createdAt,
      response.created_at,
      null,
    ),

    updatedAt: getFirstValue(
      response.updatedAt,
      response.updated_at,
      null,
    ),
  }
}

export function mapNotificationSettingApiPayload(
  payload,
) {
  const responseData =
    payload?.data ?? payload ?? {}

  const settingResponse =
    responseData.setting ??
    responseData.notificationSetting ??
    responseData.moodNotificationSetting ??
    responseData

  return mapNotificationSettingResponse(
    settingResponse,
  )
}