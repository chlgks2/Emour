package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final DashboardSnapshotService dashboardSnapshotService;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatReactionRepository chatReactionRepository;
    private final ChatBookmarkRepository chatBookmarkRepository;
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
        DateRange range = createRange(period, date);

        if (period == DashboardPeriod.DAY) {
            Dashboard dashboard = dashboardSnapshotService.ensureSnapshot(
                    roomId,
                    userId,
                    date
            );
            return new DashboardCountResponse(
                    dashboard.getDashboardId(),
                    dashboard.getRoomId(),
                    dashboard.getUserId(),
                    period,
                    range.startDate(),
                    range.endDate(),
                    range.startDate(),
                    dashboard.getMessageCount(),
                    dashboard.getImageCount(),
                    dashboard.getReactionCount(),
                    dashboard.getBookmarkCount(),
                    dashboard.getCalculatedAt(),
                    dashboard.getUpdatedAt()
            );
        }

        LocalDateTime start = range.startDate().atStartOfDay();
        LocalDateTime end = range.endExclusive().atStartOfDay();
        LocalDateTime calculatedAt = LocalDateTime.now(dashboardClock);
        return new DashboardCountResponse(
                null,
                roomId,
                userId,
                period,
                range.startDate(),
                range.endDate(),
                range.startDate(),
                toInt(chatMessageRepository
                        .countByRoomIdAndSentAtGreaterThanEqualAndSentAtLessThan(
                                roomId,
                                start,
                                end
                        )),
                toInt(chatMessageRepository.countRoomImages(
                        roomId,
                        start,
                        end
                )),
                toInt(chatReactionRepository
                        .countByRoomIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                                roomId,
                                start,
                                end
                        )),
                toInt(chatBookmarkRepository
                        .countByRoomIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                                roomId,
                                start,
                                end
                        )),
                calculatedAt,
                calculatedAt
        );
    }

    // 기존 호출 코드는 일 단위로 그대로 동작합니다.
    @Transactional
    public DashboardCountResponse getDailyCounts(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        return getCounts(roomId, userId, DashboardPeriod.DAY, date);
    }

    private DateRange createRange(
            DashboardPeriod period,
            LocalDate date
    ) {
        return switch (period) {
            case DAY -> new DateRange(date, date.plusDays(1));
            case MONTH -> {
                LocalDate start = date.withDayOfMonth(1);
                yield new DateRange(start, start.plusMonths(1));
            }
            case YEAR -> {
                LocalDate start = date.withDayOfYear(1);
                yield new DateRange(start, start.plusYears(1));
            }
        };
    }

    private void validateRequest(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        if (roomId == null || userId == null
                || period == null || date == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (createRange(period, date).startDate()
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

    private int toInt(long count) {
        return Math.toIntExact(count);
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
