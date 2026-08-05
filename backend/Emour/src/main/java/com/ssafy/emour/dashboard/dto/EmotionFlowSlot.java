package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "2시간 단위 감정 개수")
public record EmotionFlowSlot(
        @Schema(description = "구간 시작 시간", example = "0")
        int startHour,

        @Schema(description = "구간 종료 시간", example = "2")
        int endHour,

        @Schema(description = "긍정 감정 개수", example = "3")
        int positiveCount,

        @Schema(description = "부정 감정 개수", example = "1")
        int negativeCount,

        @Schema(description = "중립 감정 개수", example = "2")
        int neutralCount
) {
}
