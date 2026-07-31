package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "사용자의 날짜별 감정 흐름")
public record DashboardEmotionFlowResponse(
        @Schema(description = "커플 방 번호", example = "1")
        Long roomId,

        @Schema(description = "로그인한 사용자 번호", example = "10")
        Long userId,

        @Schema(description = "집계 날짜", example = "2026-07-31")
        LocalDate summaryDate,

        @Schema(description = "분석이 완료된 전체 메시지 개수", example = "18")
        int analyzedMessageCount,

        @Schema(description = "0시부터 2시간 단위로 나눈 12개 감정 구간")
        List<EmotionFlowSlot> flow,

        @Schema(description = "마지막 계산 시각")
        LocalDateTime calculatedAt
) {
}
