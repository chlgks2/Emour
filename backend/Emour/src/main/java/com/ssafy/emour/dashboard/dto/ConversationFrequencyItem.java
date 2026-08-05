package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

@Schema(description = "날짜별 커플 대화 빈도")
public record ConversationFrequencyItem(
        @Schema(description = "날짜", example = "2026-07-31")
        LocalDate date,

        @Schema(description = "해당 날짜에 커플이 주고받은 메시지 개수", example = "42")
        int messageCount
) {
}
