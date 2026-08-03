package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
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
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardWordService {

    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 50;
    private static final String WORD_SEPARATOR = "[^\\p{L}\\p{N}]+";

    private final CoupleDashboardSnapshotService coupleDashboardSnapshotService;
    private final ChatMessageRepository chatMessageRepository;
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

        List<FrequentWordItem> allWords;
        LocalDateTime calculatedAt;
        if (period == DashboardPeriod.DAY) {
            CoupleDashboard dashboard = coupleDashboardSnapshotService.ensureSnapshot(
                    roomId,
                    userId,
                    date
            );
            allWords = readWords(dashboard.getFrequentWords());
            calculatedAt = dashboard.getCalculatedAt();
        } else {
            List<String> contents = chatMessageRepository.findRoomTextContents(
                    roomId,
                    range.startDate().atStartOfDay(),
                    range.endExclusive().atStartOfDay()
            );
            allWords = createFrequentWords(contents);
            calculatedAt = LocalDateTime.now(dashboardClock);
        }

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

    private List<FrequentWordItem> createFrequentWords(
            List<String> contents
    ) {
        Map<String, Long> counts = contents.stream()
                .flatMap(content -> splitWords(content).stream())
                .collect(Collectors.groupingBy(
                        Function.identity(),
                        Collectors.counting()
                ));
        return counts.entrySet().stream()
                .sorted(Comparator
                        .<Map.Entry<String, Long>>comparingLong(
                                Map.Entry::getValue
                        )
                        .reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(entry -> new FrequentWordItem(
                        entry.getKey(),
                        Math.toIntExact(entry.getValue())
                ))
                .toList();
    }

    private List<String> splitWords(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }
        String normalized = content
                .toLowerCase(Locale.ROOT)
                .replaceAll(WORD_SEPARATOR, " ")
                .trim();
        if (normalized.isEmpty()) {
            return List.of();
        }
        return Arrays.stream(normalized.split("\\s+"))
                .filter(word -> !word.isBlank())
                .toList();
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

    private List<FrequentWordItem> readWords(String json) {
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

    private record DateRange(
            LocalDate startDate,
            LocalDate endExclusive
    ) {
        private LocalDate endDate() {
            return endExclusive.minusDays(1);
        }
    }
}
