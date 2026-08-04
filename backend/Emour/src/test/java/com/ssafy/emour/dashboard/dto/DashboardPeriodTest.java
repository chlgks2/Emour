package com.ssafy.emour.dashboard.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DashboardPeriodTest {

    @Test
    void calculatesWeekFromSundayToSaturday() {
        LocalDate selectedDate = LocalDate.of(2026, 8, 4);

        LocalDate startDate = DashboardPeriod.WEEK.startDate(selectedDate);
        LocalDate endExclusive = DashboardPeriod.WEEK.endExclusive(startDate);

        assertThat(startDate).isEqualTo(LocalDate.of(2026, 8, 2));
        assertThat(endExclusive).isEqualTo(LocalDate.of(2026, 8, 9));
        assertThat(endExclusive.minusDays(1))
                .isEqualTo(LocalDate.of(2026, 8, 8));
    }

    @Test
    void keepsSundayAsWeekStart() {
        LocalDate sunday = LocalDate.of(2026, 8, 2);

        assertThat(DashboardPeriod.WEEK.startDate(sunday))
                .isEqualTo(sunday);
    }
}
