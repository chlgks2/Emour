package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "사용자의 날짜별 대시보드 개수")
public record DashboardCountResponse(
        @Schema(description = "대시보드 번호", example = "1")
        Long dashboardId,

        @Schema(description = "커플 방 번호", example = "1")
        Long roomId,

        @Schema(description = "로그인한 사용자 번호", example = "10")
        Long userId,

        @Schema(description = "집계 날짜", example = "2026-07-31")
        LocalDate summaryDate,

        @Schema(description = "사용자가 보낸 메시지 개수", example = "25")
        int messageCount,

        @Schema(description = "사용자가 보낸 이미지 개수", example = "4")
        int imageCount,

        @Schema(description = "사용자가 남긴 공감 개수", example = "3")
        int reactionCount,

        @Schema(description = "사용자가 저장한 북마크 개수", example = "2")
        int bookmarkCount,

        @Schema(description = "마지막 계산 시각")
        LocalDateTime calculatedAt,

        @Schema(description = "마지막 수정 시각")
        LocalDateTime updatedAt
) {
}
