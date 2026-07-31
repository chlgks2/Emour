package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.chat.repository.ChatReactionRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardCountResponse;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private DashboardRepository dashboardRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ChatReactionRepository chatReactionRepository;

    @Mock
    private ChatBookmarkRepository chatBookmarkRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    @InjectMocks
    private DashboardService dashboardService;

    // 원본 채팅 데이터의 개수를 세어 날짜별 대시보드에 저장합니다.
    @Test
    void savesDailyCounts() {
        LocalDate date = LocalDate.now();
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatMessageRepository
                .countByRoomIdAndSenderIdAndSentAtGreaterThanEqualAndSentAtLessThan(
                        1L,
                        10L,
                        start,
                        end
                )).thenReturn(5L);
        when(chatMessageRepository.countImages(
                1L,
                10L,
                start,
                end
        )).thenReturn(3L);
        when(chatReactionRepository
                .countByRoomIdAndUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        1L,
                        10L,
                        start,
                        end
                )).thenReturn(2L);
        when(chatBookmarkRepository
                .countByRoomIdAndUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        1L,
                        10L,
                        start,
                        end
                )).thenReturn(1L);
        when(dashboardRepository.findByRoomIdAndUserIdAndSummaryDate(
                1L,
                10L,
                date
        )).thenReturn(Optional.empty());
        when(dashboardRepository.save(any(Dashboard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        DashboardCountResponse response = dashboardService.getDailyCounts(
                1L,
                10L,
                date
        );

        assertThat(response.messageCount()).isEqualTo(5);
        assertThat(response.imageCount()).isEqualTo(3);
        assertThat(response.reactionCount()).isEqualTo(2);
        assertThat(response.bookmarkCount()).isEqualTo(1);
        assertThat(response.calculatedAt()).isNotNull();
    }
}
