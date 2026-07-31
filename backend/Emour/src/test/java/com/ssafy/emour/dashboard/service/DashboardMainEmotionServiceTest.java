package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardMainEmotionServiceTest {

    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;

    @Mock
    private DashboardRepository dashboardRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardMainEmotionService dashboardMainEmotionService;

    @BeforeEach
    void setUp() {
        dashboardMainEmotionService = new DashboardMainEmotionService(
                chatAnalysisRepository,
                dashboardRepository,
                coupleMemberRepository
        );
    }

    // 감정별 개수를 계산하고 가장 많이 나타난 감정을 찾습니다.
    @Test
    void calculatesMainEmotion() {
        LocalDate date = LocalDate.now();

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatAnalysisRepository.findCompletedEmotionTypes(
                1L,
                10L,
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay()
        )).thenReturn(List.of(
                "JOY",
                "기쁨",
                "SADNESS",
                "NEUTRAL"
        ));
        when(dashboardRepository.findByRoomIdAndUserIdAndSummaryDate(
                1L,
                10L,
                date
        )).thenReturn(Optional.empty());
        when(dashboardRepository.save(any(Dashboard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

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
