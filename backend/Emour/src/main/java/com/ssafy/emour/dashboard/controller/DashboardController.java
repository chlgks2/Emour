package com.ssafy.emour.dashboard.controller;

import com.ssafy.emour.dashboard.dto.DashboardConversationFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardCoupleEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.dto.DashboardCoupleMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.MemberDashboardCountResponse;
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
@Tag(name = "대시보드 API", description = "개인 및 커플 기간별 통계를 조회합니다.")
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardEmotionService dashboardEmotionService;
    private final DashboardWordService dashboardWordService;
    private final DashboardMainEmotionService dashboardMainEmotionService;
    private final DashboardConversationService dashboardConversationService;

    @GetMapping("/couple/counts")
    @Operation(
            summary = "기간별 커플 정량 기록 조회",
            description = "커플 전체의 메시지, 이미지, 공감 개수를 합산합니다."
    )
    public DashboardCountResponse getCounts(
            @RequestParam Long roomId,
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,
            @Parameter(description = "ALL 조회에서는 생략할 수 있습니다.")
            @RequestParam(required = false)
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

    @GetMapping("/me/counts")
    @Operation(
            summary = "기간별 개인 기록 조회",
            description = "로그인 사용자가 저장한 북마크 개수를 조회합니다."
    )
    public MemberDashboardCountResponse getMemberCounts(
            @RequestParam Long roomId,
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,
            @Parameter(description = "ALL 조회에서는 생략할 수 있습니다.")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return dashboardService.getMemberCounts(
                roomId,
                SecurityUtil.getCurrentUserId(),
                period,
                date
        );
    }

    @GetMapping("/couple/emotion-flow")
    @Operation(
            summary = "기간별 커플 감정 흐름 조회",
            description = "로그인 사용자와 연인의 감정 흐름을 각각 집계해 함께 반환합니다."
    )
    public DashboardCoupleEmotionFlowResponse getCoupleEmotionFlow(
            @RequestParam Long roomId,
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,
            @Parameter(description = "ALL 조회에서는 생략할 수 있습니다.")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return dashboardEmotionService.getCoupleEmotionFlow(
                roomId,
                SecurityUtil.getCurrentUserId(),
                period,
                date
        );
    }

    @GetMapping("/couple/frequent-words")
    @Operation(
            summary = "기간별 커플 자주 쓰는 단어 조회",
            description = "커플 두 사람이 보낸 텍스트에서 자주 사용한 단어를 조회합니다."
    )
    public DashboardFrequentWordsResponse getFrequentWords(
            @RequestParam Long roomId,
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,
            @Parameter(description = "ALL 조회에서는 생략할 수 있습니다.")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            @Parameter(description = "기본 10개, 최대 50개", example = "10")
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

    @GetMapping("/couple/main-emotions")
    @Operation(
            summary = "기간별 사용자별 주요 감정 조회",
            description = "로그인 사용자와 상대방의 주요 감정을 각각 집계해 반환합니다."
    )
    public DashboardCoupleMainEmotionResponse getMainEmotions(
            @RequestParam Long roomId,
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,
            @Parameter(description = "ALL 조회에서는 생략할 수 있습니다.")
            @RequestParam(required = false)
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

    @GetMapping("/couple/conversation-flow")
    @Operation(
            summary = "기간별 커플 대화 흐름 조회",
            description = "커플 전체의 활발한 시간, 평균 응답시간, 날짜별 대화량을 조회합니다."
    )
    public DashboardConversationFlowResponse getConversationFlow(
            @RequestParam Long roomId,
            @RequestParam(defaultValue = "DAY") DashboardPeriod period,
            @Parameter(description = "ALL 조회에서는 생략할 수 있습니다.")
            @RequestParam(required = false)
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
