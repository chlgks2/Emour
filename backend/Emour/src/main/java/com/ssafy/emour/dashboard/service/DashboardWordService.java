package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.dto.FrequentWordItem;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final ChatMessageRepository chatMessageRepository;
    private final DashboardRepository dashboardRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public DashboardFrequentWordsResponse getDailyFrequentWords(
            Long roomId,
            Long userId,
            LocalDate date,
            Integer requestedLimit
    ) {
        int limit = validateRequest(
                roomId,
                userId,
                date,
                requestedLimit
        );
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        List<String> contents = chatMessageRepository.findDailyTextContents(
                roomId,
                userId,
                start,
                end
        );
        List<String> allWords = contents.stream()
                .flatMap(content -> splitWords(content).stream())
                .toList();

        Map<String, Long> counts = allWords.stream()
                .collect(Collectors.groupingBy(
                        Function.identity(),
                        Collectors.counting()
                ));

        List<FrequentWordItem> frequentWords = counts.entrySet().stream()
                .sorted(Comparator
                        .<Map.Entry<String, Long>>comparingLong(
                                Map.Entry::getValue
                        )
                        .reversed()
                        .thenComparing(Map.Entry::getKey))
                .limit(limit)
                .map(entry -> new FrequentWordItem(
                        entry.getKey(),
                        Math.toIntExact(entry.getValue())
                ))
                .toList();

        Dashboard dashboard = dashboardRepository
                .findByRoomIdAndUserIdAndSummaryDate(roomId, userId, date)
                .orElseGet(() -> Dashboard.create(roomId, userId, date));
        dashboard.updateFrequentWords(toJson(frequentWords));
        Dashboard saved = dashboardRepository.save(dashboard);

        return new DashboardFrequentWordsResponse(
                saved.getRoomId(),
                saved.getUserId(),
                saved.getSummaryDate(),
                allWords.size(),
                counts.size(),
                frequentWords,
                saved.getCalculatedAt()
        );
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

    private int validateRequest(
            Long roomId,
            Long userId,
            LocalDate date,
            Integer requestedLimit
    ) {
        if (roomId == null || userId == null || date == null
                || date.isAfter(LocalDate.now())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        int limit = requestedLimit == null
                ? DEFAULT_LIMIT
                : requestedLimit;
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        boolean activeMember = coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(userId, roomId),
                CoupleMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new CustomException(ErrorCode.ACCESS_DENIED);
        }
        return limit;
    }

    private String toJson(List<FrequentWordItem> words) {
        try {
            return objectMapper.writeValueAsString(words);
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }
}
