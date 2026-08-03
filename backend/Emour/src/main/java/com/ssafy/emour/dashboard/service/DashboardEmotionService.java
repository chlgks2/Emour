package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.entity.ChatAnalysis;
import com.ssafy.emour.chat.entity.EmotionPolarity;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.EmotionFlowSlot;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardEmotionService {

    private static final int SLOT_HOURS = 2;
    private static final int SLOT_COUNT = 12;

    private final DashboardSnapshotService dashboardSnapshotService;
    private final ChatAnalysisRepository chatAnalysisRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    private final Clock dashboardClock;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public DashboardEmotionFlowResponse getEmotionFlow(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateRequest(roomId, userId, period, date);
        DateRange range = createRange(period, date);

        if (period == DashboardPeriod.DAY) {
            Dashboard dashboard = dashboardSnapshotService.ensureSnapshot(
                    roomId,
                    userId,
                    date
            );
            return createResponse(
                    roomId,
                    userId,
                    period,
                    range,
                    readFlow(dashboard.getEmotionFlow()),
                    dashboard.getCalculatedAt()
            );
        }

        List<ChatAnalysis> analyses = chatAnalysisRepository
                .findCompletedDailyAnalyses(
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
                createFlow(analyses),
                LocalDateTime.now(dashboardClock)
        );
    }

    // 기존 호출 코드는 일 단위로 그대로 동작합니다.
    @Transactional
    public DashboardEmotionFlowResponse getDailyEmotionFlow(
            Long roomId,
            Long userId,
            LocalDate date
    ) {
        return getEmotionFlow(
                roomId,
                userId,
                DashboardPeriod.DAY,
                date
        );
    }

    private DashboardEmotionFlowResponse createResponse(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            DateRange range,
            List<EmotionFlowSlot> flow,
            LocalDateTime calculatedAt
    ) {
        int analyzedMessageCount = flow.stream()
                .mapToInt(slot -> slot.positiveCount()
                        + slot.negativeCount()
                        + slot.neutralCount())
                .sum();
        return new DashboardEmotionFlowResponse(
                roomId,
                userId,
                period,
                range.startDate(),
                range.endDate(),
                range.startDate(),
                analyzedMessageCount,
                flow,
                calculatedAt
        );
    }

    private List<EmotionFlowSlot> createFlow(
            List<ChatAnalysis> analyses
    ) {
        int[][] counts = new int[SLOT_COUNT][3];
        for (ChatAnalysis analysis : analyses) {
            int slotIndex = analysis.getMessage().getSentAt().getHour()
                    / SLOT_HOURS;
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

        List<EmotionFlowSlot> flow = new ArrayList<>(SLOT_COUNT);
        for (int index = 0; index < SLOT_COUNT; index++) {
            int startHour = index * SLOT_HOURS;
            flow.add(new EmotionFlowSlot(
                    startHour,
                    startHour + SLOT_HOURS,
                    counts[index][0],
                    counts[index][1],
                    counts[index][2]
            ));
        }
        return flow;
    }

    private List<EmotionFlowSlot> readFlow(String json) {
        try {
            return objectMapper.readValue(
                    json,
                    new TypeReference<List<EmotionFlowSlot>>() {
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
