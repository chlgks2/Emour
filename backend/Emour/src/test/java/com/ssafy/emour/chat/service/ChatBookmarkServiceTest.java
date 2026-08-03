package com.ssafy.emour.chat.service;

import com.ssafy.emour.chat.dto.ChatBookmarkListResponse;
import com.ssafy.emour.chat.repository.ChatBookmarkRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardPeriod;
import com.ssafy.emour.dashboard.event.DashboardChangePublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatBookmarkServiceTest {

    @Mock
    private ChatBookmarkRepository chatBookmarkRepository;
    @Mock
    private CoupleMemberRepository coupleMemberRepository;
    @Mock
    private ChatMessageService chatMessageService;
    @Mock
    private DashboardChangePublisher dashboardChangePublisher;

    // 월 조회는 해당 월에 전송된 메시지의 북마크만 검색합니다.
    @Test
    void filtersBookmarksByMonth() {
        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatBookmarkRepository.findPeriodBookmarks(
                eq(1L),
                eq(10L),
                eq(LocalDate.of(2026, 7, 1).atStartOfDay()),
                eq(LocalDate.of(2026, 8, 1).atStartOfDay()),
                any(Pageable.class)
        )).thenReturn(List.of());
        ChatBookmarkService service = new ChatBookmarkService(
                chatBookmarkRepository,
                coupleMemberRepository,
                chatMessageService,
                dashboardChangePublisher
        );

        ChatBookmarkListResponse response = service.getBookmarks(
                1L,
                10L,
                null,
                20,
                DashboardPeriod.MONTH,
                LocalDate.of(2026, 7, 15)
        );

        assertThat(response.bookmarks()).isEmpty();
        verify(chatBookmarkRepository).findPeriodBookmarks(
                eq(1L),
                eq(10L),
                eq(LocalDate.of(2026, 7, 1).atStartOfDay()),
                eq(LocalDate.of(2026, 8, 1).atStartOfDay()),
                any(Pageable.class)
        );
    }
}
