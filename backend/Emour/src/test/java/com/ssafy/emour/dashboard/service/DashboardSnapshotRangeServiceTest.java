package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.CoupleDashboardRepository;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardSnapshotRangeServiceTest {

    @Mock
    private CoupleDashboardRepository coupleDashboardRepository;
    @Mock
    private DashboardRepository dashboardRepository;
    @Mock
    private CoupleDashboardSnapshotService coupleSnapshotService;
    @Mock
    private DashboardSnapshotService memberSnapshotService;
    @Mock
    private DashboardSnapshotLockService snapshotLockService;

    @Test
    void refreshesOnlyTodayWhenPastSnapshotIsComplete() {
        LocalDate yesterday = LocalDate.of(2026, 8, 3);
        LocalDate today = LocalDate.of(2026, 8, 4);
        CoupleDashboard past = completeSnapshot(yesterday);
        CoupleDashboard savedToday = CoupleDashboard.create(1L, today);
        CoupleDashboard refreshedToday = CoupleDashboard.create(1L, today);
        DashboardSnapshotRangeService service = new DashboardSnapshotRangeService(
                coupleDashboardRepository,
                dashboardRepository,
                coupleSnapshotService,
                memberSnapshotService,
                snapshotLockService,
                Clock.fixed(
                        Instant.parse("2026-08-04T03:00:00Z"),
                        ZoneId.of("Asia/Seoul")
                )
        );

        when(coupleDashboardRepository
                .findAllByRoomIdAndSummaryDateGreaterThanEqualAndSummaryDateLessThanOrderBySummaryDateAsc(
                        1L,
                        yesterday,
                        today.plusDays(1)
                )).thenReturn(List.of(past, savedToday));
        when(coupleSnapshotService.isCurrentConversationSnapshot(
                past.getConversationFrequency()
        )).thenReturn(true);
        when(coupleSnapshotService.ensureSnapshot(1L, 10L, today))
                .thenReturn(refreshedToday);

        List<CoupleDashboard> result = service.getCoupleSnapshots(
                1L,
                10L,
                yesterday,
                today.plusDays(1)
        );

        assertThat(result).containsExactly(past, refreshedToday);
        verify(coupleSnapshotService, never())
                .ensureSnapshot(1L, 10L, yesterday);
        verify(coupleSnapshotService).ensureSnapshot(1L, 10L, today);
    }

    @Test
    void refreshesPastCoupleSnapshotWhenRequiredJsonIsNull() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        CoupleDashboard incomplete = CoupleDashboard.create(1L, date);
        incomplete.applyHourlySnapshot(
                1,
                0,
                0,
                null,
                "[]",
                null,
                null,
                "{\"version\":2}",
                date.plusDays(1).atStartOfDay(),
                true,
                date.plusDays(1).atStartOfDay()
        );
        CoupleDashboard repaired = completeSnapshot(date);
        DashboardSnapshotRangeService service = serviceAtNoon();

        when(coupleDashboardRepository
                .findAllByRoomIdAndSummaryDateGreaterThanEqualAndSummaryDateLessThanOrderBySummaryDateAsc(
                        1L,
                        date,
                        date.plusDays(1)
                )).thenReturn(List.of(incomplete));
        when(coupleSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(repaired);

        assertThat(service.getCoupleSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).containsExactly(repaired);
    }

    @Test
    void refreshesPastMemberSnapshotWhenEmotionFlowIsNull() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        Dashboard incomplete = Dashboard.create(1L, 10L, date);
        incomplete.applyHourlySnapshot(
                0,
                null,
                date.plusDays(1).atStartOfDay(),
                true,
                date.plusDays(1).atStartOfDay()
        );
        Dashboard repaired = Dashboard.create(1L, 10L, date);
        repaired.applyHourlySnapshot(
                0,
                "[]",
                date.plusDays(1).atStartOfDay(),
                true,
                date.plusDays(1).atStartOfDay()
        );
        DashboardSnapshotRangeService service = serviceAtNoon();

        when(dashboardRepository
                .findAllByRoomIdAndUserIdAndSummaryDateGreaterThanEqualAndSummaryDateLessThanOrderBySummaryDateAsc(
                        1L,
                        10L,
                        date,
                        date.plusDays(1)
                )).thenReturn(List.of(incomplete));
        when(memberSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(repaired);

        assertThat(service.getMemberSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).containsExactly(repaired);
    }

    private DashboardSnapshotRangeService serviceAtNoon() {
        return new DashboardSnapshotRangeService(
                coupleDashboardRepository,
                dashboardRepository,
                coupleSnapshotService,
                memberSnapshotService,
                snapshotLockService,
                Clock.fixed(
                        Instant.parse("2026-08-04T03:00:00Z"),
                        ZoneId.of("Asia/Seoul")
                )
        );
    }

    private CoupleDashboard completeSnapshot(LocalDate date) {
        CoupleDashboard dashboard = CoupleDashboard.create(1L, date);
        dashboard.applyHourlySnapshot(
                0,
                0,
                0,
                "{}",
                "[]",
                null,
                null,
                "{\"version\":2}",
                date.plusDays(1).atStartOfDay(),
                true,
                date.plusDays(1).atStartOfDay()
        );
        return dashboard;
    }
}
