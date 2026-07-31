package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "감정별 개수")
public record EmotionSummaryItem(
        @Schema(description = "감정 코드", example = "JOY")
        String emotionType,

        @Schema(description = "화면에 표시할 한글 감정명", example = "기쁨")
        String label,

        @Schema(description = "감정 개수", example = "5")
        int count
) {
}
