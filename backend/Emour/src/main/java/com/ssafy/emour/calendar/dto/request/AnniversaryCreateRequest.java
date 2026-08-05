package com.ssafy.emour.calendar.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AnniversaryCreateRequest(
        @Schema(example = "첫 데이트 기념일")
        @NotBlank @Size(max = 100) String name,
        @Schema(example = "처음 만난 날")
        @Size(max = 1000) String description,
        @Schema(example = "2025-08-15")
        @NotNull LocalDate scheduleDate
) {
    public AnniversaryCreateRequest(String name, LocalDate scheduleDate) {
        this(name, null, scheduleDate);
    }
}
