package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.EmotionSummaryItem;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardMainEmotionService {

    private final ChatAnalysisRepository chatAnalysisRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    // 기존 생성자 호환성을 유지하며, 조회는 원본 데이터 직접 집계를 사용한다.
    private final DashboardSnapshotService dashboardSnapshotService;
    private final Clock dashboardClock;

    @Transactional
    public DashboardMainEmotionResponse getMainEmotions(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateRequest(roomId, userId, period, date);
        DateRange range = createRange(period, date);

        List<String> storedEmotions =
                chatAnalysisRepository.findCompletedEmotionTypes(
                        roomId,
                        userId,
                        range.startDate().atStartOfDay(),
                        range.endExclusive().atStartOfDay()
                );
        return createResponse(
                roomId,
                userId,
                period,
                range,
                createCounts(storedEmotions),
                LocalDateTime.now(dashboardClock)
        );
    }

    private DashboardMainEmotionResponse createResponse(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            DateRange range,
            Map<EmotionType, Integer> counts,
            LocalDateTime calculatedAt
    ) {
        int totalCount = counts.values().stream()
                .mapToInt(Integer::intValue)
                .sum();
        List<EmotionSummaryItem> summaries =
                createSummaries(counts);
        EmotionSummaryItem dominantEmotion = summaries.stream()
                .filter(summary -> summary.count() > 0)
                .findFirst()
                .orElse(null);

        return new DashboardMainEmotionResponse(
                roomId,
                userId,
                period,
                range.startDate(),
                range.endExclusive().minusDays(1),
                totalCount,
                dominantEmotion,
                summaries,
                calculatedAt
        );
    }

    private Map<EmotionType, Integer> createCounts(
            List<String> storedEmotions
    ) {
        Map<EmotionType, Integer> counts = emptyCounts();
        storedEmotions.stream()
                .map(EmotionType::fromStoredValue)
                .forEach(type -> counts.merge(type, 1, Integer::sum));
        return counts;
    }

    private Map<EmotionType, Integer> emptyCounts() {
        Map<EmotionType, Integer> counts =
                new EnumMap<>(EmotionType.class);
        Arrays.stream(EmotionType.values())
                .forEach(type -> counts.put(type, 0));
        return counts;
    }

    private List<EmotionSummaryItem> createSummaries(
            Map<EmotionType, Integer> counts
    ) {
        return counts.entrySet().stream()
                .sorted(Map.Entry
                        .<EmotionType, Integer>comparingByValue()
                        .reversed()
                        .thenComparing(entry ->
                                entry.getKey().ordinal()))
                .map(entry -> new EmotionSummaryItem(
                        entry.getKey().name(),
                        entry.getKey().getKoreanLabel(),
                        entry.getValue()
                ))
                .toList();
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
}
