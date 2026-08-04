package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.ConversationSnapshotData;
import com.ssafy.emour.dashboard.dto.DashboardConversationFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardConversationServiceTest {

    @Mock
    private DashboardSnapshotRangeService snapshotRangeService;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardConversationService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-07-31T03:30:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        service = new DashboardConversationService(
                snapshotRangeService,
                coupleMemberRepository,
                clock
        );
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }

    @Test
    void returnsDailySnapshot() throws Exception {
        LocalDate date = LocalDate.of(2026, 7, 31);
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).thenReturn(List.of(snapshot(date, 0, 0, 0, 0)));

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

    @Test
    void mergesMonthlyConversationMetrics() throws Exception {
        LocalDate start = LocalDate.of(2026, 7, 1);
        CoupleDashboard first = snapshot(start, 4, 9, 120_000, 2);
        CoupleDashboard second = snapshot(
                start.plusDays(1),
                6,
                10,
                60_000,
                1
        );
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                start,
                LocalDate.of(2026, 8, 1)
        )).thenReturn(List.of(first, second));

        DashboardConversationFlowResponse response =
                service.getConversationFlow(
                        1L,
                        10L,
                        DashboardPeriod.MONTH,
                        LocalDate.of(2026, 7, 15)
                );

        assertThat(response.totalMessageCount()).isEqualTo(10);
        assertThat(response.busiestHour()).isEqualTo(10);
        assertThat(response.averageResponseSeconds())
                .isEqualByComparingTo(new BigDecimal("60.00"));
        assertThat(response.dailyFrequency()).hasSize(31);
        assertThat(response.dailyFrequency().get(0).messageCount())
                .isEqualTo(4);
        assertThat(response.dailyFrequency().get(1).messageCount())
                .isEqualTo(6);
    }

    @Test
    void includesResponseAcrossDateBoundary() throws Exception {
        LocalDate start = LocalDate.of(2026, 7, 1);
        CoupleDashboard first = snapshotWithBoundary(
                start,
                1,
                23,
                0,
                0,
                10L,
                start.atTime(23, 59),
                10L,
                start.atTime(23, 59)
        );
        CoupleDashboard second = snapshotWithBoundary(
                start.plusDays(1),
                1,
                0,
                0,
                0,
                20L,
                start.plusDays(1).atTime(0, 1),
                20L,
                start.plusDays(1).atTime(0, 1)
        );
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                start,
                LocalDate.of(2026, 8, 1)
        )).thenReturn(List.of(first, second));

        DashboardConversationFlowResponse response =
                service.getConversationFlow(
                        1L,
                        10L,
                        DashboardPeriod.MONTH,
                        start
                );

        assertThat(response.averageResponseSeconds())
                .isEqualByComparingTo(new BigDecimal("120.00"));
    }

    private CoupleDashboard snapshot(
            LocalDate date,
            int messageCount,
            int busiestHour,
            long responseMillis,
            int responseCount
    ) throws JsonProcessingException {
        return snapshotWithBoundary(
                date,
                messageCount,
                busiestHour,
                responseMillis,
                responseCount,
                null,
                null,
                null,
                null
        );
    }

    private CoupleDashboard snapshotWithBoundary(
            LocalDate date,
            int messageCount,
            int busiestHour,
            long responseMillis,
            int responseCount,
            Long firstSenderId,
            java.time.LocalDateTime firstSentAt,
            Long lastSenderId,
            java.time.LocalDateTime lastSentAt
    ) throws JsonProcessingException {
        List<Integer> hourlyCounts = new ArrayList<>(
                java.util.Collections.nCopies(24, 0)
        );
        if (messageCount > 0) {
            hourlyCounts.set(busiestHour, messageCount);
        }
        String conversationJson = new ObjectMapper()
                .findAndRegisterModules()
                .writeValueAsString(
                        new ConversationSnapshotData(
                                ConversationSnapshotData.CURRENT_VERSION,
                                hourlyCounts,
                                responseMillis,
                                responseCount,
                                List.of(),
                                firstSenderId,
                                firstSentAt,
                                lastSenderId,
                                lastSentAt
                        )
                );
        CoupleDashboard dashboard = CoupleDashboard.create(1L, date);
        dashboard.applyHourlySnapshot(
                messageCount,
                0,
                0,
                "{}",
                "[]",
                null,
                messageCount == 0 ? null : busiestHour,
                conversationJson,
                date.plusDays(1).atStartOfDay(),
                true,
                date.plusDays(1).atStartOfDay()
        );
        return dashboard;
    }
}
