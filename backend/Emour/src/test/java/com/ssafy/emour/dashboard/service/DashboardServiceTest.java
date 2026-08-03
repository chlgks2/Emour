package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private CoupleDashboardSnapshotService coupleDashboardSnapshotService;
    @Mock
    private DashboardSnapshotService memberDashboardSnapshotService;
    @Mock
    private ChatMessageRepository chatMessageRepository;
    @Mock
    private ChatReactionRepository chatReactionRepository;
    @Mock
    private ChatBookmarkRepository chatBookmarkRepository;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-08-03T03:00:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        dashboardService = new DashboardService(
                coupleDashboardSnapshotService,
                memberDashboardSnapshotService,
                chatMessageRepository,
                chatReactionRepository,
                chatBookmarkRepository,
                coupleMemberRepository,
                clock
        );
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }

    // 일 조회는 저장된 커플 합계 스냅샷을 반환합니다.
    @Test
    void returnsDailyCounts() {
        LocalDate date = LocalDate.of(2026, 8, 3);
        CoupleDashboard dashboard = CoupleDashboard.create(1L, date);
        dashboard.updateCounts(5, 3, 2);
        when(coupleDashboardSnapshotService.ensureSnapshot(1L, 10L, date))
                .thenReturn(dashboard);

        DashboardCountResponse response = dashboardService.getCounts(
                1L,
                10L,
                DashboardPeriod.DAY,
                date
        );

        assertThat(response.period()).isEqualTo(DashboardPeriod.DAY);
        assertThat(response.messageCount()).isEqualTo(5);
        assertThat(response.imageCount()).isEqualTo(3);
        assertThat(response.reactionCount()).isEqualTo(2);
    }

    // 월 조회는 방에 속한 두 사람의 기록을 기간 전체에서 합산합니다.
    @Test
    void returnsMonthlyCoupleCounts() {
        LocalDate date = LocalDate.of(2026, 7, 15);
        when(chatMessageRepository
                .countByRoomIdAndSentAtGreaterThanEqualAndSentAtLessThan(
                        1L,
                        LocalDate.of(2026, 7, 1).atStartOfDay(),
                        LocalDate.of(2026, 8, 1).atStartOfDay()
                )).thenReturn(50L);
        when(chatMessageRepository.countRoomImages(
                1L,
                LocalDate.of(2026, 7, 1).atStartOfDay(),
                LocalDate.of(2026, 8, 1).atStartOfDay()
        )).thenReturn(8L);
        when(chatReactionRepository
                .countByRoomIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        1L,
                        LocalDate.of(2026, 7, 1).atStartOfDay(),
                        LocalDate.of(2026, 8, 1).atStartOfDay()
                )).thenReturn(6L);
        DashboardCountResponse response = dashboardService.getCounts(
                1L,
                10L,
                DashboardPeriod.MONTH,
                date
        );

        assertThat(response.startDate())
                .isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(response.endDate())
                .isEqualTo(LocalDate.of(2026, 7, 31));
        assertThat(response.messageCount()).isEqualTo(50);
        assertThat(response.imageCount()).isEqualTo(8);
        assertThat(response.reactionCount()).isEqualTo(6);
    }
}
