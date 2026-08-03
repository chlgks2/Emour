package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.entity.Dashboard;
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
    private DashboardSnapshotService dashboardSnapshotService;
    @Mock
    private ChatMessageRepository chatMessageRepository;
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
                dashboardSnapshotService,
                chatMessageRepository,
                coupleMemberRepository,
                clock
        );
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }

    // 일 조회는 저장된 단어 중 요청한 개수만 반환합니다.
    @Test
    void returnsDailyFrequentWords() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        Dashboard dashboard = Dashboard.create(1L, 10L, date);
        dashboard.updateFrequentWords("""
                [
                  {"word": "사랑해", "count": 2},
                  {"word": "오늘도", "count": 2},
                  {"word": "좋아", "count": 1}
                ]
                """);
        when(dashboardSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(dashboard);

        DashboardFrequentWordsResponse response =
                dashboardWordService.getFrequentWords(
                        1L,
                        10L,
                        DashboardPeriod.DAY,
                        date,
                        2
                );

        assertThat(response.totalWordCount()).isEqualTo(5);
        assertThat(response.distinctWordCount()).isEqualTo(3);
        assertThat(response.words()).hasSize(2);
        assertThat(response.words().get(0).word()).isEqualTo("사랑해");
    }

    // 연 조회는 해당 연도의 모든 텍스트를 합산합니다.
    @Test
    void returnsYearlyFrequentWords() {
        when(chatMessageRepository.findDailyTextContents(
                1L,
                10L,
                LocalDate.of(2026, 1, 1).atStartOfDay(),
                LocalDate.of(2027, 1, 1).atStartOfDay()
        )).thenReturn(List.of(
                "사랑해 오늘도",
                "사랑해 좋아"
        ));

        DashboardFrequentWordsResponse response =
                dashboardWordService.getFrequentWords(
                        1L,
                        10L,
                        DashboardPeriod.YEAR,
                        LocalDate.of(2026, 7, 15),
                        10
                );

        assertThat(response.startDate())
                .isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(response.endDate())
                .isEqualTo(LocalDate.of(2026, 12, 31));
        assertThat(response.totalWordCount()).isEqualTo(4);
        assertThat(response.words().get(0).word()).isEqualTo("사랑해");
        assertThat(response.words().get(0).count()).isEqualTo(2);
    }
}
