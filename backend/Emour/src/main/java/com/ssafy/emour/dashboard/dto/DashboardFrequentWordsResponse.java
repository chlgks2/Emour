package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "커플방의 기간별 자주 사용하는 단어")
public record DashboardFrequentWordsResponse(
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

        @Schema(description = "분리된 전체 단어 개수", example = "42")
        int totalWordCount,

        @Schema(description = "서로 다른 단어 개수", example = "18")
        int distinctWordCount,

        @Schema(description = "사용 횟수가 많은 단어 목록")
        List<FrequentWordItem> words,

        @Schema(description = "계산 시각")
        LocalDateTime calculatedAt
) {
}
