package com.ssafy.emour.dashboard.controller;

import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.dto.DashboardMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
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
@Tag(name = "대시보드 API", description = "날짜별 정량 데이터를 조회합니다.")
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardEmotionService dashboardEmotionService;
    private final DashboardWordService dashboardWordService;
    private final DashboardMainEmotionService dashboardMainEmotionService;

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

    @GetMapping("/emotion-flow")
    @Operation(
            summary = "날짜별 감정 흐름 조회",
            description = """
                    분석이 완료된 내 메시지의 감정을 2시간 단위로 집계합니다.
                    긍정, 부정, 중립 개수를 0시부터 총 12개 구간으로 반환합니다.
                    """
    )
    public DashboardEmotionFlowResponse getDailyEmotionFlow(
            @Parameter(description = "커플 방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 날짜", example = "2026-07-31")
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return dashboardEmotionService.getDailyEmotionFlow(
                roomId,
                SecurityUtil.getCurrentUserId(),
                date
        );
    }

    @GetMapping("/frequent-words")
    @Operation(
            summary = "날짜별 자주 사용하는 단어 조회",
            description = """
                    내가 보낸 텍스트 메시지를 단어로 나누고 사용 횟수가 많은 순서로 반환합니다.
                    같은 횟수라면 가나다 및 알파벳 순서로 정렬합니다.
                    """
    )
    public DashboardFrequentWordsResponse getDailyFrequentWords(
            @Parameter(description = "커플 방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 날짜", example = "2026-07-31")
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,

            @Parameter(description = "가져올 단어 개수, 기본 10개, 최대 50개", example = "10")
            @RequestParam(required = false)
            Integer limit
    ) {
        return dashboardWordService.getDailyFrequentWords(
                roomId,
                SecurityUtil.getCurrentUserId(),
                date,
                limit
        );
    }

    @GetMapping("/main-emotions")
    @Operation(
            summary = "일·월·년 주요 감정 조회",
            description = """
                    분석이 완료된 내 메시지를 감정별로 집계합니다.
                    15개 감정의 개수와 가장 많이 나타난 감정을 반환합니다.
                    """
    )
    public DashboardMainEmotionResponse getMainEmotions(
            @Parameter(description = "커플 방 번호", example = "1")
            @RequestParam Long roomId,

            @Parameter(description = "조회 단위: DAY, MONTH, YEAR", example = "MONTH")
            @RequestParam DashboardPeriod period,

            @Parameter(
                    description = "기준 날짜. 월·년 조회에서는 해당 월·연도만 사용합니다.",
                    example = "2026-07-31"
            )
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
}
