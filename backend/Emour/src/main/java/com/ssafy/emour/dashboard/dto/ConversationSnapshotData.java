package com.ssafy.emour.dashboard.dto;

import com.ssafy.emour.dashboard.service.ConversationFlowCalculator;

import java.util.List;
import java.time.LocalDateTime;

/** 월·연 집계에서 일간 대화 지표를 정확히 합치기 위한 저장 형식입니다. */
public record ConversationSnapshotData(
        int version,
        List<Integer> hourlyMessageCounts,
        long responseTimeTotalMillis,
        int responseCount,
        List<ConversationFrequencyItem> dailyFrequency,
        Long firstSenderId,
        LocalDateTime firstSentAt,
        Long lastSenderId,
        LocalDateTime lastSentAt
) {
    public static final int CURRENT_VERSION = 2;

    public static ConversationSnapshotData from(
            ConversationFlowCalculator.ConversationMetrics metrics
    ) {
        return new ConversationSnapshotData(
                CURRENT_VERSION,
                metrics.hourlyMessageCounts(),
                metrics.responseTimeTotalMillis(),
                metrics.responseCount(),
                metrics.dailyFrequency(),
                metrics.firstSenderId(),
                metrics.firstSentAt(),
                metrics.lastSenderId(),
                metrics.lastSentAt()
        );
    }
}
