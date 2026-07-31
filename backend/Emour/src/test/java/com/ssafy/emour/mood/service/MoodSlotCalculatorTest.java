package com.ssafy.emour.mood.service;

import com.ssafy.emour.mood.entity.MoodNotification;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class MoodSlotCalculatorTest {

    private final MoodSlotCalculator calculator = new MoodSlotCalculator();

    @Test
    void 현재_시각이_속한_알림_시간대를_계산한다() {
        MoodNotification notification = notification();

        assertThat(calculator.currentSlot(
                notification,
                LocalDateTime.of(2026, 7, 31, 14, 25)
        )).contains(LocalDateTime.of(2026, 7, 31, 12, 0));
    }

    @Test
    void 알림_범위_밖에는_현재_시간대가_없다() {
        MoodNotification notification = notification();

        assertThat(calculator.currentSlot(
                notification,
                LocalDateTime.of(2026, 7, 31, 22, 0)
        )).isEmpty();
    }

    @Test
    void 다음_알림_시각에_종료된_시간대를_계산한다() {
        MoodNotification notification = notification();

        assertThat(calculator.slotEndingAt(
                notification,
                LocalDateTime.of(2026, 7, 31, 15, 0)
        )).contains(LocalDateTime.of(2026, 7, 31, 12, 0));
    }

    private MoodNotification notification() {
        return MoodNotification.create(
                10L,
                LocalTime.of(9, 0),
                LocalTime.of(21, 0),
                3
        );
    }
}
