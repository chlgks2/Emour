package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "커플 전체 대화 흐름")
public record DashboardConversationFlowResponse(
        @Schema(description = "커플 방 번호", example = "1")
        Long roomId,

        @Schema(description = "조회 단위", example = "MONTH")
        DashboardPeriod period,

        @Schema(description = "조회 시작 날짜", example = "2026-07-01")
        LocalDate startDate,

        @Schema(description = "조회 종료 날짜", example = "2026-07-31")
        LocalDate endDate,

        @Schema(description = "커플 전체 메시지 개수", example = "128")
        int totalMessageCount,

        @Schema(
                description = "메시지가 가장 많았던 시간대(0~23). 메시지가 없으면 null",
                example = "21"
        )
        Integer busiestHour,

        @Schema(
                description = "발신자가 바뀔 때까지 걸린 평균 시간(초). 응답이 없으면 null",
                example = "85.50"
        )
        BigDecimal averageResponseSeconds,

        @Schema(description = "날짜별 커플 전체 메시지 개수")
        List<ConversationFrequencyItem> dailyFrequency,

        @Schema(description = "계산 시각")
        LocalDateTime calculatedAt
) {
}
