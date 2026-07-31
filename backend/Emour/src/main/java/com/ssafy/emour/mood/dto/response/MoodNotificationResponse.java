package com.ssafy.emour.mood.dto.response;

import com.ssafy.emour.mood.entity.MoodNotification;

import java.time.LocalTime;

public record MoodNotificationResponse(
        Long roomId,
        boolean isEnabled,
        LocalTime startTime,
        LocalTime endTime,
        int intervalHours
) {
    public static MoodNotificationResponse from(
            MoodNotification notification
    ) {
        return new MoodNotificationResponse(
                notification.getRoomId(),
                notification.isActive(),
                notification.getStartTime(),
                notification.getEndTime(),
                notification.getIntervalHours()
        );
    }
}
