package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.dto.FrequentWordItem;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardWordService {

    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 50;

    private final DashboardSnapshotService dashboardSnapshotService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public DashboardFrequentWordsResponse getDailyFrequentWords(
            Long roomId,
            Long userId,
            LocalDate date,
            Integer requestedLimit
    ) {
        int limit = normalizeLimit(requestedLimit);
        Dashboard dashboard = dashboardSnapshotService.ensureSnapshot(
                roomId,
                userId,
                date
        );
        List<FrequentWordItem> allWords = readWords(
                dashboard.getFrequentWords()
        );
        List<FrequentWordItem> limitedWords = allWords.stream()
                .limit(limit)
                .toList();
        int totalWordCount = allWords.stream()
                .mapToInt(FrequentWordItem::count)
                .sum();

        return new DashboardFrequentWordsResponse(
                dashboard.getRoomId(),
                dashboard.getUserId(),
                dashboard.getSummaryDate(),
                totalWordCount,
                allWords.size(),
                limitedWords,
                dashboard.getCalculatedAt()
        );
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
}
