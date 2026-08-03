package com.ssafy.emour.calendar.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record ScheduleCreateRequest(
        @Schema(example = "데이트")
        @NotBlank
        @Size(max = 100)
        String name,

        @Schema(example = "저녁 식사 후 영화 보기")
        @Size(max = 1000)
        String description,

        @Schema(example = "2026-08-05")
        @NotNull
        LocalDate scheduleDate,

        @Schema(example = "19:00")
        @NotNull
        LocalTime scheduleTime
) {
    public ScheduleCreateRequest(
            String name,
            LocalDate scheduleDate,
            LocalTime scheduleTime
    ) {
        this(name, null, scheduleDate, scheduleTime);
    }
}
