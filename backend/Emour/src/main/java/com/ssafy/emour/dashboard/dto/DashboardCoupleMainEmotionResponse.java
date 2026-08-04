package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "커플 두 사람의 기간별 주요 감정")
public record DashboardCoupleMainEmotionResponse(
        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(description = "조회 단위", example = "MONTH")
        DashboardPeriod period,

        @Schema(description = "조회 시작 날짜", example = "2026-08-01")
        LocalDate startDate,

        @Schema(description = "조회 종료 날짜", example = "2026-08-31")
        LocalDate endDate,

        @Schema(description = "로그인 사용자의 주요 감정")
        MemberMainEmotion me,

        @Schema(description = "상대방의 주요 감정")
        MemberMainEmotion partner,

        @Schema(description = "두 결과 중 가장 최근 계산 시각")
        LocalDateTime calculatedAt
) {
}
