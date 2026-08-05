package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.EmotionPolarity;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.EmotionFlowSlot;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 개인 북마크 수와 감정 흐름을 집계합니다. */
@Service
@RequiredArgsConstructor
public class DashboardSnapshotService {

    private static final int EMOTION_SLOT_HOURS = 2;
    private static final int EMOTION_SLOT_COUNT = 12;

    private final DashboardRepository dashboardRepository;
    private final ChatBookmarkRepository chatBookmarkRepository;
    private final ChatAnalysisRepository chatAnalysisRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final DashboardSnapshotLockService snapshotLockService;
    private final Clock dashboardClock;
    private final ObjectMapper objectMapper =
            new ObjectMapper().findAndRegisterModules();

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
        snapshotLockService.lockRoom(roomId);
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime calculatedAt = LocalDateTime.now(dashboardClock);

        Dashboard dashboard = dashboardRepository
                .findByRoomIdAndUserIdAndSummaryDate(roomId, userId, date)
                .orElse(null);
        if (hasSnapshotThrough(dashboard, snapshotUntil)) {
            if (finalized) {
                dashboard.markFinalizedUntil(
                        snapshotUntil,
                        calculatedAt
                );
                return dashboardRepository.save(dashboard);
            }
            return dashboard;
        }

        int bookmarkCount = Math.toIntExact(chatBookmarkRepository
                .countByRoomIdAndUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        roomId,
                        userId,
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

        if (dashboard == null) {
            dashboard = Dashboard.create(roomId, userId, date);
        }
        dashboard.applyHourlySnapshot(
                bookmarkCount,
                toJson(createEmotionFlow(analyses)),
                toJsonEmotionCounts(createEmotionCounts(analyses)),
                snapshotUntil,
                finalized,
                calculatedAt
        );
        return dashboardRepository.save(dashboard);
    }

    private boolean hasSnapshotThrough(
            Dashboard dashboard,
            LocalDateTime snapshotUntil
    ) {
        return dashboard != null
                && dashboard.getEmotionFlow() != null
                && !dashboard.getEmotionFlow().isBlank()
                && dashboard.getEmotionSummary() != null
                && !dashboard.getEmotionSummary().isBlank()
                && dashboard.getAggregatedUntil() != null
                && dashboard.getAggregatedUntil().isAfter(snapshotUntil);
    }

    private boolean needsRefresh(
            Dashboard dashboard,
            LocalDateTime snapshotUntil,
            boolean shouldFinalize
    ) {
        if (dashboard == null
                || dashboard.getEmotionFlow() == null
                || dashboard.getEmotionFlow().isBlank()
                || dashboard.getEmotionSummary() == null
                || dashboard.getEmotionSummary().isBlank()
                || dashboard.getAggregatedUntil() == null
                || dashboard.getAggregatedUntil().isBefore(snapshotUntil)) {
            return true;
        }
        return shouldFinalize
                && (dashboard.getFinalizedUntil() == null
                || dashboard.getFinalizedUntil().isBefore(snapshotUntil));
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

        List<EmotionFlowSlot> flow = new ArrayList<>(EMOTION_SLOT_COUNT);
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

    private Map<EmotionType, Integer> createEmotionCounts(
            List<ChatAnalysis> analyses
    ) {
        Map<EmotionType, Integer> counts = new EnumMap<>(EmotionType.class);
        Arrays.stream(EmotionType.values())
                .forEach(type -> counts.put(type, 0));
        analyses.stream()
                .map(ChatAnalysis::getEmotionType)
                .map(EmotionType::fromStoredValue)
                .forEach(type -> counts.merge(type, 1, Integer::sum));
        return counts;
    }

    private String toJsonEmotionCounts(
            Map<EmotionType, Integer> counts
    ) {
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
                || snapshotUntil.isAfter(date.plusDays(1).atStartOfDay())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }
}
