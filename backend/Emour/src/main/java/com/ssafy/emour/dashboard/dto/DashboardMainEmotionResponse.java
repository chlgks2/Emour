package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "일·월·년 단위 주요 감정")
public record DashboardMainEmotionResponse(
        @Schema(description = "커플 방 번호", example = "1")
        Long roomId,

        @Schema(description = "로그인한 사용자 번호", example = "10")
        Long userId,

        @Schema(description = "조회 단위", example = "MONTH")
        DashboardPeriod period,

        @Schema(description = "조회 시작 날짜", example = "2026-07-01")
        LocalDate startDate,

        @Schema(description = "조회 종료 날짜", example = "2026-07-31")
        LocalDate endDate,

        @Schema(description = "분석 완료된 전체 메시지 개수", example = "12")
        int analyzedMessageCount,

        @Schema(description = "가장 많이 나타난 감정, 분석 결과가 없으면 null")
        EmotionSummaryItem dominantEmotion,

        @Schema(description = "15개 감정별 개수")
        List<EmotionSummaryItem> emotions,

        @Schema(description = "계산 시각")
        LocalDateTime calculatedAt
) {
}
