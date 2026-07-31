package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
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
class DashboardServiceTest {

    @Mock
    private DashboardSnapshotService dashboardSnapshotService;

    @InjectMocks
    private DashboardService dashboardService;

    // 시간별 스냅샷에 저장된 정량 데이터를 반환합니다.
    @Test
    void returnsDailyCounts() {
        LocalDate date = LocalDate.now();
        Dashboard dashboard = Dashboard.create(1L, 10L, date);
        dashboard.updateCounts(5, 3, 2, 1);
        when(dashboardSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(dashboard);

        DashboardCountResponse response = dashboardService.getDailyCounts(
                1L,
                10L,
                date
        );

        assertThat(response.messageCount()).isEqualTo(5);
        assertThat(response.imageCount()).isEqualTo(3);
        assertThat(response.reactionCount()).isEqualTo(2);
        assertThat(response.bookmarkCount()).isEqualTo(1);
    }
}
