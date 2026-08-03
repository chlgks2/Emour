package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "사용자의 기간별 감정 흐름")
public record DashboardEmotionFlowResponse(
        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(description = "로그인한 사용자 번호", example = "10")
        Long userId,

        @Schema(description = "조회 단위", example = "MONTH")
        DashboardPeriod period,

        @Schema(description = "조회 시작 날짜", example = "2026-07-01")
        LocalDate startDate,

        @Schema(description = "조회 종료 날짜", example = "2026-07-31")
        LocalDate endDate,

        @Schema(description = "기존 일 단위 응답 호환용 날짜. 조회 시작 날짜와 같습니다.")
        LocalDate summaryDate,

        @Schema(description = "분석 완료된 전체 메시지 개수", example = "18")
        int analyzedMessageCount,

        @Schema(description = "조회 기간의 감정을 시간대별 2시간 단위로 합산한 12개 구간")
        List<EmotionFlowSlot> flow,

        @Schema(description = "계산 시각")
        LocalDateTime calculatedAt
) {
}
