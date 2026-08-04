package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.CoupleDashboardRepository;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** 기간에 포함된 일간 스냅샷을 준비하고 오늘 데이터만 즉시 최신화합니다. */
@Service
@RequiredArgsConstructor
public class DashboardSnapshotRangeService {

    private final CoupleDashboardRepository coupleDashboardRepository;
    private final DashboardRepository dashboardRepository;
    private final CoupleDashboardSnapshotService coupleSnapshotService;
    private final DashboardSnapshotService memberSnapshotService;
    private final DashboardSnapshotLockService snapshotLockService;
    private final Clock dashboardClock;

    @Transactional
    public List<CoupleDashboard> getCoupleSnapshots(
            Long roomId,
            Long userId,
            LocalDate startDate,
            LocalDate endExclusive
    ) {
        snapshotLockService.lockRoom(roomId);
        LocalDate effectiveEnd = effectiveEnd(endExclusive);
        Map<LocalDate, CoupleDashboard> saved = coupleDashboardRepository
                .findAllByRoomIdAndSummaryDateGreaterThanEqualAndSummaryDateLessThanOrderBySummaryDateAsc(
                        roomId,
                        startDate,
                        effectiveEnd
                ).stream()
                .collect(Collectors.toMap(
                        CoupleDashboard::getSummaryDate,
                        Function.identity()
                ));

        List<CoupleDashboard> snapshots = new ArrayList<>();
        for (LocalDate date = startDate;
             date.isBefore(effectiveEnd);
             date = date.plusDays(1)) {
            CoupleDashboard dashboard = saved.get(date);
            if (needsRefresh(dashboard, date)) {
                dashboard = coupleSnapshotService.ensureSnapshot(
                        roomId,
                        userId,
                        date
                );
            }
            snapshots.add(dashboard);
        }
        return snapshots;
    }

    @Transactional
    public List<Dashboard> getMemberSnapshots(
            Long roomId,
            Long userId,
            LocalDate startDate,
            LocalDate endExclusive
    ) {
        snapshotLockService.lockRoom(roomId);
        LocalDate effectiveEnd = effectiveEnd(endExclusive);
        Map<LocalDate, Dashboard> saved = dashboardRepository
                .findAllByRoomIdAndUserIdAndSummaryDateGreaterThanEqualAndSummaryDateLessThanOrderBySummaryDateAsc(
                        roomId,
                        userId,
                        startDate,
                        effectiveEnd
                ).stream()
                .collect(Collectors.toMap(
                        Dashboard::getSummaryDate,
                        Function.identity()
                ));

        List<Dashboard> snapshots = new ArrayList<>();
        for (LocalDate date = startDate;
             date.isBefore(effectiveEnd);
             date = date.plusDays(1)) {
            Dashboard dashboard = saved.get(date);
            if (needsRefresh(dashboard, date)) {
                dashboard = memberSnapshotService.ensureSnapshot(
                        roomId,
                        userId,
                        date
                );
            }
            snapshots.add(dashboard);
        }
        return snapshots;
    }

    private LocalDate effectiveEnd(LocalDate requestedEnd) {
        LocalDate tomorrow = LocalDate.now(dashboardClock).plusDays(1);
        return requestedEnd.isBefore(tomorrow) ? requestedEnd : tomorrow;
    }

    private boolean needsRefresh(
            CoupleDashboard dashboard,
            LocalDate date
    ) {
        return dashboard == null
                || date.equals(LocalDate.now(dashboardClock))
                || dashboard.getEmotionSummary() == null
                || dashboard.getEmotionSummary().isBlank()
                || dashboard.getFrequentWords() == null
                || dashboard.getFrequentWords().isBlank()
                || !coupleSnapshotService.isCurrentConversationSnapshot(
                        dashboard.getConversationFrequency()
                )
                || dashboard.getAggregatedUntil() == null
                || dashboard.getAggregatedUntil()
                .isBefore(date.plusDays(1).atStartOfDay());
    }

    private boolean needsRefresh(Dashboard dashboard, LocalDate date) {
        return dashboard == null
                || date.equals(LocalDate.now(dashboardClock))
                || dashboard.getEmotionFlow() == null
                || dashboard.getEmotionFlow().isBlank()
                || dashboard.getAggregatedUntil() == null
                || dashboard.getAggregatedUntil()
                .isBefore(date.plusDays(1).atStartOfDay());
    }
}
