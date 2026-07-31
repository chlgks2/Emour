package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.entity.Dashboard;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardWordServiceTest {

    @Mock
    private DashboardSnapshotService dashboardSnapshotService;

    @InjectMocks
    private DashboardWordService dashboardWordService;

    // 저장된 전체 단어에서 요청한 개수만 잘라 반환합니다.
    @Test
    void returnsFrequentWords() {
        LocalDate date = LocalDate.now();
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
                dashboardWordService.getDailyFrequentWords(
                        1L,
                        10L,
                        date,
                        2
                );

        assertThat(response.totalWordCount()).isEqualTo(5);
        assertThat(response.distinctWordCount()).isEqualTo(3);
        assertThat(response.words()).hasSize(2);
        assertThat(response.words().get(0).word()).isEqualTo("사랑해");
    }
}
