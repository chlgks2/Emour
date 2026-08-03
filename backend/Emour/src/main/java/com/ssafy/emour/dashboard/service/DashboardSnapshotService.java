package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.EmotionPolarity;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.EmotionFlowSlot;
import com.ssafy.emour.dashboard.dto.FrequentWordItem;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardSnapshotService {

    private static final int FINALIZE_MINUTE = 5;
    private static final int EMOTION_SLOT_HOURS = 2;
    private static final int EMOTION_SLOT_COUNT = 12;
    private static final String WORD_SEPARATOR = "[^\\p{L}\\p{N}]+";

    private final DashboardRepository dashboardRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatReactionRepository chatReactionRepository;
    private final ChatBookmarkRepository chatBookmarkRepository;
    private final ChatAnalysisRepository chatAnalysisRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final ConversationFlowCalculator conversationFlowCalculator;
    private final Clock dashboardClock;
    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();

    /**
     * 조회 시 정각 집계나 5분 최종 집계가 빠졌는지 확인하고 필요한 경우에만 계산합니다.
     */
    @Transactional
    public Dashboard ensureSnapshot(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        validateMember(roomId, userId);
        LocalDate today = LocalDate.now(dashboardClock);
        if (date == null || date.isAfter(today)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        LocalDateTime snapshotUntil;
        boolean shouldFinalize;
        if (date.isBefore(today)) {
            snapshotUntil = date.plusDays(1).atStartOfDay();
            shouldFinalize = true;
        } else {
            LocalDateTime now = LocalDateTime.now(dashboardClock);
            snapshotUntil = now.truncatedTo(ChronoUnit.HOURS);
            shouldFinalize = now.getMinute() >= FINALIZE_MINUTE;
        }

        Dashboard dashboard = dashboardRepository
                .findByRoomIdAndUserIdAndSummaryDate(roomId, userId, date)
                .orElse(null);
        if (!needsRefresh(dashboard, snapshotUntil, shouldFinalize)) {
            return dashboard;
        }

        return refreshSnapshot(
                roomId,
                userId,
                date,
                snapshotUntil,
                shouldFinalize
        );
    }

    /**
     * 스케줄러가 지정한 종료 시각 직전까지 모든 대시보드 항목을 한 번에 갱신합니다.
     */
    @Transactional
    public Dashboard refreshSnapshot(
            Long roomId,
            Long userId,
            LocalDate date,
            LocalDateTime snapshotUntil,
            boolean finalized
    ) {
        validateMember(roomId, userId);
        validateRange(date, snapshotUntil);

        LocalDateTime start = date.atStartOfDay();
        // 정량 기록은 개인이 아니라 커플방 전체 합계로 저장합니다.
        int messageCount = toInt(chatMessageRepository
                .countByRoomIdAndSentAtGreaterThanEqualAndSentAtLessThan(
                        roomId,
                        start,
                        snapshotUntil
                ));
        int imageCount = toInt(chatMessageRepository.countRoomImages(
                roomId,
                start,
                snapshotUntil
        ));
        int reactionCount = toInt(chatReactionRepository
                .countByRoomIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        roomId,
                        start,
                        snapshotUntil
                ));
        int bookmarkCount = toInt(chatBookmarkRepository
                .countByRoomIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        roomId,
                        start,
                        snapshotUntil
                ));

        List<ChatAnalysis> analyses =
                chatAnalysisRepository.findCompletedDailyAnalyses(
                        roomId,
                        userId,
                        start,
                        snapshotUntil
                );
        Map<EmotionType, Integer> emotionCounts =
                createEmotionCounts(analyses);
        List<EmotionFlowSlot> emotionFlow =
                createEmotionFlow(analyses);
        List<FrequentWordItem> frequentWords =
                createFrequentWords(chatMessageRepository
                        .findDailyTextContents(
                                roomId,
                                userId,
                                start,
                                snapshotUntil
                        ));
        List<ChatMessage> conversationMessages =
                chatMessageRepository.findConversationMessages(
                        roomId,
                        start,
                        snapshotUntil
                );
        ConversationFlowCalculator.ConversationMetrics conversation =
                conversationFlowCalculator.calculate(
                        conversationMessages,
                        date,
                        date
                );

        Dashboard dashboard = dashboardRepository
                .findByRoomIdAndUserIdAndSummaryDate(roomId, userId, date)
                .orElseGet(() -> Dashboard.create(roomId, userId, date));
        LocalDateTime calculatedAt = LocalDateTime.now(dashboardClock);
        dashboard.applyHourlySnapshot(
                messageCount,
                imageCount,
                reactionCount,
                bookmarkCount,
                toJsonEmotionCounts(emotionCounts),
                toJson(emotionFlow),
                toJson(frequentWords),
                conversation.averageResponseSeconds(),
                conversation.busiestHour(),
                toJson(conversation.dailyFrequency()),
                snapshotUntil,
                finalized,
                calculatedAt
        );
        return dashboardRepository.save(dashboard);
    }

    private boolean needsRefresh(
            Dashboard dashboard,
            LocalDateTime snapshotUntil,
            boolean shouldFinalize
    ) {
        if (dashboard == null
                || dashboard.getConversationFrequency() == null
                || dashboard.getAggregatedUntil() == null
                || dashboard.getAggregatedUntil().isBefore(snapshotUntil)) {
            return true;
        }
        return shouldFinalize
                && (dashboard.getFinalizedUntil() == null
                || dashboard.getFinalizedUntil().isBefore(snapshotUntil));
    }

    private Map<EmotionType, Integer> createEmotionCounts(
            List<ChatAnalysis> analyses
    ) {
        Map<EmotionType, Integer> counts =
                new EnumMap<>(EmotionType.class);
        Arrays.stream(EmotionType.values())
                .forEach(type -> counts.put(type, 0));
        analyses.stream()
                .map(ChatAnalysis::getEmotionType)
                .map(EmotionType::fromStoredValue)
                .forEach(type -> counts.merge(type, 1, Integer::sum));
        return counts;
    }

    private List<EmotionFlowSlot> createEmotionFlow(
            List<ChatAnalysis> analyses
    ) {
        int[][] counts = new int[EMOTION_SLOT_COUNT][3];
        for (ChatAnalysis analysis : analyses) {
            int slotIndex = analysis.getMessage().getSentAt().getHour()
                    / EMOTION_SLOT_HOURS;
            EmotionPolarity polarity = EmotionType
                    .fromStoredValue(analysis.getEmotionType())
                    .getPolarity();
            int polarityIndex = switch (polarity) {
                case POSITIVE -> 0;
                case NEGATIVE -> 1;
                case NEUTRAL -> 2;
            };
            counts[slotIndex][polarityIndex]++;
        }

        List<EmotionFlowSlot> flow =
                new ArrayList<>(EMOTION_SLOT_COUNT);
        for (int index = 0; index < EMOTION_SLOT_COUNT; index++) {
            int startHour = index * EMOTION_SLOT_HOURS;
            flow.add(new EmotionFlowSlot(
                    startHour,
                    startHour + EMOTION_SLOT_HOURS,
                    counts[index][0],
                    counts[index][1],
                    counts[index][2]
            ));
        }
        return flow;
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

    private String toJsonEmotionCounts(
            Map<EmotionType, Integer> counts
    ) {
        Map<String, Integer> jsonCounts = new LinkedHashMap<>();
        counts.forEach((type, count) ->
                jsonCounts.put(type.name(), count));
        return toJson(jsonCounts);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private void validateMember(Long roomId, Long userId) {
        if (roomId == null || userId == null) {
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

    private void validateRange(
            LocalDate date,
            LocalDateTime snapshotUntil
    ) {
        if (date == null || snapshotUntil == null
                || snapshotUntil.isBefore(date.atStartOfDay())
                || snapshotUntil.isAfter(
                        date.plusDays(1).atStartOfDay()
                )) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private int toInt(long count) {
        return Math.toIntExact(count);
    }
}
