package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "사용자의 날짜별 자주 사용하는 단어")
public record DashboardFrequentWordsResponse(
        @Schema(description = "커플 방 번호", example = "1")
        Long roomId,

        @Schema(description = "로그인한 사용자 번호", example = "10")
        Long userId,

        @Schema(description = "집계 날짜", example = "2026-07-31")
        LocalDate summaryDate,

        @Schema(description = "분리된 전체 단어 개수", example = "42")
        int totalWordCount,

        @Schema(description = "서로 다른 단어 개수", example = "18")
        int distinctWordCount,

        @Schema(description = "사용 횟수가 많은 단어 목록")
        List<FrequentWordItem> words,

        @Schema(description = "마지막 계산 시각")
        LocalDateTime calculatedAt
) {
}
