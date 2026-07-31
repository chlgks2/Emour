package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.EmotionSummaryItem;
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
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardMainEmotionService {

    private final ChatAnalysisRepository chatAnalysisRepository;
    private final DashboardRepository dashboardRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        Map<EmotionType, Integer> counts = createCounts(storedEmotions);
        int totalCount = storedEmotions.size();
        List<EmotionSummaryItem> summaries =
                createSummaries(counts);
        EmotionSummaryItem dominantEmotion = summaries.stream()
                .filter(summary -> summary.count() > 0)
                .findFirst()
                .orElse(null);

        LocalDateTime calculatedAt = LocalDateTime.now();
        if (period == DashboardPeriod.DAY) {
            Dashboard dashboard = dashboardRepository
                    .findByRoomIdAndUserIdAndSummaryDate(
                            roomId,
                            userId,
                            range.startDate()
                    )
                    .orElseGet(() -> Dashboard.create(
                            roomId,
                            userId,
                            range.startDate()
                    ));
            dashboard.updateEmotionSummary(toJson(counts));
            calculatedAt = dashboardRepository
                    .save(dashboard)
                    .getCalculatedAt();
        }

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
        Map<EmotionType, Integer> counts =
                new EnumMap<>(EmotionType.class);
        Arrays.stream(EmotionType.values())
                .forEach(type -> counts.put(type, 0));

        storedEmotions.stream()
                .map(EmotionType::fromStoredValue)
                .forEach(type -> counts.merge(type, 1, Integer::sum));
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

    private String toJson(Map<EmotionType, Integer> counts) {
        Map<String, Integer> jsonCounts = new LinkedHashMap<>();
        counts.forEach((type, count) ->
                jsonCounts.put(type.name(), count));
        try {
            return objectMapper.writeValueAsString(jsonCounts);
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
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
        if (range.startDate().isAfter(LocalDate.now())) {
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
