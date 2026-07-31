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

        @Schema(example = "2026-08-05")
        @NotNull
        LocalDate scheduleDate,

        @Schema(example = "19:00")
        @NotNull
        LocalTime scheduleTime
) {
}
