package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "회원의 기간별 개인 기록")
public record MemberDashboardCountResponse(
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

        @Schema(description = "사용자가 저장한 북마크 개수", example = "4")
        int bookmarkCount,

        @Schema(description = "계산 시각")
        LocalDateTime calculatedAt
) {
}
