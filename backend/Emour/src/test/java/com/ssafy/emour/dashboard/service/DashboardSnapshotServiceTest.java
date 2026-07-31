package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatAnalysisRepository;
import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardSnapshotServiceTest {

    @Mock
    private DashboardRepository dashboardRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ChatReactionRepository chatReactionRepository;

    @Mock
    private ChatBookmarkRepository chatBookmarkRepository;

    @Mock
    private ChatAnalysisRepository chatAnalysisRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    // 같은 정각 구간이 이미 집계됐다면 원본 데이터를 다시 계산하지 않습니다.
    @Test
    void reusesHourlySnapshot() {
        LocalDate date = LocalDate.of(2026, 7, 31);
        LocalDateTime boundary = date.atTime(13, 0);
        Dashboard dashboard = snapshot(date, boundary, false);
        DashboardSnapshotService service = serviceAt(
                "2026-07-31T04:02:00Z"
        );

        allowMember();
        when(dashboardRepository.findByRoomIdAndUserIdAndSummaryDate(
                1L,
                10L,
                date
        )).thenReturn(Optional.of(dashboard));

        Dashboard result = service.ensureSnapshot(1L, 10L, date);

        assertThat(result.getAggregatedUntil()).isEqualTo(boundary);
        assertThat(result.getFinalizedUntil()).isNull();
        verify(chatMessageRepository, never())
                .findDailyTextContents(any(), any(), any(), any());
    }

    // 다음 시간 5분 이후에는 같은 종료 시각으로 다시 계산하고 최종 확정합니다.
    @Test
    void finalizesAfterFiveMinutes() {
        LocalDate date = LocalDate.of(2026, 7, 31);
        LocalDateTime boundary = date.atTime(13, 0);
        Dashboard dashboard = snapshot(date, boundary, false);
        DashboardSnapshotService service = serviceAt(
                "2026-07-31T04:06:00Z"
        );

        allowMember();
        when(dashboardRepository.findByRoomIdAndUserIdAndSummaryDate(
                1L,
                10L,
                date
        )).thenReturn(Optional.of(dashboard));
        when(chatAnalysisRepository.findCompletedDailyAnalyses(
                1L,
                10L,
                date.atStartOfDay(),
                boundary
        )).thenReturn(List.of());
        when(chatMessageRepository.findDailyTextContents(
                1L,
                10L,
                date.atStartOfDay(),
                boundary
        )).thenReturn(List.of());
        when(dashboardRepository.save(any(Dashboard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Dashboard result = service.ensureSnapshot(1L, 10L, date);

        assertThat(result.getAggregatedUntil()).isEqualTo(boundary);
        assertThat(result.getFinalizedUntil()).isEqualTo(boundary);
        verify(chatMessageRepository)
                .countByRoomIdAndSenderIdAndSentAtGreaterThanEqualAndSentAtLessThan(
                        1L,
                        10L,
                        date.atStartOfDay(),
                        boundary
                );
    }

    private DashboardSnapshotService serviceAt(String instant) {
        Clock clock = Clock.fixed(
                Instant.parse(instant),
                ZoneId.of("Asia/Seoul")
        );
        return new DashboardSnapshotService(
                dashboardRepository,
                chatMessageRepository,
                chatReactionRepository,
                chatBookmarkRepository,
                chatAnalysisRepository,
                coupleMemberRepository,
                clock
        );
    }

    private Dashboard snapshot(
            LocalDate date,
            LocalDateTime boundary,
            boolean finalized
    ) {
        Dashboard dashboard = Dashboard.create(1L, 10L, date);
        dashboard.applyHourlySnapshot(
                0,
                0,
                0,
                0,
                "{}",
                "[]",
                "[]",
                boundary,
                finalized,
                boundary
        );
        return dashboard;
    }

    private void allowMember() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
    }
}
