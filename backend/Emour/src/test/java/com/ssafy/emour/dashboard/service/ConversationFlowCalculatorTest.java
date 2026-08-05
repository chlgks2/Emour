package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.entity.ChatMessage;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ConversationFlowCalculatorTest {

    private final ConversationFlowCalculator calculator =
            new ConversationFlowCalculator();

    // 커플 전체 메시지에서 시간대, 응답 시간, 날짜별 개수를 함께 계산합니다.
    @Test
    void calculatesCoupleFlow() {
        LocalDate date = LocalDate.of(2026, 7, 31);
        List<ChatMessage> messages = List.of(
                message(10L, date.atTime(9, 0)),
                message(10L, date.atTime(9, 1)),
                message(20L, date.atTime(9, 3)),
                message(10L, date.atTime(10, 3))
        );

        ConversationFlowCalculator.ConversationMetrics result =
                calculator.calculate(messages, date, date);

        assertThat(result.totalMessageCount()).isEqualTo(4);
        assertThat(result.busiestHour()).isEqualTo(9);
        assertThat(result.averageResponseSeconds())
                .isEqualByComparingTo(new BigDecimal("1860.00"));
        assertThat(result.dailyFrequency()).hasSize(1);
        assertThat(result.dailyFrequency().get(0).messageCount())
                .isEqualTo(4);
    }

    // 메시지가 없는 날짜도 그래프에서 빠지지 않도록 0개로 반환합니다.
    @Test
    void includesEmptyDates() {
        LocalDate start = LocalDate.of(2026, 7, 30);
        LocalDate end = LocalDate.of(2026, 7, 31);

        ConversationFlowCalculator.ConversationMetrics result =
                calculator.calculate(List.of(), start, end);

        assertThat(result.busiestHour()).isNull();
        assertThat(result.averageResponseSeconds()).isNull();
        assertThat(result.dailyFrequency())
                .extracting(item -> item.messageCount())
                .containsExactly(0, 0);
    }

    private ChatMessage message(
            Long senderId,
            LocalDateTime sentAt
    ) {
        ChatMessage message = mock(ChatMessage.class);
        when(message.getSenderId()).thenReturn(senderId);
        when(message.getSentAt()).thenReturn(sentAt);
        return message;
    }
}
