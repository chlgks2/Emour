package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardMainEmotionResponse;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.entity.CoupleDashboard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardMainEmotionServiceTest {

    @Mock
    private DashboardSnapshotRangeService snapshotRangeService;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardMainEmotionService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-07-31T03:30:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        service = new DashboardMainEmotionService(
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
    void mergesDailyEmotionCounts() {
        LocalDate date = LocalDate.of(2026, 7, 31);
        CoupleDashboard dashboard = CoupleDashboard.create(1L, date);
        ReflectionTestUtils.setField(
                dashboard,
                "emotionSummary",
                "{\"JOY\":2,\"SADNESS\":1,\"NEUTRAL\":1}"
        );
        when(snapshotRangeService.getCoupleSnapshots(
                1L,
                10L,
                date,
                date.plusDays(1)
        )).thenReturn(List.of(dashboard));

        DashboardMainEmotionResponse response = service.getMainEmotions(
                1L,
                10L,
                DashboardPeriod.DAY,
                date
        );

        assertThat(response.analyzedMessageCount()).isEqualTo(4);
        assertThat(response.dominantEmotion().emotionType())
                .isEqualTo("JOY");
        assertThat(response.dominantEmotion().count()).isEqualTo(2);
    }
}
