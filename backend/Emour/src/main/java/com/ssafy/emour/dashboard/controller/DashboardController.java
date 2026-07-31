package com.ssafy.emour.dashboard.controller;

import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.service.DashboardService;
import com.ssafy.emour.global.util.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/dashboards")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "대시보드 API", description = "날짜별 정량 데이터를 조회합니다.")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/daily")
    @Operation(
            summary = "날짜별 개수 조회",
            description = "로그인한 사용자의 메시지, 이미지, 공감, 북마크 개수를 계산하고 저장합니다."
    )
    public DashboardCountResponse getDailyCounts(
            @Parameter(description = "커플 방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 날짜", example = "2026-07-31")
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return dashboardService.getDailyCounts(
                roomId,
                SecurityUtil.getCurrentUserId(),
                date
        );
    }
}
