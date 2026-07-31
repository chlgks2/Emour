package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardConversationFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.entity.Dashboard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

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

    // 일 단위 조회는 같은 시간 구간에 저장된 커플 대화 흐름을 재사용합니다.
    @Test
    void returnsDailySnapshot() {
        LocalDate date = LocalDate.of(2026, 7, 31);
        Dashboard dashboard = Dashboard.create(1L, 10L, date);
        dashboard.applyHourlySnapshot(
                2,
                0,
                0,
                0,
                "{}",
                "[]",
                "[]",
                new BigDecimal("75.50"),
                21,
                """
                        [{"date":"2026-07-31","messageCount":7}]
                        """,
                date.atTime(12, 0),
                false,
                date.atTime(12, 0)
        );

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(dashboardSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(dashboard);

        DashboardConversationFlowResponse response =
                service.getConversationFlow(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date
                );

        assertThat(response.totalMessageCount()).isEqualTo(7);
        assertThat(response.busiestHour()).isEqualTo(21);
        assertThat(response.averageResponseSeconds())
                .isEqualByComparingTo("75.50");
        assertThat(response.dailyFrequency()).hasSize(1);
    }
}
