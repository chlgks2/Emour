package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.MemberDashboardCountResponse;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DashboardSnapshotRangeService snapshotRangeService;
    private final CoupleMemberRepository coupleMemberRepository;
    private final Clock dashboardClock;

    @Transactional
    public DashboardCountResponse getCounts(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateRequest(roomId, userId, period, date);
        DateRange range = createRange(roomId, period, date);

        List<CoupleDashboard> snapshots = snapshotRangeService
                .getCoupleSnapshots(
                        roomId,
                        userId,
                        range.startDate(),
                        range.endExclusive()
                );
        LocalDateTime calculatedAt = latestCoupleCalculation(snapshots);
        return new DashboardCountResponse(
                period == DashboardPeriod.DAY
                        ? snapshots.get(0).getDashboardId()
                        : null,
                roomId,
                period,
                range.startDate(),
                range.endDate(),
                range.startDate(),
                snapshots.stream().mapToInt(CoupleDashboard::getMessageCount).sum(),
                snapshots.stream().mapToInt(CoupleDashboard::getImageCount).sum(),
                snapshots.stream().mapToInt(CoupleDashboard::getReactionCount).sum(),
                calculatedAt,
                calculatedAt
        );
    }

    @Transactional
    public MemberDashboardCountResponse getMemberCounts(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateRequest(roomId, userId, period, date);
        DateRange range = createRange(roomId, period, date);
        List<Dashboard> snapshots = snapshotRangeService.getMemberSnapshots(
                roomId,
                userId,
                range.startDate(),
                range.endExclusive()
        );
        return new MemberDashboardCountResponse(
                roomId,
                userId,
                period,
                range.startDate(),
                range.endDate(),
                snapshots.stream().mapToInt(Dashboard::getBookmarkCount).sum(),
                latestMemberCalculation(snapshots)
        );
    }

    private DateRange createRange(
            Long roomId,
            DashboardPeriod period,
            LocalDate date
    ) {
        if (period == DashboardPeriod.ALL) {
            return new DateRange(
                    snapshotRangeService.findAllStartDate(roomId),
                    LocalDate.now(dashboardClock).plusDays(1)
            );
        }
        LocalDate startDate = period.startDate(date);
        return new DateRange(
                startDate,
                period.endExclusive(startDate)
        );
    }

    private void validateRequest(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        if (roomId == null || userId == null || period == null
                || (period != DashboardPeriod.ALL && date == null)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (createRange(roomId, period, date).startDate()
                .isAfter(LocalDate.now(dashboardClock))) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
    }

    private LocalDateTime latestCoupleCalculation(
            List<CoupleDashboard> snapshots
    ) {
        return snapshots.stream()
                .map(CoupleDashboard::getCalculatedAt)
                .max(Comparator.naturalOrder())
                .orElseGet(() -> LocalDateTime.now(dashboardClock));
    }

    private LocalDateTime latestMemberCalculation(
            List<Dashboard> snapshots
    ) {
        return snapshots.stream()
                .map(Dashboard::getCalculatedAt)
                .max(Comparator.naturalOrder())
                .orElseGet(() -> LocalDateTime.now(dashboardClock));
    }

    private record DateRange(
            LocalDate startDate,
            LocalDate endExclusive
    ) {
        private LocalDate endDate() {
            return endExclusive.minusDays(1);
        }
    }
}
