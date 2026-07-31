package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardEmotionServiceTest {

    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;

    @Mock
    private DashboardRepository dashboardRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardEmotionService dashboardEmotionService;

    @BeforeEach
    void setUp() {
        dashboardEmotionService = new DashboardEmotionService(
                chatAnalysisRepository,
                dashboardRepository,
                coupleMemberRepository
        );
    }

    // 분석된 감정을 메시지 전송 시간에 따라 2시간 단위로 나눕니다.
    @Test
    void groupsEmotionFlow() {
        LocalDate date = LocalDate.now();
        ChatAnalysis joy = analysis("JOY", date, 1);
        ChatAnalysis sadness = analysis("SADNESS", date, 3);
        ChatAnalysis neutral = analysis("NEUTRAL", date, 3);

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatAnalysisRepository.findCompletedDailyAnalyses(
                1L,
                10L,
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay()
        )).thenReturn(List.of(joy, sadness, neutral));
        when(dashboardRepository.findByRoomIdAndUserIdAndSummaryDate(
                1L,
                10L,
                date
        )).thenReturn(Optional.empty());
        when(dashboardRepository.save(any(Dashboard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        DashboardEmotionFlowResponse response =
                dashboardEmotionService.getDailyEmotionFlow(
                        1L,
                        10L,
                        date
                );

        assertThat(response.analyzedMessageCount()).isEqualTo(3);
        assertThat(response.flow()).hasSize(12);
        assertThat(response.flow().get(0).positiveCount()).isEqualTo(1);
        assertThat(response.flow().get(1).negativeCount()).isEqualTo(1);
        assertThat(response.flow().get(1).neutralCount()).isEqualTo(1);
    }

    private ChatAnalysis analysis(
            String emotionType,
            LocalDate date,
            int hour
    ) {
        ChatMessage message = mock(ChatMessage.class);
        when(message.getSentAt()).thenReturn(
                date.atTime(hour, 30)
        );

        ChatAnalysis analysis = mock(ChatAnalysis.class);
        when(analysis.getMessage()).thenReturn(message);
        when(analysis.getEmotionType()).thenReturn(emotionType);
        return analysis;
    }
}
