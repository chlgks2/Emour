package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCoupleEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.EmotionFlowSlot;
import com.ssafy.emour.dashboard.dto.MemberEmotionFlow;
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
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardEmotionService {

    private static final int SLOT_HOURS = 2;
    private static final int SLOT_COUNT = 12;

    private final DashboardSnapshotRangeService snapshotRangeService;
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
        DateRange range = createRange(roomId, period, date);

        List<Dashboard> snapshots = snapshotRangeService.getMemberSnapshots(
                        roomId,
                        userId,
                        range.startDate(),
                        range.endExclusive()
        );
        return createResponse(
                roomId,
                userId,
                period,
                range,
                mergeFlows(snapshots),
                snapshots.stream()
                        .map(Dashboard::getCalculatedAt)
                        .max(Comparator.naturalOrder())
                        .orElseGet(() -> LocalDateTime.now(dashboardClock))
        );
    }

    @Transactional
    public DashboardCoupleEmotionFlowResponse getCoupleEmotionFlow(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateRequest(roomId, userId, period, date);
        Long partnerUserId = coupleMemberRepository
                .findAllByIdRoomId(roomId)
                .stream()
                .filter(member -> member.getStatus()
                        == CoupleMemberStatus.ACTIVE)
                .map(member -> member.getId().getUserId())
                .filter(memberUserId -> !memberUserId.equals(userId))
                .findFirst()
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));

        DashboardEmotionFlowResponse myResponse = getEmotionFlow(
                roomId,
                userId,
                period,
                date
        );
        DashboardEmotionFlowResponse partnerResponse = getEmotionFlow(
                roomId,
                partnerUserId,
                period,
                date
        );
        LocalDateTime calculatedAt = myResponse.calculatedAt()
                .isAfter(partnerResponse.calculatedAt())
                ? myResponse.calculatedAt()
                : partnerResponse.calculatedAt();

        return new DashboardCoupleEmotionFlowResponse(
                roomId,
                period,
                myResponse.startDate(),
                myResponse.endDate(),
                MemberEmotionFlow.from(myResponse),
                MemberEmotionFlow.from(partnerResponse),
                calculatedAt
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

    private List<EmotionFlowSlot> mergeFlows(
            List<Dashboard> snapshots
    ) {
        int[][] counts = new int[SLOT_COUNT][3];
        for (Dashboard snapshot : snapshots) {
            for (EmotionFlowSlot slot : readFlow(snapshot.getEmotionFlow())) {
                int slotIndex = slot.startHour() / SLOT_HOURS;
                counts[slotIndex][0] += slot.positiveCount();
                counts[slotIndex][1] += slot.negativeCount();
                counts[slotIndex][2] += slot.neutralCount();
            }
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
        if (json == null || json.isBlank()) {
            return List.of();
        }
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
            Long roomId,
            DashboardPeriod period,
            LocalDate date
    ) {
        if (period == DashboardPeriod.ALL) {
            return new DateRange(
                    snapshotRangeService.findAllStartDate(roomId),
                    LocalDate.now(dashboardClock).plusDays(1)
            );
        }
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
        if (roomId == null || userId == null || period == null
                || (period != DashboardPeriod.ALL && date == null)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (createRange(roomId, period, date).startDate()
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
