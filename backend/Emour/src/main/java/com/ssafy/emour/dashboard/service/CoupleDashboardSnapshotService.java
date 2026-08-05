package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.FrequentWordItem;
import com.ssafy.emour.dashboard.dto.ConversationSnapshotData;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import com.ssafy.emour.dashboard.repository.CoupleDashboardRepository;
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
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** 커플방 전체 대화 통계를 하루 단위로 집계합니다. */
@Service
@RequiredArgsConstructor
public class CoupleDashboardSnapshotService {

    private static final String WORD_SEPARATOR = "[^\\p{L}\\p{N}]+";
    private static final Pattern CHAT_NOISE = Pattern.compile(
            "^[ㅋㅎㅠㅜ]+$"
    );
    private static final Pattern REPEATED_CHARACTER = Pattern.compile(
            "^(.)\\1{2,}$"
    );
    private static final Set<String> FREQUENT_WORD_STOP_WORDS = Set.of(
            "그냥",
            "아니",
            "근데",
            "진짜",
            "ㄹㅇ"
    );

    private final CoupleDashboardRepository coupleDashboardRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatReactionRepository chatReactionRepository;
    private final ChatAnalysisRepository chatAnalysisRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final ConversationFlowCalculator conversationFlowCalculator;
    private final DashboardSnapshotLockService snapshotLockService;
    private final Clock dashboardClock;
    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();

    @Transactional
    public CoupleDashboard ensureSnapshot(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        validateMember(roomId, userId);
        LocalDate today = LocalDate.now(dashboardClock);
        if (date == null || date.isAfter(today)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        snapshotLockService.lockRoom(roomId);

        LocalDateTime snapshotUntil;
        boolean shouldFinalize;
        if (date.isBefore(today)) {
            snapshotUntil = date.plusDays(1).atStartOfDay();
            shouldFinalize = true;
        } else {
            LocalDateTime now = LocalDateTime.now(dashboardClock);
            snapshotUntil = now;
            shouldFinalize = false;
        }

        CoupleDashboard dashboard = coupleDashboardRepository
                .findByRoomIdAndSummaryDate(roomId, date)
                .orElse(null);
        if (!needsRefresh(dashboard, snapshotUntil, shouldFinalize)) {
            return dashboard;
        }
        return refreshSnapshot(
                roomId,
                date,
                snapshotUntil,
                shouldFinalize
        );
    }

    @Transactional
    public CoupleDashboard refreshSnapshot(
            Long roomId,
            LocalDate date,
            LocalDateTime snapshotUntil,
            boolean finalized
    ) {
        validateRange(roomId, date, snapshotUntil);
        snapshotLockService.lockRoom(roomId);
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime calculatedAt = LocalDateTime.now(dashboardClock);

        CoupleDashboard dashboard = coupleDashboardRepository
                .findByRoomIdAndSummaryDate(roomId, date)
                .orElse(null);
        if (hasSnapshotThrough(dashboard, snapshotUntil)) {
            if (finalized) {
                dashboard.markFinalizedUntil(
                        snapshotUntil,
                        calculatedAt
                );
                return coupleDashboardRepository.save(dashboard);
            }
            return dashboard;
        }

        int messageCount = Math.toIntExact(chatMessageRepository
                .countByRoomIdAndSentAtGreaterThanEqualAndSentAtLessThan(
                        roomId,
                        start,
                        snapshotUntil
                ));
        int imageCount = Math.toIntExact(chatMessageRepository.countRoomImages(
                roomId,
                start,
                snapshotUntil
        ));
        int reactionCount = Math.toIntExact(chatReactionRepository
                .countByRoomIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        roomId,
                        start,
                        snapshotUntil
                ));

        Map<EmotionType, Integer> emotionCounts = createEmotionCounts(
                chatAnalysisRepository.findCompletedRoomEmotionTypes(
                        roomId,
                        start,
                        snapshotUntil
                )
        );
        List<FrequentWordItem> frequentWords = createFrequentWords(
                chatMessageRepository.findRoomTextContents(
                        roomId,
                        start,
                        snapshotUntil
                )
        );
        List<ChatMessage> messages = chatMessageRepository
                .findConversationMessages(roomId, start, snapshotUntil);
        ConversationFlowCalculator.ConversationMetrics conversation =
                conversationFlowCalculator.calculate(messages, date, date);

        if (dashboard == null) {
            dashboard = CoupleDashboard.create(roomId, date);
        }
        dashboard.applyHourlySnapshot(
                messageCount,
                imageCount,
                reactionCount,
                toJsonEmotionCounts(emotionCounts),
                toJson(frequentWords),
                conversation.averageResponseSeconds(),
                conversation.busiestHour(),
                toJson(ConversationSnapshotData.from(conversation)),
                snapshotUntil,
                finalized,
                calculatedAt
        );
        return coupleDashboardRepository.save(dashboard);
    }

    private boolean hasSnapshotThrough(
            CoupleDashboard dashboard,
            LocalDateTime snapshotUntil
    ) {
        return dashboard != null
                && dashboard.getEmotionSummary() != null
                && !dashboard.getEmotionSummary().isBlank()
                && dashboard.getFrequentWords() != null
                && !dashboard.getFrequentWords().isBlank()
                && isCurrentConversationSnapshot(
                        dashboard.getConversationFrequency()
                )
                && dashboard.getAggregatedUntil() != null
                && dashboard.getAggregatedUntil().isAfter(snapshotUntil);
    }

    private boolean needsRefresh(
            CoupleDashboard dashboard,
            LocalDateTime snapshotUntil,
            boolean shouldFinalize
    ) {
        if (dashboard == null
                || dashboard.getEmotionSummary() == null
                || dashboard.getEmotionSummary().isBlank()
                || dashboard.getFrequentWords() == null
                || dashboard.getFrequentWords().isBlank()
                || !isCurrentConversationSnapshot(
                        dashboard.getConversationFrequency()
                )
                || dashboard.getAggregatedUntil() == null
                || dashboard.getAggregatedUntil().isBefore(snapshotUntil)) {
            return true;
        }
        return shouldFinalize
                && (dashboard.getFinalizedUntil() == null
                || dashboard.getFinalizedUntil().isBefore(snapshotUntil));
    }

    private Map<EmotionType, Integer> createEmotionCounts(
            List<String> storedEmotions
    ) {
        Map<EmotionType, Integer> counts = new EnumMap<>(EmotionType.class);
        Arrays.stream(EmotionType.values())
                .forEach(type -> counts.put(type, 0));
        storedEmotions.stream()
                .map(EmotionType::fromStoredValue)
                .forEach(type -> counts.merge(type, 1, Integer::sum));
        return counts;
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
        return normalized.isEmpty()
                ? List.of()
                : Arrays.stream(normalized.split("\\s+"))
                .filter(word -> !word.isBlank())
                // ㅋㅋㅋㅋ, ㅎㅎㅎ, ㅠㅠ처럼 의미 없는 채팅 표현은 제외합니다.
                .filter(word -> !CHAT_NOISE.matcher(word).matches())
                // 같은 글자만 세 번 이상 반복된 표현도 제외합니다.
                .filter(word -> !REPEATED_CHARACTER.matcher(word).matches())
                // 자주 쓰이지만 통계 의미가 적은 말은 집계에서 제외합니다.
                .filter(word -> !FREQUENT_WORD_STOP_WORDS.contains(word))
                .toList();
    }

    private String toJsonEmotionCounts(Map<EmotionType, Integer> counts) {
        Map<String, Integer> values = new LinkedHashMap<>();
        counts.forEach((type, count) -> values.put(type.name(), count));
        return toJson(values);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    boolean isCurrentConversationSnapshot(String json) {
        if (json == null || json.isBlank()) {
            return false;
        }
        try {
            ConversationSnapshotData snapshot = objectMapper.readValue(
                    json,
                    ConversationSnapshotData.class
            );
            return snapshot.version()
                    == ConversationSnapshotData.CURRENT_VERSION;
        } catch (JsonProcessingException exception) {
            return false;
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
            Long roomId,
            LocalDate date,
            LocalDateTime snapshotUntil
    ) {
        if (roomId == null || date == null || snapshotUntil == null
                || snapshotUntil.isBefore(date.atStartOfDay())
                || snapshotUntil.isAfter(date.plusDays(1).atStartOfDay())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }
}
