package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;

@Schema(description = "대시보드 조회 기간")
public enum DashboardPeriod {
    DAY,
    WEEK,
    MONTH,
    YEAR,
    ALL;

    /** 선택한 날짜가 포함된 기간의 시작일을 반환합니다. */
    public LocalDate startDate(LocalDate date) {
        return switch (this) {
            case DAY -> date;
            case WEEK -> date.minusDays(
                    date.getDayOfWeek().getValue() % 7L
            );
            case MONTH -> date.withDayOfMonth(1);
            case YEAR -> date.withDayOfYear(1);
            case ALL -> throw new IllegalStateException(
                    "전체 기간은 커플방의 첫 메시지를 기준으로 계산합니다."
            );
        };
    }

    /** 조회 종료일 다음 날을 반환합니다. */
    public LocalDate endExclusive(LocalDate startDate) {
        return switch (this) {
            case DAY -> startDate.plusDays(1);
            case WEEK -> startDate.plusWeeks(1);
            case MONTH -> startDate.plusMonths(1);
            case YEAR -> startDate.plusYears(1);
            case ALL -> throw new IllegalStateException(
                    "전체 기간은 오늘까지 계산합니다."
            );
        };
    }
}
