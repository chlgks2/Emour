package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardConversationFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.ConversationFrequencyItem;
import com.ssafy.emour.dashboard.dto.ConversationSnapshotData;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardConversationService {

    private final DashboardSnapshotRangeService snapshotRangeService;
    private final CoupleMemberRepository coupleMemberRepository;
    private final Clock dashboardClock;
    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();

    @Transactional
    public DashboardConversationFlowResponse getConversationFlow(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateRequest(roomId, userId, period, date);
        DateRange range = createRange(period, date);

        List<CoupleDashboard> snapshots = snapshotRangeService
                .getCoupleSnapshots(
                        roomId,
                        userId,
                        range.startDate(),
                        range.endExclusive()
                );
        AggregatedConversation metrics = aggregate(
                snapshots,
                range.startDate(),
                range.endExclusive().minusDays(1)
        );
        return new DashboardConversationFlowResponse(
                roomId,
                period,
                range.startDate(),
                range.endExclusive().minusDays(1),
                metrics.totalMessageCount(),
                metrics.busiestHour(),
                metrics.averageResponseSeconds(),
                metrics.dailyFrequency(),
                snapshots.stream()
                        .map(CoupleDashboard::getCalculatedAt)
                        .max(Comparator.naturalOrder())
                        .orElseGet(() -> LocalDateTime.now(dashboardClock))
        );
    }

    private AggregatedConversation aggregate(
            List<CoupleDashboard> snapshots,
            LocalDate startDate,
            LocalDate endDate
    ) {
        int[] hourlyCounts = new int[24];
        long responseMillis = 0L;
        int responseCount = 0;
        int totalMessageCount = 0;
        Map<LocalDate, Integer> dailyCounts = new LinkedHashMap<>();
        for (LocalDate date = startDate;
             !date.isAfter(endDate);
             date = date.plusDays(1)) {
            dailyCounts.put(date, 0);
        }
        Long previousSenderId = null;
        LocalDateTime previousSentAt = null;

        for (CoupleDashboard snapshot : snapshots) {
            ConversationSnapshotData data = readSnapshot(
                    snapshot.getConversationFrequency()
            );
            for (int hour = 0; hour < hourlyCounts.length; hour++) {
                hourlyCounts[hour] += data.hourlyMessageCounts().get(hour);
            }
            responseMillis += data.responseTimeTotalMillis();
            responseCount += data.responseCount();
            if (previousSenderId != null
                    && data.firstSenderId() != null
                    && !previousSenderId.equals(data.firstSenderId())) {
                responseMillis += Duration.between(
                        previousSentAt,
                        data.firstSentAt()
                ).toMillis();
                responseCount++;
            }
            if (data.lastSenderId() != null) {
                previousSenderId = data.lastSenderId();
                previousSentAt = data.lastSentAt();
            }
            totalMessageCount += snapshot.getMessageCount();
            dailyCounts.put(
                    snapshot.getSummaryDate(),
                    snapshot.getMessageCount()
            );
        }

        List<ConversationFrequencyItem> frequency = dailyCounts.entrySet()
                .stream()
                .map(entry -> new ConversationFrequencyItem(
                        entry.getKey(),
                        entry.getValue()
                ))
                .toList();

        return new AggregatedConversation(
                totalMessageCount,
                findBusiestHour(hourlyCounts),
                averageResponseSeconds(responseMillis, responseCount),
                frequency
        );
    }

    private ConversationSnapshotData readSnapshot(String json) {
        try {
            return objectMapper.readValue(
                    json,
                    ConversationSnapshotData.class
            );
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private Integer findBusiestHour(int[] counts) {
        int busiestHour = 0;
        for (int hour = 1; hour < counts.length; hour++) {
            if (counts[hour] > counts[busiestHour]) {
                busiestHour = hour;
            }
        }
        return counts[busiestHour] == 0 ? null : busiestHour;
    }

    private BigDecimal averageResponseSeconds(
            long responseMillis,
            int responseCount
    ) {
        if (responseCount == 0) {
            return null;
        }
        return BigDecimal.valueOf(responseMillis).divide(
                BigDecimal.valueOf(responseCount * 1000L),
                2,
                RoundingMode.HALF_UP
        );
    }

    private DateRange createRange(
            DashboardPeriod period,
            LocalDate date
    ) {
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
        if (roomId == null || userId == null
                || period == null || date == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        DateRange range = createRange(period, date);
        if (range.startDate().isAfter(LocalDate.now(dashboardClock))) {
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

    private record DateRange(
            LocalDate startDate,
            LocalDate endExclusive
    ) {
    }

    private record AggregatedConversation(
            int totalMessageCount,
            Integer busiestHour,
            BigDecimal averageResponseSeconds,
            List<ConversationFrequencyItem> dailyFrequency
    ) {
    }
}
