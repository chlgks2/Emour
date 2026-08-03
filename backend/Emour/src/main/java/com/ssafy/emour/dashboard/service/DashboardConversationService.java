package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardConversationFlowResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.global.exception.CustomException;
import com.ssafy.emour.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardConversationService {

    private final ChatMessageRepository chatMessageRepository;
    private final CoupleMemberRepository coupleMemberRepository;
    // 기존 생성자 호환성을 유지하며, 조회는 원본 데이터 직접 집계를 사용한다.
    private final ConversationFlowCalculator conversationFlowCalculator;
    private final Clock dashboardClock;

    @Transactional
    public DashboardConversationFlowResponse getConversationFlow(
            Long roomId,
            Long userId,
            DashboardPeriod period,
            LocalDate date
    ) {
        validateRequest(roomId, userId, period, date);
        DateRange range = createRange(period, date);

        List<ChatMessage> messages =
                chatMessageRepository.findConversationMessages(
                        roomId,
                        range.startDate().atStartOfDay(),
                        range.endExclusive().atStartOfDay()
                );
        ConversationFlowCalculator.ConversationMetrics metrics =
                conversationFlowCalculator.calculate(
                        messages,
                        range.startDate(),
                        range.endExclusive().minusDays(1)
                );
        return new DashboardConversationFlowResponse(
                roomId,
                period,
                range.startDate(),
                range.endExclusive().minusDays(1),
                metrics.totalMessageCount(),
                metrics.busiestHour(),
                metrics.averageResponseSeconds(),
                metrics.dailyFrequency(),
                LocalDateTime.now(dashboardClock)
        );
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
}
