package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.FrequentWordItem;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
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
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardWordService {

    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 50;
    private final DashboardSnapshotRangeService snapshotRangeService;
    private final CoupleMemberRepository coupleMemberRepository;
    private final Clock dashboardClock;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public DashboardFrequentWordsResponse getFrequentWords(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date,
            Integer requestedLimit
    ) {
        validateRequest(roomId, userId, period, date);
        int limit = normalizeLimit(requestedLimit);
        DateRange range = createRange(period, date);

        List<CoupleDashboard> snapshots = snapshotRangeService
                .getCoupleSnapshots(
                        roomId,
                        userId,
                        range.startDate(),
                        range.endExclusive()
                );
        List<FrequentWordItem> allWords = mergeWords(snapshots);
        LocalDateTime calculatedAt = snapshots.stream()
                .map(CoupleDashboard::getCalculatedAt)
                .max(Comparator.naturalOrder())
                .orElseGet(() -> LocalDateTime.now(dashboardClock));

        List<FrequentWordItem> limitedWords = allWords.stream()
                .limit(limit)
                .toList();
        int totalWordCount = allWords.stream()
                .mapToInt(FrequentWordItem::count)
                .sum();
        return new DashboardFrequentWordsResponse(
                roomId,
                period,
                range.startDate(),
                range.endDate(),
                range.startDate(),
                totalWordCount,
                allWords.size(),
                limitedWords,
                calculatedAt
        );
    }

    private List<FrequentWordItem> mergeWords(
            List<CoupleDashboard> snapshots
    ) {
        Map<String, Integer> counts = snapshots.stream()
                .flatMap(snapshot -> readWords(
                        snapshot.getFrequentWords()
                ).stream())
                .collect(Collectors.toMap(
                        FrequentWordItem::word,
                        FrequentWordItem::count,
                        Integer::sum
                ));
        return counts.entrySet().stream()
                .sorted(Comparator
                        .<Map.Entry<String, Integer>>comparingInt(
                                Map.Entry::getValue
                        )
                        .reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(entry -> new FrequentWordItem(
                        entry.getKey(),
                        entry.getValue()
                ))
                .toList();
    }

    private List<FrequentWordItem> readWords(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                    json,
                    new TypeReference<List<FrequentWordItem>>() {
                    }
            );
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private int normalizeLimit(Integer requestedLimit) {
        int limit = requestedLimit == null
                ? DEFAULT_LIMIT
                : requestedLimit;
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return limit;
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

    private record DateRange(
            LocalDate startDate,
            LocalDate endExclusive
    ) {
        private LocalDate endDate() {
            return endExclusive.minusDays(1);
        }
    }
}
