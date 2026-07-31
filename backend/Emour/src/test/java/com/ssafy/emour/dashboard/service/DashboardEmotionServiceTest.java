package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.dashboard.dto.DashboardEmotionFlowResponse;
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
class DashboardEmotionServiceTest {

    @Mock
    private DashboardSnapshotService dashboardSnapshotService;

    @InjectMocks
    private DashboardEmotionService dashboardEmotionService;

    // 저장된 2시간 단위 감정 흐름 JSON을 응답으로 변환합니다.
    @Test
    void returnsEmotionFlow() {
        LocalDate date = LocalDate.now();
        Dashboard dashboard = Dashboard.create(1L, 10L, date);
        dashboard.updateEmotionFlow("""
                [
                  {
                    "startHour": 0,
                    "endHour": 2,
                    "positiveCount": 1,
                    "negativeCount": 1,
                    "neutralCount": 1
                  }
                ]
                """);
        when(dashboardSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(dashboard);

        DashboardEmotionFlowResponse response =
                dashboardEmotionService.getDailyEmotionFlow(
                        1L,
                        10L,
                        date
                );

        assertThat(response.analyzedMessageCount()).isEqualTo(3);
        assertThat(response.flow()).hasSize(1);
        assertThat(response.flow().get(0).positiveCount()).isEqualTo(1);
        assertThat(response.flow().get(0).negativeCount()).isEqualTo(1);
        assertThat(response.flow().get(0).neutralCount()).isEqualTo(1);
    }
}
