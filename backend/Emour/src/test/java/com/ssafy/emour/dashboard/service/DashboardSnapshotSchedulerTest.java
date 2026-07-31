package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardSnapshotSchedulerTest {

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @Mock
    private DashboardSnapshotService dashboardSnapshotService;

    // 13시 5분에는 13시 직전까지의 데이터를 최종 확정합니다.
    @Test
    void finalizesPreviousHour() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-07-31T04:05:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        DashboardSnapshotScheduler scheduler =
                new DashboardSnapshotScheduler(
                        coupleMemberRepository,
                        dashboardSnapshotService,
                        clock
                );
        when(coupleMemberRepository.findAllByStatus(
                CoupleMemberStatus.ACTIVE
        )).thenReturn(List.of(CoupleMember.active(10L, 1L)));

        scheduler.finalizePreviousHour();

        verify(dashboardSnapshotService).refreshSnapshot(
                1L,
                10L,
                LocalDate.of(2026, 7, 31),
                LocalDateTime.of(2026, 7, 31, 13, 0),
                true
        );
    }
}
