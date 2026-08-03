package com.ssafy.emour.dashboard.controller;

import com.ssafy.emour.dashboard.dto.DashboardConversationFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.dto.DashboardMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.service.DashboardConversationService;
import com.ssafy.emour.dashboard.service.DashboardEmotionService;
import com.ssafy.emour.dashboard.service.DashboardMainEmotionService;
import com.ssafy.emour.dashboard.service.DashboardService;
import com.ssafy.emour.dashboard.service.DashboardWordService;
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
@Tag(name = "대시보드 API", description = "커플방의 기간별 통계를 조회합니다.")
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardEmotionService dashboardEmotionService;
    private final DashboardWordService dashboardWordService;
    private final DashboardMainEmotionService dashboardMainEmotionService;
    private final DashboardConversationService dashboardConversationService;

    @GetMapping({"/counts", "/daily"})
    @Operation(
            summary = "기간별 정량 기록 조회",
            description = "커플 두 사람의 메시지, 이미지, 공감, 북마크 개수를 합산합니다."
    )
    public DashboardCountResponse getCounts(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 단위: DAY, MONTH, YEAR", example = "MONTH")
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,

            @Parameter(description = "기준 날짜", example = "2026-07-31")
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return dashboardService.getCounts(
                roomId,
                SecurityUtil.getCurrentUserId(),
                period,
                date
        );
    }

    @GetMapping("/emotion-flow")
    @Operation(
            summary = "기간별 감정 흐름 조회",
            description = "분석이 완료된 내 메시지 감정을 조회 기간의 2시간대별로 합산합니다."
    )
    public DashboardEmotionFlowResponse getEmotionFlow(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 단위: DAY, MONTH, YEAR", example = "MONTH")
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,

            @Parameter(description = "기준 날짜", example = "2026-07-31")
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return dashboardEmotionService.getEmotionFlow(
                roomId,
                SecurityUtil.getCurrentUserId(),
                period,
                date
        );
    }

    @GetMapping("/frequent-words")
    @Operation(
            summary = "기간별 자주 사용하는 단어 조회",
            description = "내가 보낸 텍스트 메시지에서 자주 사용한 단어를 조회합니다."
    )
    public DashboardFrequentWordsResponse getFrequentWords(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 단위: DAY, MONTH, YEAR", example = "MONTH")
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,

            @Parameter(description = "기준 날짜", example = "2026-07-31")
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,

            @Parameter(description = "가져올 단어 개수. 기본 10개, 최대 50개", example = "10")
            @RequestParam(required = false) Integer limit
    ) {
        return dashboardWordService.getFrequentWords(
                roomId,
                SecurityUtil.getCurrentUserId(),
                period,
                date,
                limit
        );
    }

    @GetMapping("/main-emotions")
    @Operation(
            summary = "기간별 주요 감정 조회",
            description = "분석이 완료된 내 메시지를 감정별로 집계합니다."
    )
    public DashboardMainEmotionResponse getMainEmotions(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 단위: DAY, MONTH, YEAR", example = "MONTH")
            @RequestParam DashboardPeriod period,

            @Parameter(description = "기준 날짜", example = "2026-07-31")
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return dashboardMainEmotionService.getMainEmotions(
                roomId,
                SecurityUtil.getCurrentUserId(),
                period,
                date
        );
    }

    @GetMapping("/conversation-flow")
    @Operation(
            summary = "기간별 커플 대화 흐름 조회",
            description = "커플 전체의 활발한 시간, 평균 응답 시간, 날짜별 메시지 개수를 조회합니다."
    )
    public DashboardConversationFlowResponse getConversationFlow(
            @Parameter(description = "커플방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 단위: DAY, MONTH, YEAR", example = "MONTH")
            @RequestParam DashboardPeriod period,

            @Parameter(description = "기준 날짜", example = "2026-07-31")
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return dashboardConversationService.getConversationFlow(
                roomId,
                SecurityUtil.getCurrentUserId(),
                period,
                date
        );
    }
}
