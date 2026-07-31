package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "단어별 사용 횟수")
public record FrequentWordItem(
        @Schema(description = "사용한 단어", example = "사랑해")
        String word,

        @Schema(description = "사용 횟수", example = "5")
        int count
) {
}
