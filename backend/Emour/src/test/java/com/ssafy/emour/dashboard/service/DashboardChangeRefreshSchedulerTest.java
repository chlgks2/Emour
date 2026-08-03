package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.dashboard.event.DashboardChangedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

@ExtendWith(MockitoExtension.class)
class DashboardChangeRefreshSchedulerTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final LocalDateTime NOW = LocalDateTime.of(
            2026,
            8,
            3,
            12,
            34,
            56
    );

    @Mock
    private CoupleDashboardSnapshotService coupleSnapshotService;

    @Mock
    private DashboardSnapshotService memberSnapshotService;

    private DashboardChangeRefreshScheduler scheduler;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                NOW.atZone(SEOUL).toInstant(),
                SEOUL
        );
        scheduler = new DashboardChangeRefreshScheduler(
                coupleSnapshotService,
                memberSnapshotService,
                clock
        );
    }

    // 같은 방에서 연속으로 발생한 변경은 한 번의 집계로 합칩니다.
    @Test
    void mergesChangesForSameRoomAndDate() {
        LocalDate today = NOW.toLocalDate();
        scheduler.collect(new DashboardChangedEvent(
                1L,
                10L,
                today,
                true,
                false
        ));
        scheduler.collect(new DashboardChangedEvent(
                1L,
                10L,
                today,
                true,
                true
        ));

        scheduler.refreshChangedDashboards();

        verify(coupleSnapshotService).refreshSnapshot(
                1L,
                today,
                NOW,
                false
        );
        verify(memberSnapshotService).refreshSnapshot(
                1L,
                10L,
                today,
                NOW,
                false
        );
        verifyNoMoreInteractions(
                coupleSnapshotService,
                memberSnapshotService
        );
    }

    // 과거 날짜에 늦게 반영된 감정 결과는 하루 전체를 다시 확정합니다.
    @Test
    void finalizesPastDateChange() {
        LocalDate pastDate = NOW.toLocalDate().minusDays(1);
        scheduler.collect(new DashboardChangedEvent(
                2L,
                20L,
                pastDate,
                true,
                true
        ));

        scheduler.refreshChangedDashboards();

        LocalDateTime endOfDate = pastDate.plusDays(1).atStartOfDay();
        verify(coupleSnapshotService).refreshSnapshot(
                2L,
                pastDate,
                endOfDate,
                true
        );
        verify(memberSnapshotService).refreshSnapshot(
                2L,
                20L,
                pastDate,
                endOfDate,
                true
        );
    }

    @Test
    void ignoresFutureDateChange() {
        scheduler.collect(new DashboardChangedEvent(
                1L,
                10L,
                NOW.toLocalDate().plusDays(1),
                true,
                true
        ));

        scheduler.refreshChangedDashboards();

        verify(coupleSnapshotService, never()).refreshSnapshot(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyBoolean()
        );
        verify(memberSnapshotService, never()).refreshSnapshot(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyBoolean()
        );
    }
}
