package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardWordServiceTest {

    @Mock
    private DashboardSnapshotRangeService snapshotRangeService;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardWordService dashboardWordService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-08-03T03:00:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        dashboardWordService = new DashboardWordService(
                snapshotRangeService,
                coupleMemberRepository,
                clock
        );
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }

    @Test
    void returnsDailyFrequentWords() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        CoupleDashboard dashboard = snapshot(
                date,
                """
                [
                  {"word":"사랑해","count":2},
                  {"word":"오늘도","count":2},
                  {"word":"좋아","count":1}
                ]
                """
        );
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).thenReturn(List.of(dashboard));

        DashboardFrequentWordsResponse response =
                dashboardWordService.getFrequentWords(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date,
                        2
                );

        assertThat(response.totalWordCount()).isEqualTo(5);
        assertThat(response.words()).hasSize(2);
    }

    @Test
    void mergesYearlyDailyWords() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        CoupleDashboard first = snapshot(
                start,
                "[{\"word\":\"사랑해\",\"count\":2}]"
        );
        CoupleDashboard second = snapshot(
                start.plusDays(1),
                "[{\"word\":\"사랑해\",\"count\":1},"
                        + "{\"word\":\"좋아\",\"count\":2}]"
        );
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                start,
                LocalDate.of(2027, 1, 1)
        )).thenReturn(List.of(first, second));

        DashboardFrequentWordsResponse response =
                dashboardWordService.getFrequentWords(
                        1L,
                        10L,
                        DashboardPeriod.YEAR,
                        LocalDate.of(2026, 7, 15),
                        10
                );

        assertThat(response.words().get(0).word()).isEqualTo("사랑해");
        assertThat(response.words().get(0).count()).isEqualTo(3);
        assertThat(response.totalWordCount()).isEqualTo(5);
    }

    private CoupleDashboard snapshot(LocalDate date, String words) {
        CoupleDashboard dashboard = CoupleDashboard.create(1L, date);
        dashboard.updateFrequentWords(words);
        return dashboard;
    }
}
