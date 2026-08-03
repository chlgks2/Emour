package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.couple.entity.CoupleMember;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DashboardSnapshotScheduler {

    private final CoupleMemberRepository coupleMemberRepository;
    private final DashboardSnapshotService memberDashboardSnapshotService;
    private final CoupleDashboardSnapshotService coupleDashboardSnapshotService;
    private final Clock dashboardClock;

    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Seoul")
    public void aggregatePreviousHour() {
        refreshActiveDashboards(false);
    }

    @Scheduled(cron = "0 5 * * * *", zone = "Asia/Seoul")
    public void finalizePreviousHour() {
        refreshActiveDashboards(true);
    }

    private void refreshActiveDashboards(boolean finalized) {
        LocalDateTime snapshotUntil = LocalDateTime
                .now(dashboardClock)
                .truncatedTo(ChronoUnit.HOURS);
        LocalDate summaryDate = snapshotUntil
                .minusNanos(1)
                .toLocalDate();
        List<CoupleMember> members = coupleMemberRepository
                .findAllByStatus(CoupleMemberStatus.ACTIVE);
        Set<Long> refreshedRooms = new HashSet<>();

        for (CoupleMember member : members) {
            Long roomId = member.getId().getRoomId();
            Long userId = member.getId().getUserId();
            refreshMember(
                    roomId,
                    userId,
                    summaryDate,
                    snapshotUntil,
                    finalized
            );
            if (refreshedRooms.add(roomId)) {
                refreshCouple(
                        roomId,
                        summaryDate,
                        snapshotUntil,
                        finalized
                );
            }
        }
    }

    private void refreshMember(
            Long roomId,
            Long userId,
            LocalDate summaryDate,
            LocalDateTime snapshotUntil,
            boolean finalized
    ) {
        try {
            memberDashboardSnapshotService.refreshSnapshot(
                    roomId,
                    userId,
                    summaryDate,
                    snapshotUntil,
                    finalized
            );
        } catch (RuntimeException exception) {
            log.error(
                    "회원 대시보드 집계 실패: roomId={}, userId={}",
                    roomId,
                    userId,
                    exception
            );
        }
    }

    private void refreshCouple(
            Long roomId,
            LocalDate summaryDate,
            LocalDateTime snapshotUntil,
            boolean finalized
    ) {
        try {
            coupleDashboardSnapshotService.refreshSnapshot(
                    roomId,
                    summaryDate,
                    snapshotUntil,
                    finalized
            );
        } catch (RuntimeException exception) {
            log.error(
                    "커플 대시보드 집계 실패: roomId={}",
                    roomId,
                    exception
            );
        }
    }
}
