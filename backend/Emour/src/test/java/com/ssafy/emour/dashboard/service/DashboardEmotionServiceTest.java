package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
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
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardEmotionServiceTest {

    @Mock
    private DashboardSnapshotRangeService snapshotRangeService;
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
    void returnsDailyEmotionFlow() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        Dashboard dashboard = snapshot(
                10L,
                date,
                flowJson(1, 1, 1)
        );
        when(snapshotRangeService.getMemberSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).thenReturn(List.of(dashboard));

        DashboardEmotionFlowResponse response =
                dashboardEmotionService.getEmotionFlow(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date
                );

        assertThat(response.analyzedMessageCount()).isEqualTo(3);
        assertThat(response.flow()).hasSize(12);
        assertThat(response.flow().get(0).positiveCount()).isEqualTo(1);
    }

    @Test
    void mergesMonthlyDailyFlows() {
        LocalDate start = LocalDate.of(2026, 7, 1);
        Dashboard first = snapshot(10L, start, flowJson(1, 2, 0));
        Dashboard second = snapshot(
                10L,
                start.plusDays(1),
                flowJson(3, 0, 1)
        );
        when(snapshotRangeService.getMemberSnapshots(
                1L,
                10L,
                start,
                LocalDate.of(2026, 8, 1)
        )).thenReturn(List.of(first, second));

        DashboardEmotionFlowResponse response =
                dashboardEmotionService.getEmotionFlow(
                        1L,
                        10L,
                        DashboardPeriod.MONTH,
                        LocalDate.of(2026, 7, 15)
                );

        assertThat(response.flow().get(0).positiveCount()).isEqualTo(4);
        assertThat(response.flow().get(0).negativeCount()).isEqualTo(2);
        assertThat(response.flow().get(0).neutralCount()).isEqualTo(1);
    }

    @Test
    void returnsMyAndPartnerFlows() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        when(coupleMemberRepository.findAllByIdRoomId(1L))
                .thenReturn(List.of(
                        CoupleMember.active(10L, 1L),
                        CoupleMember.active(20L, 1L)
                ));
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(20L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(snapshotRangeService.getMemberSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).thenReturn(List.of(snapshot(10L, date, flowJson(2, 0, 0))));
        when(snapshotRangeService.getMemberSnapshots(
                1L,
                20L,
                date,
                date.plusDays(1)
        )).thenReturn(List.of(snapshot(20L, date, flowJson(0, 1, 0))));

        DashboardCoupleEmotionFlowResponse response =
                dashboardEmotionService.getCoupleEmotionFlow(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date
                );

        assertThat(response.me().analyzedMessageCount()).isEqualTo(2);
        assertThat(response.partner().analyzedMessageCount()).isEqualTo(1);
    }

    private Dashboard snapshot(Long userId, LocalDate date, String flow) {
        Dashboard dashboard = Dashboard.create(1L, userId, date);
        dashboard.updateEmotionFlow(flow);
        return dashboard;
    }

    private String flowJson(int positive, int negative, int neutral) {
        StringBuilder json = new StringBuilder("[");
        for (int index = 0; index < 12; index++) {
            if (index > 0) {
                json.append(',');
            }
            int startHour = index * 2;
            json.append("{\"startHour\":").append(startHour)
                    .append(",\"endHour\":").append(startHour + 2)
                    .append(",\"positiveCount\":")
                    .append(index == 0 ? positive : 0)
                    .append(",\"negativeCount\":")
                    .append(index == 0 ? negative : 0)
                    .append(",\"neutralCount\":")
                    .append(index == 0 ? neutral : 0)
                    .append('}');
        }
        return json.append(']').toString();
    }
}
