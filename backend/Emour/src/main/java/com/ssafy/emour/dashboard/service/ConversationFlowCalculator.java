package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.entity.ChatMessage;
import com.ssafy.emour.dashboard.dto.ConversationFrequencyItem;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Arrays;

@Component
public class ConversationFlowCalculator {

    public ConversationMetrics calculate(
            List<ChatMessage> messages,
            LocalDate startDate,
            LocalDate endDate
    ) {
        int[] hourlyCounts = new int[24];
        Map<LocalDate, Integer> dailyCounts = createDailyCounts(
                startDate,
                endDate
        );
        long responseMillis = 0L;
        int responseCount = 0;

        ChatMessage previous = null;
        for (ChatMessage message : messages) {
            hourlyCounts[message.getSentAt().getHour()]++;
            dailyCounts.computeIfPresent(
                    message.getSentAt().toLocalDate(),
                    (date, count) -> count + 1
            );

            // 같은 사람이 연속으로 보낸 메시지는 응답 시간 계산에서 제외합니다.
            if (previous != null
                    && !previous.getSenderId().equals(message.getSenderId())) {
                long duration = Duration.between(
                        previous.getSentAt(),
                        message.getSentAt()
                ).toMillis();
                if (duration >= 0) {
                    responseMillis += duration;
                    responseCount++;
                }
            }
            previous = message;
        }

        List<ConversationFrequencyItem> frequency = dailyCounts.entrySet()
                .stream()
                .map(entry -> new ConversationFrequencyItem(
                        entry.getKey(),
                        entry.getValue()
                ))
                .toList();

        return new ConversationMetrics(
                messages.size(),
                findBusiestHour(hourlyCounts),
                calculateAverageSeconds(responseMillis, responseCount),
                frequency,
                Arrays.stream(hourlyCounts).boxed().toList(),
                responseMillis,
                responseCount,
                messages.isEmpty() ? null : messages.get(0).getSenderId(),
                messages.isEmpty() ? null : messages.get(0).getSentAt(),
                messages.isEmpty()
                        ? null
                        : messages.get(messages.size() - 1).getSenderId(),
                messages.isEmpty()
                        ? null
                        : messages.get(messages.size() - 1).getSentAt()
        );
    }

    private Map<LocalDate, Integer> createDailyCounts(
            LocalDate startDate,
            LocalDate endDate
    ) {
        Map<LocalDate, Integer> counts = new LinkedHashMap<>();
        LocalDate date = startDate;
        while (!date.isAfter(endDate)) {
            counts.put(date, 0);
            date = date.plusDays(1);
        }
        return counts;
    }

    private Integer findBusiestHour(int[] hourlyCounts) {
        int busiestHour = 0;
        for (int hour = 1; hour < hourlyCounts.length; hour++) {
            if (hourlyCounts[hour] > hourlyCounts[busiestHour]) {
                busiestHour = hour;
            }
        }
        return hourlyCounts[busiestHour] == 0 ? null : busiestHour;
    }

    private BigDecimal calculateAverageSeconds(
            long responseMillis,
            int responseCount
    ) {
        if (responseCount == 0) {
            return null;
        }
        return BigDecimal.valueOf(responseMillis)
                .divide(
                        BigDecimal.valueOf(responseCount * 1000L),
                        2,
                        RoundingMode.HALF_UP
                );
    }

    public record ConversationMetrics(
            int totalMessageCount,
            Integer busiestHour,
            BigDecimal averageResponseSeconds,
            List<ConversationFrequencyItem> dailyFrequency,
            List<Integer> hourlyMessageCounts,
            long responseTimeTotalMillis,
            int responseCount,
            Long firstSenderId,
            LocalDateTime firstSentAt,
            Long lastSenderId,
            LocalDateTime lastSentAt
    ) {
    }
}
