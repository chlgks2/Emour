package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.dashboard.event.DashboardChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 원본 데이터가 바뀐 방만 짧은 주기로 다시 집계합니다.
 * 같은 방에서 여러 메시지가 연속으로 와도 한 번으로 합쳐 계산합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DashboardChangeRefreshScheduler {

    private final CoupleDashboardSnapshotService coupleSnapshotService;
    private final DashboardSnapshotService memberSnapshotService;
    private final Clock dashboardClock;

    private final Map<RefreshKey, PendingRefresh> pendingRefreshes =
            new ConcurrentHashMap<>();

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void collect(DashboardChangedEvent event) {
        if (event == null || event.roomId() == null
                || event.summaryDate() == null) {
            return;
        }

        RefreshKey key = new RefreshKey(
                event.roomId(),
                event.summaryDate()
        );
        pendingRefreshes.compute(key, (ignored, pending) -> {
            PendingRefresh refresh = pending == null
                    ? new PendingRefresh()
                    : pending;
            refresh.merge(event);
            return refresh;
        });
    }

    @Scheduled(
            fixedDelayString = "${dashboard.change-refresh-delay-ms:1000}"
    )
    public void refreshChangedDashboards() {
        List<Map.Entry<RefreshKey, PendingRefresh>> batch =
                drainPendingRefreshes();
        for (Map.Entry<RefreshKey, PendingRefresh> entry : batch) {
            refresh(entry.getKey(), entry.getValue());
        }
    }

    private List<Map.Entry<RefreshKey, PendingRefresh>>
    drainPendingRefreshes() {
        List<Map.Entry<RefreshKey, PendingRefresh>> batch =
                new ArrayList<>();
        pendingRefreshes.forEach((key, pending) -> {
            if (pendingRefreshes.remove(key, pending)) {
                batch.add(Map.entry(key, pending));
            }
        });
        return batch;
    }

    private void refresh(RefreshKey key, PendingRefresh pending) {
        LocalDate today = LocalDate.now(dashboardClock);
        if (key.summaryDate().isAfter(today)) {
            return;
        }

        boolean pastDate = key.summaryDate().isBefore(today);
        LocalDateTime snapshotUntil = pastDate
                ? key.summaryDate().plusDays(1).atStartOfDay()
                : LocalDateTime.now(dashboardClock);

        if (pending.refreshCouple()) {
            refreshCouple(key, snapshotUntil, pastDate);
        }
        for (Long userId : pending.memberUserIds()) {
            refreshMember(key, userId, snapshotUntil, pastDate);
        }
    }

    private void refreshCouple(
            RefreshKey key,
            LocalDateTime snapshotUntil,
            boolean finalized
    ) {
        try {
            coupleSnapshotService.refreshSnapshot(
                    key.roomId(),
                    key.summaryDate(),
                    snapshotUntil,
                    finalized
            );
        } catch (RuntimeException exception) {
            log.error(
                    "변경된 커플 대시보드 갱신 실패: roomId={}, date={}",
                    key.roomId(),
                    key.summaryDate(),
                    exception
            );
        }
    }

    private void refreshMember(
            RefreshKey key,
            Long userId,
            LocalDateTime snapshotUntil,
            boolean finalized
    ) {
        try {
            memberSnapshotService.refreshSnapshot(
                    key.roomId(),
                    userId,
                    key.summaryDate(),
                    snapshotUntil,
                    finalized
            );
        } catch (RuntimeException exception) {
            log.error(
                    "변경된 회원 대시보드 갱신 실패: roomId={}, userId={}, date={}",
                    key.roomId(),
                    userId,
                    key.summaryDate(),
                    exception
            );
        }
    }

    private record RefreshKey(Long roomId, LocalDate summaryDate) {
    }

    private static final class PendingRefresh {

        private final Set<Long> memberUserIds =
                ConcurrentHashMap.newKeySet();
        private volatile boolean refreshCouple;

        private void merge(DashboardChangedEvent event) {
            if (event.refreshCouple()) {
                refreshCouple = true;
            }
            if (event.refreshMember() && event.userId() != null) {
                memberUserIds.add(event.userId());
            }
        }

        private boolean refreshCouple() {
            return refreshCouple;
        }

        private Set<Long> memberUserIds() {
            return Set.copyOf(memberUserIds);
        }
    }
}
