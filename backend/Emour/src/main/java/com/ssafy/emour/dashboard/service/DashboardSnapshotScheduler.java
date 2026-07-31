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
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DashboardSnapshotScheduler {

    private final CoupleMemberRepository coupleMemberRepository;
    private final DashboardSnapshotService dashboardSnapshotService;
    private final Clock dashboardClock;

    // 매 정각 이전 한 시간까지 1차 집계합니다.
    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Seoul")
    public void aggregatePreviousHour() {
        refreshActiveMembers(false);
    }

    // 매시간 5분에 같은 범위를 다시 계산해 늦게 저장된 데이터를 최종 반영합니다.
    @Scheduled(cron = "0 5 * * * *", zone = "Asia/Seoul")
    public void finalizePreviousHour() {
        refreshActiveMembers(true);
    }

    private void refreshActiveMembers(boolean finalized) {
        LocalDateTime snapshotUntil = LocalDateTime
                .now(dashboardClock)
                .truncatedTo(ChronoUnit.HOURS);
        LocalDate summaryDate = snapshotUntil
                .minusNanos(1)
                .toLocalDate();
        List<CoupleMember> members = coupleMemberRepository
                .findAllByStatus(CoupleMemberStatus.ACTIVE);

        for (CoupleMember member : members) {
            try {
                dashboardSnapshotService.refreshSnapshot(
                        member.getId().getRoomId(),
                        member.getId().getUserId(),
                        summaryDate,
                        snapshotUntil,
                        finalized
                );
            } catch (RuntimeException exception) {
                // 한 사용자의 실패 때문에 다른 커플의 집계까지 멈추지 않게 합니다.
                log.error(
                        "대시보드 시간별 집계 실패: roomId={}, userId={}",
                        member.getId().getRoomId(),
                        member.getId().getUserId(),
                        exception
                );
            }
        }
    }
}
