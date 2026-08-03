package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCoupleEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.entity.Dashboard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardEmotionServiceTest {

    @Mock
    private DashboardSnapshotService dashboardSnapshotService;
    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardEmotionService dashboardEmotionService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-08-03T03:00:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        dashboardEmotionService = new DashboardEmotionService(
                dashboardSnapshotService,
                chatAnalysisRepository,
                coupleMemberRepository,
                clock
        );
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }

    // 일 조회는 저장된 2시간 단위 감정 흐름을 반환합니다.
    @Test
    void returnsDailyEmotionFlow() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        Dashboard dashboard = Dashboard.create(1L, 10L, date);
        dashboard.updateEmotionFlow("""
                [
                  {
                    "startHour": 0,
                    "endHour": 2,
                    "positiveCount": 1,
                    "negativeCount": 1,
                    "neutralCount": 1
                  }
                ]
                """);
        when(dashboardSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(dashboard);

        DashboardEmotionFlowResponse response =
                dashboardEmotionService.getEmotionFlow(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date
                );

        assertThat(response.analyzedMessageCount()).isEqualTo(3);
        assertThat(response.flow()).hasSize(1);
        assertThat(response.flow().get(0).positiveCount()).isEqualTo(1);
        assertThat(response.flow().get(0).negativeCount()).isEqualTo(1);
        assertThat(response.flow().get(0).neutralCount()).isEqualTo(1);
    }

    // 월 조회는 월 전체 감정을 같은 2시간대에 합산합니다.
    @Test
    void returnsMonthlyEmotionFlow() {
        ChatAnalysis analysis = org.mockito.Mockito.mock(ChatAnalysis.class);
        ChatMessage message = org.mockito.Mockito.mock(ChatMessage.class);
        when(analysis.getMessage()).thenReturn(message);
        when(analysis.getEmotionType()).thenReturn("JOY");
        when(message.getSentAt())
                .thenReturn(LocalDateTime.of(2026, 7, 15, 13, 30));
        when(chatAnalysisRepository.findCompletedDailyAnalyses(
                1L,
                10L,
                LocalDate.of(2026, 7, 1).atStartOfDay(),
                LocalDate.of(2026, 8, 1).atStartOfDay()
        )).thenReturn(List.of(analysis));

        DashboardEmotionFlowResponse response =
                dashboardEmotionService.getEmotionFlow(
                        1L,
                        10L,
                        DashboardPeriod.MONTH,
                        LocalDate.of(2026, 7, 15)
                );

        assertThat(response.flow()).hasSize(12);
        assertThat(response.flow().get(6).positiveCount()).isEqualTo(1);
        assertThat(response.analyzedMessageCount()).isEqualTo(1);
    }

    @Test
    void returnsMyAndPartnerEmotionFlowsTogether() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        Dashboard myDashboard = Dashboard.create(1L, 10L, date);
        myDashboard.updateEmotionFlow("""
                [{
                  "startHour":0,"endHour":2,
                  "positiveCount":2,"negativeCount":0,"neutralCount":0
                }]
                """);
        Dashboard partnerDashboard = Dashboard.create(1L, 20L, date);
        partnerDashboard.updateEmotionFlow("""
                [{
                  "startHour":0,"endHour":2,
                  "positiveCount":0,"negativeCount":1,"neutralCount":0
                }]
                """);
        when(coupleMemberRepository.findAllByIdRoomId(1L))
                .thenReturn(List.of(
                        CoupleMember.active(10L, 1L),
                        CoupleMember.active(20L, 1L)
                ));
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(20L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(dashboardSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(myDashboard);
        when(dashboardSnapshotService.ensureSnapshot(1L, 20L, date))
                .thenReturn(partnerDashboard);

        DashboardCoupleEmotionFlowResponse response =
                dashboardEmotionService.getCoupleEmotionFlow(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date
                );

        assertThat(response.me().userId()).isEqualTo(10L);
        assertThat(response.me().analyzedMessageCount()).isEqualTo(2);
        assertThat(response.partner().userId()).isEqualTo(20L);
        assertThat(response.partner().analyzedMessageCount()).isEqualTo(1);
    }
}
