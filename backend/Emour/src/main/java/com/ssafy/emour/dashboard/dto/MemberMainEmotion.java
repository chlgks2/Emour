package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "커플 구성원 한 명의 주요 감정")
public record MemberMainEmotion(
        @Schema(description = "사용자 번호", example = "21")
        Long userId,

        @Schema(description = "분석 완료된 메시지 개수", example = "12")
        int analyzedMessageCount,

        @Schema(description = "가장 많이 나타난 감정, 결과가 없으면 null")
        EmotionSummaryItem dominantEmotion,

        @Schema(description = "감정별 메시지 개수")
        List<EmotionSummaryItem> emotions
) {
}
