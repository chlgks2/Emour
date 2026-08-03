package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

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

    // 일 단위 조회도 완료된 원본 분석에서 가장 많이 나타난 감정을 찾습니다.
    @Test
    void returnsMainEmotion() {
        LocalDate date = LocalDate.of(2026, 7, 31);
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatAnalysisRepository.findCompletedEmotionTypes(
                1L,
                10L,
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay()
        )).thenReturn(List.of("JOY", "JOY", "SADNESS", "NEUTRAL"));

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
