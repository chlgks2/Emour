package com.ssafy.emour.calendar.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record ScheduleUpdateRequest(
        @Schema(example = "영화 데이트")
        @NotBlank @Size(max = 100) String name,
        @Schema(example = "2026-08-06")
        @NotNull LocalDate scheduleDate,
        @Schema(example = "20:00")
        @NotNull LocalTime scheduleTime
) {
}
