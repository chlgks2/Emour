package com.ssafy.emour.dashboard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.emour.chat.entity.EmotionType;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCoupleMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.dto.EmotionSummaryItem;
import com.ssafy.emour.dashboard.dto.MemberMainEmotion;
import com.ssafy.emour.dashboard.entity.Dashboard;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DashboardMainEmotionService {

    private final DashboardSnapshotRangeService snapshotRangeService;
    private final CoupleMemberRepository coupleMemberRepository;
    private final Clock dashboardClock;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public DashboardCoupleMainEmotionResponse getMainEmotions(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateRequest(roomId, userId, period, date);
        DateRange range = createRange(period, date);
        Long partnerUserId = findPartnerUserId(roomId, userId);
        MemberAggregation me = aggregateMember(
                roomId,
                userId,
                range
        );
        MemberAggregation partner = aggregateMember(
                roomId,
                partnerUserId,
                range
        );
        LocalDateTime calculatedAt = me.calculatedAt()
                .isAfter(partner.calculatedAt())
                ? me.calculatedAt()
                : partner.calculatedAt();

        return new DashboardCoupleMainEmotionResponse(
                roomId,
                period,
                range.startDate(),
                range.endExclusive().minusDays(1),
                me.summary(),
                partner.summary(),
                calculatedAt
        );
    }

    private MemberAggregation aggregateMember(
            Long roomId,
            Long userId,
            DateRange range
    ) {
        List<Dashboard> snapshots = snapshotRangeService.getMemberSnapshots(
                roomId,
                userId,
                range.startDate(),
                range.endExclusive()
        );
        Map<EmotionType, Integer> counts = createCounts(snapshots);
        int totalCount = counts.values().stream()
                .mapToInt(Integer::intValue)
                .sum();
        List<EmotionSummaryItem> summaries = createSummaries(counts);
        EmotionSummaryItem dominantEmotion = summaries.stream()
                .filter(summary -> summary.count() > 0)
                .findFirst()
                .orElse(null);
        LocalDateTime calculatedAt = snapshots.stream()
                .map(Dashboard::getCalculatedAt)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElseGet(() -> LocalDateTime.now(dashboardClock));

        return new MemberAggregation(
                new MemberMainEmotion(
                        userId,
                        totalCount,
                        dominantEmotion,
                        summaries
                ),
                calculatedAt
        );
    }

    private Map<EmotionType, Integer> createCounts(
            List<Dashboard> snapshots
    ) {
        Map<EmotionType, Integer> counts = emptyCounts();
        snapshots.stream()
                .map(Dashboard::getEmotionSummary)
                .map(this::readEmotionCounts)
                .forEach(daily -> daily.forEach((emotion, count) ->
                        counts.merge(
                                EmotionType.fromStoredValue(emotion),
                                count,
                                Integer::sum
                        )));
        return counts;
    }

    private Long findPartnerUserId(Long roomId, Long userId) {
        return coupleMemberRepository.findAllByIdRoomId(roomId)
                .stream()
                .filter(member -> member.getStatus()
                        == CoupleMemberStatus.ACTIVE)
                .map(member -> member.getId().getUserId())
                .filter(memberUserId -> !memberUserId.equals(userId))
                .findFirst()
                .orElseThrow(() -> new CustomException(
                        ErrorCode.ACTIVE_COUPLE_NOT_FOUND
                ));
    }

    private Map<String, Integer> readEmotionCounts(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(
                    json,
                    new TypeReference<Map<String, Integer>>() {
                    }
            );
        } catch (JsonProcessingException exception) {
            throw new CustomException(ErrorCode.INTERNAL_ERROR);
        }
    }

    private Map<EmotionType, Integer> emptyCounts() {
        Map<EmotionType, Integer> counts =
                new EnumMap<>(EmotionType.class);
        Arrays.stream(EmotionType.values())
                .forEach(type -> counts.put(type, 0));
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
        if (range.startDate().isAfter(LocalDate.now(dashboardClock))) {
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

    private record MemberAggregation(
            MemberMainEmotion summary,
            LocalDateTime calculatedAt
    ) {
    }
}
