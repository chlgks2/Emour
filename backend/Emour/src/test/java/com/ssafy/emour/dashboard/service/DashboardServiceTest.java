package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.MemberDashboardCountResponse;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
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
class DashboardServiceTest {

    @Mock
    private DashboardSnapshotRangeService snapshotRangeService;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-08-03T03:00:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        dashboardService = new DashboardService(
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
    void returnsDailyCountsFromSnapshot() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        CoupleDashboard dashboard = CoupleDashboard.create(1L, date);
        dashboard.updateCounts(5, 3, 2);
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).thenReturn(List.of(dashboard));

        DashboardCountResponse response = dashboardService.getCounts(
                1L,
                10L,
                DashboardPeriod.DAY,
                date
        );

        assertThat(response.messageCount()).isEqualTo(5);
        assertThat(response.imageCount()).isEqualTo(3);
        assertThat(response.reactionCount()).isEqualTo(2);
    }

    @Test
    void sumsMonthlyDailySnapshots() {
        LocalDate date = LocalDate.of(2026, 7, 15);
        CoupleDashboard first = CoupleDashboard.create(
                1L,
                LocalDate.of(2026, 7, 1)
        );
        first.updateCounts(20, 3, 2);
        CoupleDashboard second = CoupleDashboard.create(
                1L,
                LocalDate.of(2026, 7, 2)
        );
        second.updateCounts(30, 5, 4);
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 8, 1)
        )).thenReturn(List.of(first, second));

        DashboardCountResponse response = dashboardService.getCounts(
                1L,
                10L,
                DashboardPeriod.MONTH,
                date
        );

        assertThat(response.messageCount()).isEqualTo(50);
        assertThat(response.imageCount()).isEqualTo(8);
        assertThat(response.reactionCount()).isEqualTo(6);
    }

    @Test
    void sumsWeeklySnapshotsFromSundayToSaturday() {
        LocalDate sunday = LocalDate.of(2026, 8, 2);
        CoupleDashboard sundaySnapshot = CoupleDashboard.create(
                1L,
                sunday
        );
        sundaySnapshot.updateCounts(3, 1, 2);
        CoupleDashboard mondaySnapshot = CoupleDashboard.create(
                1L,
                sunday.plusDays(1)
        );
        mondaySnapshot.updateCounts(4, 2, 1);
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                sunday,
                sunday.plusWeeks(1)
        )).thenReturn(List.of(sundaySnapshot, mondaySnapshot));

        DashboardCountResponse response = dashboardService.getCounts(
                1L,
                10L,
                DashboardPeriod.WEEK,
                LocalDate.of(2026, 8, 3)
        );

        assertThat(response.startDate()).isEqualTo(sunday);
        assertThat(response.endDate()).isEqualTo(sunday.plusDays(6));
        assertThat(response.messageCount()).isEqualTo(7);
        assertThat(response.imageCount()).isEqualTo(3);
        assertThat(response.reactionCount()).isEqualTo(3);
    }

    @Test
    void sumsAllSnapshotsWithoutSelectedDate() {
        LocalDate firstDate = LocalDate.of(2026, 7, 1);
        LocalDate today = LocalDate.of(2026, 8, 3);
        CoupleDashboard first = CoupleDashboard.create(1L, firstDate);
        first.updateCounts(20, 3, 2);
        CoupleDashboard latest = CoupleDashboard.create(1L, today);
        latest.updateCounts(30, 5, 4);
        when(snapshotRangeService.findAllStartDate(1L))
                .thenReturn(firstDate);
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                firstDate,
                today.plusDays(1)
        )).thenReturn(List.of(first, latest));

        DashboardCountResponse response = dashboardService.getCounts(
                1L,
                10L,
                DashboardPeriod.ALL,
                null
        );

        assertThat(response.period()).isEqualTo(DashboardPeriod.ALL);
        assertThat(response.startDate()).isEqualTo(firstDate);
        assertThat(response.endDate()).isEqualTo(today);
        assertThat(response.messageCount()).isEqualTo(50);
    }

    @Test
    void sumsMemberBookmarks() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        Dashboard dashboard = Dashboard.create(1L, 10L, date);
        dashboard.updateBookmarkCount(4);
        when(snapshotRangeService.getMemberSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).thenReturn(List.of(dashboard));

        MemberDashboardCountResponse response =
                dashboardService.getMemberCounts(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date
                );

        assertThat(response.bookmarkCount()).isEqualTo(4);
    }
}
