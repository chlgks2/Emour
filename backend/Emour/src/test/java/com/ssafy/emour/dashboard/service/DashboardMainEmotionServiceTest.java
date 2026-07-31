package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardMainEmotionResponse;
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
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardMainEmotionServiceTest {

    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Mock
    private DashboardSnapshotService dashboardSnapshotService;

    private DashboardMainEmotionService dashboardMainEmotionService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-07-31T03:30:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        dashboardMainEmotionService = new DashboardMainEmotionService(
                chatAnalysisRepository,
                coupleMemberRepository,
                dashboardSnapshotService,
                clock
        );
    }

    // 저장된 감정별 개수에서 가장 많이 나타난 감정을 찾습니다.
    @Test
    void returnsMainEmotion() {
        LocalDate date = LocalDate.of(2026, 7, 31);
        Dashboard dashboard = Dashboard.create(1L, 10L, date);
        dashboard.updateEmotionSummary("""
                {
                  "JOY": 2,
                  "SADNESS": 1,
                  "NEUTRAL": 1
                }
                """);

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(dashboardSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(dashboard);

        DashboardMainEmotionResponse response =
                dashboardMainEmotionService.getMainEmotions(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date
                );

        assertThat(response.analyzedMessageCount()).isEqualTo(4);
        assertThat(response.emotions()).hasSize(15);
        assertThat(response.dominantEmotion().emotionType())
                .isEqualTo("JOY");
        assertThat(response.dominantEmotion().count()).isEqualTo(2);
    }
}
