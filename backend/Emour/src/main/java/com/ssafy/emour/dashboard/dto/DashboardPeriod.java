package com.ssafy.emour.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "대시보드 조회 기간")
public enum DashboardPeriod {
    DAY,
    MONTH,
    YEAR
}
