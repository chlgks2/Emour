package com.ssafy.emour.couple.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.time.LocalDate;

public record CoupleStartDateRequest(
        @Schema(example = "2025-08-01")
        @NotNull(message = "만난 날은 필수입니다.")
        @PastOrPresent(message = "만난 날은 미래 날짜일 수 없습니다.")
        LocalDate startDate
) {
}
