package com.ssafy.emour.mood.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record MoodNotificationUpdateRequest(

        @NotNull(message = "알림 활성화 여부는 필수입니다.")
        Boolean isEnabled,

        @NotNull(message = "알림 시작 시간은 필수입니다.")
        LocalTime startTime,

        @NotNull(message = "알림 종료 시간은 필수입니다.")
        LocalTime endTime,

        @Min(value = 1, message = "알림 간격은 1시간 이상이어야 합니다.")
        @Max(value = 24, message = "알림 간격은 24시간 이하여야 합니다.")
        int intervalHours
) {
}
