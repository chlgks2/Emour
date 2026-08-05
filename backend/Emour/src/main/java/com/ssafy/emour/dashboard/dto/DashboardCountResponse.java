package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Schema(description = "커플방의 기간별 정량 기록")
public record DashboardCountResponse(
        @Schema(description = "일 단위 저장 데이터 번호. 월·년 조회에서는 null")
        Long dashboardId,

        @Schema(description = "커플방 번호", example = "1")
        Long roomId,

        @Schema(description = "조회 단위", example = "MONTH")
        DashboardPeriod period,

        @Schema(description = "조회 시작 날짜", example = "2026-07-01")
        LocalDate startDate,

        @Schema(description = "조회 종료 날짜", example = "2026-07-31")
        LocalDate endDate,

        @Schema(description = "기존 일 단위 응답 호환용 날짜. 조회 시작 날짜와 같습니다.")
        LocalDate summaryDate,

        @Schema(description = "커플이 주고받은 메시지 개수", example = "50")
        int messageCount,

        @Schema(description = "커플이 채팅으로 주고받은 이미지 개수", example = "8")
        int imageCount,

        @Schema(description = "커플이 남긴 공감 개수", example = "6")
        int reactionCount,

        @Schema(description = "계산 시각")
        LocalDateTime calculatedAt,

        @Schema(description = "마지막 갱신 시각")
        LocalDateTime updatedAt
) {
}
