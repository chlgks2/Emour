package com.ssafy.emour.dashboard.service;

import com.ssafy.emour.chat.repository.ChatMessageRepository;
import com.ssafy.emour.couple.entity.CoupleMemberId;
import com.ssafy.emour.couple.entity.CoupleMemberStatus;
import com.ssafy.emour.couple.repository.CoupleMemberRepository;
import com.ssafy.emour.dashboard.dto.DashboardFrequentWordsResponse;
import com.ssafy.emour.dashboard.entity.Dashboard;
import com.ssafy.emour.dashboard.repository.DashboardRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardWordServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private DashboardRepository dashboardRepository;

    @Mock
    private CoupleMemberRepository coupleMemberRepository;

    private DashboardWordService dashboardWordService;

    @BeforeEach
    void setUp() {
        dashboardWordService = new DashboardWordService(
                chatMessageRepository,
                dashboardRepository,
                coupleMemberRepository
        );
    }

    // 문장부호를 제거하고 같은 단어의 사용 횟수를 합칩니다.
    @Test
    void countsFrequentWords() {
        LocalDate date = LocalDate.now();

        when(coupleMemberRepository.existsByIdAndStatus(
                new CoupleMemberId(10L, 1L),
                CoupleMemberStatus.ACTIVE
        )).thenReturn(true);
        when(chatMessageRepository.findDailyTextContents(
                1L,
                10L,
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay()
        )).thenReturn(List.of(
                "사랑해, 오늘도 사랑해!",
                "오늘도 정말 좋아"
        ));
        when(dashboardRepository.findByRoomIdAndUserIdAndSummaryDate(
                1L,
                10L,
                date
        )).thenReturn(Optional.empty());
        when(dashboardRepository.save(any(Dashboard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        DashboardFrequentWordsResponse response =
                dashboardWordService.getDailyFrequentWords(
                        1L,
                        10L,
                        date,
                        3
                );

        assertThat(response.totalWordCount()).isEqualTo(6);
        assertThat(response.distinctWordCount()).isEqualTo(4);
        assertThat(response.words()).hasSize(3);
        assertThat(response.words().get(0).word()).isEqualTo("사랑해");
        assertThat(response.words().get(0).count()).isEqualTo(2);
        assertThat(response.words().get(1).word()).isEqualTo("오늘도");
        assertThat(response.words().get(1).count()).isEqualTo(2);
    }
}
