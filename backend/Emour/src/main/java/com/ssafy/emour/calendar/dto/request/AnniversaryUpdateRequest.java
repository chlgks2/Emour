package com.ssafy.emour.calendar.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AnniversaryUpdateRequest(
        @Schema(example = "첫 여행 기념일")
        @NotBlank @Size(max = 100) String name,
        @Schema(example = "함께 떠난 첫 여행")
        @Size(max = 1000) String description,
        @Schema(example = "2025-09-01")
        @NotNull LocalDate scheduleDate
) {
    public AnniversaryUpdateRequest(String name, LocalDate scheduleDate) {
        this(name, null, scheduleDate);
    }
}
