package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardConversationFlowResponse;
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
class DashboardConversationServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Mock
    private DashboardSnapshotService dashboardSnapshotService;

    private DashboardConversationService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-07-31T03:30:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        service = new DashboardConversationService(
                chatMessageRepository,
                coupleMemberRepository,
                dashboardSnapshotService,
                new ConversationFlowCalculator(),
                clock
        );
    }

    // 일 단위 조회도 원본 메시지를 현재 시점까지 직접 집계합니다.
    @Test
    void returnsDailySnapshot() {
        LocalDate date = LocalDate.of(2026, 7, 31);
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatMessageRepository.findConversationMessages(
                1L,
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay()
        )).thenReturn(List.of());

        DashboardConversationFlowResponse response =
                service.getConversationFlow(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date
                );

        assertThat(response.totalMessageCount()).isZero();
        assertThat(response.busiestHour()).isNull();
        assertThat(response.averageResponseSeconds()).isNull();
        assertThat(response.dailyFrequency()).hasSize(1);
    }
}
